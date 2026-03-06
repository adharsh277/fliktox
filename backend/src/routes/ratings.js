import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

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
