import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const profileRouter = Router();

// Get public profile by username
profileRouter.get("/:username", async (req, res) => {
  const { username } = req.params;

  const { rows: userRows } = await pool.query(
    `SELECT id, username, profile_photo, bio, favorite_genres, created_at FROM users WHERE username = $1`,
    [username]
  );
  if (!userRows.length) {
    return res.status(404).json({ error: "User not found" });
  }

  const user = userRows[0];

  const [ratingsRes, watchedRes, watchlistRes, reviewsRes, friendsRes] = await Promise.all([
    pool.query(
      `SELECT tmdb_id, rating, review, watched, watchlist, updated_at
       FROM ratings WHERE user_id = $1 ORDER BY updated_at DESC`,
      [user.id]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM ratings WHERE user_id = $1 AND watched = TRUE`,
      [user.id]
    ),
    pool.query(
      `SELECT tmdb_id, updated_at FROM ratings WHERE user_id = $1 AND watchlist = TRUE ORDER BY updated_at DESC`,
      [user.id]
    ),
    pool.query(
      `SELECT tmdb_id, rating, review, updated_at FROM ratings
       WHERE user_id = $1 AND review IS NOT NULL AND review != ''
       ORDER BY updated_at DESC`,
      [user.id]
    ),
    pool.query(
      `SELECT COALESCE(CARDINALITY(friends), 0)::int AS count FROM users WHERE id = $1`,
      [user.id]
    )
  ]);

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      profilePhoto: user.profile_photo,
      bio: user.bio || "",
      favoriteGenres: user.favorite_genres || [],
      createdAt: user.created_at
    },
    ratings: ratingsRes.rows,
    totalWatched: watchedRes.rows[0].count,
    watchlist: watchlistRes.rows,
    reviews: reviewsRes.rows,
    totalFriends: friendsRes.rows[0].count
  });
});

// Update own profile (bio, photo, genres)
profileRouter.put("/me/update", requireAuth, async (req, res) => {
  const { bio, profile_photo, favorite_genres } = req.body;

  const { rows } = await pool.query(
    `UPDATE users SET
       bio = COALESCE($1, bio),
       profile_photo = COALESCE($2, profile_photo),
       favorite_genres = COALESCE($3, favorite_genres)
     WHERE id = $4
     RETURNING id, username, email, profile_photo, bio, favorite_genres`,
    [bio, profile_photo, favorite_genres, req.user.id]
  );

  return res.json(rows[0]);
});
