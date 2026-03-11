import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { tmdbRequest, getMovieDetails } from "../utils/tmdb.js";

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

  // Get user's top-rated movies (4+ stars) — use multiple seeds
  const { rows: topRated } = await pool.query(
    `SELECT tmdb_id, rating FROM ratings WHERE user_id = $1 AND rating >= 4 ORDER BY rating DESC, updated_at DESC LIMIT 5`,
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

  // Enrich friend recs with movie metadata
  const enrichedFriendRecs = await Promise.all(
    friendRecs.map(async (r) => {
      try {
        const movie = await getMovieDetails(r.tmdb_id);
        return {
          ...r,
          movie_title: movie?.title || null,
          poster_url: movie?.poster_url || null
        };
      } catch {
        return r;
      }
    })
  );

  // Build set of already-rated tmdb_ids
  const { rows: rated } = await pool.query(
    `SELECT tmdb_id FROM ratings WHERE user_id = $1`,
    [userId]
  );
  const ratedSet = new Set(rated.map((r) => r.tmdb_id));

  // Collect similar movies from multiple seed movies (top 3)
  let similarMovies = [];
  const seeds = topRated.slice(0, 3);
  for (const seed of seeds) {
    const data = await tmdbRequest(`/movie/${seed.tmdb_id}/similar`);
    if (data?.results) {
      const filtered = data.results
        .filter((m) => m.poster_path && !ratedSet.has(m.id))
        .slice(0, 5)
        .map(withPoster);
      similarMovies.push(...filtered);
    }
  }

  // Deduplicate similar movies
  const seenIds = new Set();
  similarMovies = similarMovies.filter((m) => {
    if (seenIds.has(m.id)) return false;
    seenIds.add(m.id);
    return true;
  }).slice(0, 10);

  // Genre-based recommendations: find user's top genres from their rated movies
  let genreRecommendations = [];
  if (topRated.length > 0) {
    // Get genre IDs from top-rated movies
    const genreCounts = {};
    for (const seed of seeds) {
      try {
        const movie = await getMovieDetails(seed.tmdb_id);
        if (movie?.genres) {
          for (const g of movie.genres) {
            genreCounts[g.id] = (genreCounts[g.id] || 0) + 1;
          }
        }
      } catch { /* skip */ }
    }

    // Sort genres by frequency, take top 3
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);

    if (topGenres.length > 0) {
      const data = await tmdbRequest("/discover/movie", {
        with_genres: topGenres.join(","),
        sort_by: "vote_average.desc",
        "vote_count.gte": 100,
        page: 1
      });

      if (data?.results) {
        genreRecommendations = data.results
          .filter((m) => m.poster_path && !ratedSet.has(m.id) && !seenIds.has(m.id))
          .slice(0, 10)
          .map(withPoster);
      }
    }
  }

  // Get seed movie title for "Because you liked..." text
  let seedTitle = null;
  if (seeds.length > 0) {
    try {
      const seedMovie = await getMovieDetails(seeds[0].tmdb_id);
      seedTitle = seedMovie?.title || null;
    } catch { /* skip */ }
  }

  return res.json({
    becauseYouLiked: topRated.length > 0 ? topRated[0].tmdb_id : null,
    seedTitle,
    similar: similarMovies,
    genreRecommendations,
    friendRecommendations: enrichedFriendRecs
  });
});
