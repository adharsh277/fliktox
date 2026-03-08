import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const statsRouter = Router();
statsRouter.use(requireAuth);

// Get comprehensive stats for current user
statsRouter.get("/me", async (req, res) => {
  const userId = req.user.id;

  const [countsRes, avgRes, ratingDistRes, recentRes] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE watched = TRUE)::int AS total_watched,
         COUNT(*) FILTER (WHERE watchlist = TRUE)::int AS total_watchlist,
         COUNT(*) FILTER (WHERE review IS NOT NULL AND review != '')::int AS total_reviews,
         COUNT(*)::int AS total_entries
       FROM ratings WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT ROUND(AVG(rating)::numeric, 2) AS average_rating FROM ratings WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT rating, COUNT(*)::int AS count FROM ratings WHERE user_id = $1 GROUP BY rating ORDER BY rating`,
      [userId]
    ),
    pool.query(
      `SELECT tmdb_id, rating, review, watched, watchlist, updated_at
       FROM ratings WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 10`,
      [userId]
    )
  ]);

  const counts = countsRes.rows[0];
  const averageRating = avgRes.rows[0]?.average_rating ? Number(avgRes.rows[0].average_rating) : 0;
  const ratingDistribution = ratingDistRes.rows;
  const recentActivity = recentRes.rows;

  return res.json({
    totalWatched: counts.total_watched,
    totalWatchlist: counts.total_watchlist,
    totalReviews: counts.total_reviews,
    totalEntries: counts.total_entries,
    averageRating,
    ratingDistribution,
    recentActivity
  });
});

// Stats for any user (public)
statsRouter.get("/user/:userId", async (req, res) => {
  const userId = Number(req.params.userId);

  const [countsRes, avgRes, ratingDistRes] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE watched = TRUE)::int AS total_watched,
         COUNT(*) FILTER (WHERE review IS NOT NULL AND review != '')::int AS total_reviews,
         COUNT(*)::int AS total_entries
       FROM ratings WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT ROUND(AVG(rating)::numeric, 2) AS average_rating FROM ratings WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT rating, COUNT(*)::int AS count FROM ratings WHERE user_id = $1 GROUP BY rating ORDER BY rating`,
      [userId]
    )
  ]);

  const counts = countsRes.rows[0];

  return res.json({
    totalWatched: counts.total_watched,
    totalReviews: counts.total_reviews,
    totalEntries: counts.total_entries,
    averageRating: avgRes.rows[0]?.average_rating ? Number(avgRes.rows[0].average_rating) : 0,
    ratingDistribution: ratingDistRes.rows
  });
});
