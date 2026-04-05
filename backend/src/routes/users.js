import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Router } from "express";
import multer from "multer";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { getMovieDetails } from "../utils/tmdb.js";

export const usersRouter = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const avatarsDir = path.resolve(__dirname, "../../uploads/avatars");
fs.mkdirSync(avatarsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "") || ".png";
      cb(null, `user-${req.user.id}-${Date.now()}${ext.toLowerCase()}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith("image/")) {
      return cb(null, true);
    }
    return cb(new Error("Only image uploads are allowed"));
  }
});

async function getUserByUsername(username) {
  const normalized = String(username || "").trim();
  const { rows } = await pool.query(
    `SELECT id, username, profile_photo, bio, favorite_genres
     FROM users
     WHERE LOWER(username) = LOWER($1)`,
    [normalized]
  );
  return rows[0] || null;
}

async function enrichMovie(tmdbId) {
  try {
    const movie = await getMovieDetails(tmdbId);
    return {
      movieId: tmdbId,
      title: movie?.title || `Movie #${tmdbId}`,
      poster: movie?.poster_url || null
    };
  } catch {
    return {
      movieId: tmdbId,
      title: `Movie #${tmdbId}`,
      poster: null
    };
  }
}

usersRouter.get("/search", requireAuth, async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) {
    return res.json([]);
  }

  const numericId = Number.parseInt(q, 10);
  const hasNumericId = Number.isInteger(numericId) && numericId > 0;

  const { rows } = await pool.query(
    `SELECT id, username, profile_photo
     FROM users
     WHERE id != $2
       AND (
         username ILIKE $1
         OR ($3::boolean = TRUE AND id = $4)
       )
     ORDER BY username ASC
     LIMIT 10`,
    [`%${q}%`, req.user.id, hasNumericId, hasNumericId ? numericId : null]
  );

  return res.json(rows);
});

usersRouter.post("/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Avatar file is required" });
  }

  const avatarPath = `/uploads/avatars/${req.file.filename}`;
  const { rows } = await pool.query(
    `UPDATE users
     SET profile_photo = $1
     WHERE id = $2
     RETURNING id, username, profile_photo`,
    [avatarPath, req.user.id]
  );

  return res.json({
    avatar: avatarPath,
    user: rows[0]
  });
});

usersRouter.put("/favorites", requireAuth, async (req, res) => {
  const { genres } = req.body || {};
  if (!Array.isArray(genres)) {
    return res.status(400).json({ error: "genres must be an array" });
  }

  const cleanedGenres = genres
    .map((genre) => String(genre || "").trim())
    .filter(Boolean)
    .slice(0, 20);

  const { rows } = await pool.query(
    `UPDATE users
     SET favorite_genres = $1
     WHERE id = $2
     RETURNING id, username, favorite_genres`,
    [cleanedGenres, req.user.id]
  );

  return res.json({
    genres: rows[0]?.favorite_genres || []
  });
});

usersRouter.get("/:username", async (req, res) => {
  const user = await getUserByUsername(req.params.username);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const [rowsRes, friendsRes] = await Promise.all([
    pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE watched = TRUE)::int AS watched,
       COUNT(*) FILTER (WHERE review IS NOT NULL AND review != '')::int AS reviews,
       COUNT(*) FILTER (WHERE watchlist = TRUE)::int AS watchlist,
       ROUND(AVG(rating)::numeric, 2) AS avg_rating
     FROM ratings
     WHERE user_id = $1`,
    [user.id]
    ),
    pool.query(
      `SELECT COALESCE(CARDINALITY(friends), 0)::int AS friends_count FROM users WHERE id = $1`,
      [user.id]
    )
  ]);

  const stats = rowsRes.rows[0] || {};
  const friendsCount = friendsRes.rows[0]?.friends_count || 0;

  return res.json({
    id: user.id,
    username: user.username,
    profilePhoto: user.profile_photo,
    bio: user.bio || "",
    favoriteGenres: user.favorite_genres || [],
    stats: {
      watched: stats.watched || 0,
      reviews: stats.reviews || 0,
      watchlist: stats.watchlist || 0,
      friends: friendsCount,
      avgRating: stats.avg_rating ? Number(stats.avg_rating) : 0
    }
  });
});

usersRouter.get("/:username/watched", async (req, res) => {
  const user = await getUserByUsername(req.params.username);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { rows } = await pool.query(
    `SELECT tmdb_id, rating, updated_at AS watched_at
     FROM ratings
     WHERE user_id = $1 AND watched = TRUE
     ORDER BY updated_at DESC`,
    [user.id]
  );

  const watched = await Promise.all(
    rows.map(async (row) => {
      const movie = await enrichMovie(row.tmdb_id);
      return {
        ...movie,
        rating: row.rating,
        watchedAt: row.watched_at
      };
    })
  );

  return res.json(watched);
});

usersRouter.get("/:username/reviews", async (req, res) => {
  const user = await getUserByUsername(req.params.username);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { rows } = await pool.query(
    `SELECT tmdb_id, rating, review, updated_at AS created_at
     FROM ratings
     WHERE user_id = $1 AND review IS NOT NULL AND review != ''
     ORDER BY updated_at DESC`,
    [user.id]
  );

  const reviews = await Promise.all(
    rows.map(async (row) => {
      const movie = await enrichMovie(row.tmdb_id);
      return {
        movieId: row.tmdb_id,
        movieTitle: movie.title,
        poster: movie.poster,
        rating: row.rating,
        review: row.review,
        createdAt: row.created_at
      };
    })
  );

  return res.json(reviews);
});

usersRouter.get("/:username/ratings", async (req, res) => {
  const user = await getUserByUsername(req.params.username);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { rows } = await pool.query(
    `SELECT tmdb_id, rating, updated_at
     FROM ratings
     WHERE user_id = $1 AND rating IS NOT NULL
     ORDER BY updated_at DESC`,
    [user.id]
  );

  const ratings = await Promise.all(
    rows.map(async (row) => {
      const movie = await enrichMovie(row.tmdb_id);
      return {
        movieId: row.tmdb_id,
        movie: movie.title,
        poster: movie.poster,
        rating: row.rating,
        updatedAt: row.updated_at
      };
    })
  );

  return res.json(ratings);
});

usersRouter.get("/:username/watchlist", async (req, res) => {
  const user = await getUserByUsername(req.params.username);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { rows } = await pool.query(
    `SELECT tmdb_id, rating, updated_at
     FROM ratings
     WHERE user_id = $1 AND watchlist = TRUE
     ORDER BY updated_at DESC`,
    [user.id]
  );

  const watchlist = await Promise.all(
    rows.map(async (row) => {
      const movie = await enrichMovie(row.tmdb_id);
      return {
        movieId: row.tmdb_id,
        title: movie.title,
        poster: movie.poster,
        rating: row.rating,
        updatedAt: row.updated_at
      };
    })
  );

  return res.json(watchlist);
});
