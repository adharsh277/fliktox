import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { getMovieDetails } from "../utils/tmdb.js";

export const statsRouter = Router();
statsRouter.use(requireAuth);

// Helper: ensure all 5 stars appear in distribution
function fullDistribution(rows) {
  return [1, 2, 3, 4, 5].map((star) => {
    const entry = rows.find((r) => r.rating === star);
    return { rating: star, count: entry?.count || 0 };
  });
}

// Helper: enrich ratings with movie metadata from TMDB
async function enrichWithMovieData(rows) {
  return Promise.all(
    rows.map(async (r) => {
      try {
        const movie = await getMovieDetails(r.tmdb_id);
        return {
          ...r,
          movie_title: movie?.title || null,
          poster_url: movie?.poster_url || null,
          release_year: movie?.release_date ? String(movie.release_date).slice(0, 4) : null
        };
      } catch {
        return r;
      }
    })
  );
}

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
      `SELECT ROUND(AVG(rating)::numeric, 2) AS average_rating FROM ratings WHERE user_id = $1 AND rating IS NOT NULL`,
      [userId]
    ),
    pool.query(
      `SELECT rating, COUNT(*)::int AS count FROM ratings WHERE user_id = $1 AND rating IS NOT NULL GROUP BY rating ORDER BY rating`,
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
  const ratingDistribution = fullDistribution(ratingDistRes.rows);
  const recentActivity = await enrichWithMovieData(recentRes.rows);

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
      `SELECT ROUND(AVG(rating)::numeric, 2) AS average_rating FROM ratings WHERE user_id = $1 AND rating IS NOT NULL`,
      [userId]
    ),
    pool.query(
      `SELECT rating, COUNT(*)::int AS count FROM ratings WHERE user_id = $1 AND rating IS NOT NULL GROUP BY rating ORDER BY rating`,
      [userId]
    )
  ]);

  const counts = countsRes.rows[0];

  return res.json({
    totalWatched: counts.total_watched,
    totalReviews: counts.total_reviews,
    totalEntries: counts.total_entries,
    averageRating: avgRes.rows[0]?.average_rating ? Number(avgRes.rows[0].average_rating) : 0,
    ratingDistribution: fullDistribution(ratingDistRes.rows)
  });
});
