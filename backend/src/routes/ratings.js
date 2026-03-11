import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { getIO } from "../socket/chatSocket.js";

export const ratingsRouter = Router();

ratingsRouter.post("/movies/:tmdbId", requireAuth, async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  const { rating, review, watched = false, watchlist = false, movie_title } = req.body;

  if (!tmdbId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Valid tmdbId and rating (1-5) are required" });
  }

  const { rows } = await pool.query(
    `
    INSERT INTO ratings (user_id, tmdb_id, rating, review, watched, watchlist)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id, tmdb_id)
    DO UPDATE SET rating = EXCLUDED.rating,
                  review = EXCLUDED.review,
                  watched = EXCLUDED.watched,
                  watchlist = EXCLUDED.watchlist,
                  updated_at = NOW()
    RETURNING *
    `,
    [req.user.id, tmdbId, rating, review || null, watched, watchlist]
  );

  const ratingRow = rows[0];

  // Log activity
  await pool.query(
    `INSERT INTO activity_feed (user_id, action, tmdb_id, metadata) VALUES ($1, $2, $3, $4)`,
    [req.user.id, "rated", tmdbId, JSON.stringify({ rating, review: review || null, movie_title: movie_title || null })]
  );

  // Emit live feed event to all friends
  const io = getIO();
  if (io) {
    const { rows: friendRows } = await pool.query(
      `SELECT friend_id FROM friends WHERE user_id = $1 AND status = 'accepted'`,
      [req.user.id]
    );
    const feedItem = {
      username: req.user.username,
      tmdb_id: tmdbId,
      rating,
      review: review || null,
      updated_at: ratingRow.updated_at
    };
    for (const f of friendRows) {
      io.to(`user:${f.friend_id}`).emit("feed:newRating", feedItem);
    }
  }

  return res.json(ratingRow);
});

// ── Watchlist endpoints ──

// Add to watchlist (no rating required)
ratingsRouter.post("/watchlist/:tmdbId", requireAuth, async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  if (!tmdbId) return res.status(400).json({ error: "Valid tmdbId required" });

  const { rows } = await pool.query(
    `INSERT INTO ratings (user_id, tmdb_id, watchlist)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (user_id, tmdb_id)
     DO UPDATE SET watchlist = TRUE, updated_at = NOW()
     RETURNING *`,
    [req.user.id, tmdbId]
  );

  await pool.query(
    `INSERT INTO activity_feed (user_id, action, tmdb_id) VALUES ($1, 'watchlist_add', $2)`,
    [req.user.id, tmdbId]
  );

  return res.json(rows[0]);
});

// Remove from watchlist
ratingsRouter.delete("/watchlist/:tmdbId", requireAuth, async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);

  await pool.query(
    `UPDATE ratings SET watchlist = FALSE, updated_at = NOW()
     WHERE user_id = $1 AND tmdb_id = $2`,
    [req.user.id, tmdbId]
  );

  return res.json({ ok: true });
});

// Get user's watchlist
ratingsRouter.get("/watchlist", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT tmdb_id, rating, review, watched, updated_at
     FROM ratings
     WHERE user_id = $1 AND watchlist = TRUE
     ORDER BY updated_at DESC`,
    [req.user.id]
  );
  return res.json(rows);
});

// Mark movie as watched (no rating required)
ratingsRouter.post("/watched/:tmdbId", requireAuth, async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  if (!tmdbId) return res.status(400).json({ error: "Valid tmdbId required" });

  const { rows } = await pool.query(
    `INSERT INTO ratings (user_id, tmdb_id, watched)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (user_id, tmdb_id)
     DO UPDATE SET watched = TRUE, updated_at = NOW()
     RETURNING *`,
    [req.user.id, tmdbId]
  );

  await pool.query(
    `INSERT INTO activity_feed (user_id, action, tmdb_id) VALUES ($1, 'watched', $2)`,
    [req.user.id, tmdbId]
  );

  return res.json(rows[0]);
});

// Get current user's rating/status for a specific movie
ratingsRouter.get("/movies/:tmdbId/mine", requireAuth, async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);

  const { rows } = await pool.query(
    `SELECT rating, review, watched, watchlist, updated_at
     FROM ratings
     WHERE user_id = $1 AND tmdb_id = $2`,
    [req.user.id, tmdbId]
  );

  if (rows.length === 0) {
    return res.json(null);
  }

  return res.json(rows[0]);
});

ratingsRouter.get("/movies/:tmdbId/summary", async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);

  const { rows } = await pool.query(
    `
    SELECT ROUND(AVG(rating)::numeric, 1) AS average_rating,
           COUNT(*)::int AS total_ratings
    FROM ratings
    WHERE tmdb_id = $1
    `,
    [tmdbId]
  );

  const summary = rows[0];
  return res.json({
    averageRating: summary.average_rating ? Number(summary.average_rating) : 0,
    totalRatings: summary.total_ratings || 0
  });
});

ratingsRouter.get("/users/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  const { rows } = await pool.query(
    `
    SELECT tmdb_id, rating, review, watched, watchlist, updated_at
    FROM ratings
    WHERE user_id = $1
    ORDER BY updated_at DESC
    `,
    [userId]
  );

  return res.json(rows);
});

// Get all reviews for a movie (with user info)
ratingsRouter.get("/movies/:tmdbId/reviews", async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  const { rows } = await pool.query(
    `
    SELECT r.rating, r.review, r.updated_at,
           u.id AS user_id, u.username, u.profile_photo
    FROM ratings r
    JOIN users u ON u.id = r.user_id
    WHERE r.tmdb_id = $1 AND r.review IS NOT NULL AND r.review != ''
    ORDER BY r.updated_at DESC
    `,
    [tmdbId]
  );
  return res.json(rows);
});
