import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { tmdbRequest } from "../utils/tmdb.js";

export const recommendationsRouter = Router();
recommendationsRouter.use(requireAuth);

const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

function withPoster(movie) {
  return {
    ...movie,
    poster_url: movie.poster_path ? `${TMDB_IMAGE}${movie.poster_path}` : null
  };
}

// Get personalized recommendations
recommendationsRouter.get("/", async (req, res) => {
  const userId = req.user.id;

  // Get user's top-rated movies (4+ stars)
  const { rows: topRated } = await pool.query(
    `SELECT tmdb_id, rating FROM ratings WHERE user_id = $1 AND rating >= 4 ORDER BY rating DESC LIMIT 5`,
    [userId]
  );

  // Get what friends are watching (highly rated)
  const { rows: friendRecs } = await pool.query(
    `SELECT r.tmdb_id, r.rating, u.username
     FROM ratings r
     JOIN friends f ON f.friend_id = r.user_id
     JOIN users u ON u.id = r.user_id
     WHERE f.user_id = $1 AND f.status = 'accepted' AND r.rating >= 4
       AND r.tmdb_id NOT IN (SELECT tmdb_id FROM ratings WHERE user_id = $1)
     ORDER BY r.rating DESC, r.updated_at DESC
     LIMIT 10`,
    [userId]
  );

  // Use TMDB similar movies for the user's top-rated movie
  let similarMovies = [];
  if (topRated.length > 0) {
    const seedId = topRated[0].tmdb_id;
    const data = await tmdbRequest(`/movie/${seedId}/similar`);
    if (data?.results) {
      // Exclude movies user already rated
      const { rows: rated } = await pool.query(
        `SELECT tmdb_id FROM ratings WHERE user_id = $1`,
        [userId]
      );
      const ratedSet = new Set(rated.map((r) => r.tmdb_id));

      similarMovies = data.results
        .filter((m) => m.poster_path && !ratedSet.has(m.id))
        .slice(0, 10)
        .map(withPoster);
    }
  }

  return res.json({
    becauseYouLiked: topRated.length > 0 ? topRated[0].tmdb_id : null,
    similar: similarMovies,
    friendRecommendations: friendRecs
  });
});
