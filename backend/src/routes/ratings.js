import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { getIO } from "../socket/chatSocket.js";

export const ratingsRouter = Router();

ratingsRouter.post("/movies/:tmdbId", requireAuth, async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  const { rating, review, watched = false, watchlist = false } = req.body;

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
