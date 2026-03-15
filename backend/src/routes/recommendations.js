import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { tmdbRequest, getMovieDetails } from "../utils/tmdb.js";

export const recommendationsRouter = Router();
recommendationsRouter.use(requireAuth);

const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";
const GENRE_TO_ID = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  "Sci-Fi": 878,
  "Science Fiction": 878,
  Thriller: 53,
  War: 10752,
  Western: 37
};

function withPoster(movie) {
  return {
    ...movie,
    poster_url: movie.poster_path ? `${TMDB_IMAGE}${movie.poster_path}` : null
  };
}

// Get personalized recommendations
recommendationsRouter.get("/", async (req, res) => {
  const userId = req.user.id;

  const { rows: userRows } = await pool.query(
    `SELECT favorite_genres FROM users WHERE id = $1`,
    [userId]
  );
  const favoriteGenres = userRows[0]?.favorite_genres || [];

  // Get user's top-rated movies (4+ stars) — use multiple seeds
  const { rows: topRated } = await pool.query(
    `SELECT tmdb_id, rating FROM ratings WHERE user_id = $1 AND rating >= 4 ORDER BY rating DESC, updated_at DESC LIMIT 5`,
    [userId]
  );

  // Get what friends are watching (highly rated)
  const { rows: friendRecs } = await pool.query(
    `SELECT r.tmdb_id, r.rating, u.username
     FROM ratings r
     JOIN users me ON me.id = $1
     JOIN users u ON u.id = r.user_id
     WHERE r.user_id = ANY(COALESCE(me.friends, '{}'))
       AND r.rating >= 4
       AND r.tmdb_id NOT IN (SELECT tmdb_id FROM ratings WHERE user_id = $1)
     ORDER BY r.rating DESC, r.updated_at DESC
     LIMIT 10`,
    [userId]
  );

  // Get movies watched by friends that user has not watched/rated yet
  const { rows: friendsWatched } = await pool.query(
    `
    SELECT r.tmdb_id,
           COUNT(DISTINCT r.user_id)::int AS watched_by_friends,
           ROUND(AVG(r.rating)::numeric, 2) AS avg_friend_rating,
           ARRAY_AGG(DISTINCT u.username) AS usernames
    FROM ratings r
    JOIN users me ON me.id = $1
    JOIN users u ON u.id = r.user_id
    WHERE r.user_id = ANY(COALESCE(me.friends, '{}'))
      AND r.watched = TRUE
      AND r.tmdb_id NOT IN (
        SELECT tmdb_id FROM ratings WHERE user_id = $1 AND watched = TRUE
      )
    GROUP BY r.tmdb_id
    ORDER BY watched_by_friends DESC, avg_friend_rating DESC NULLS LAST
    LIMIT 12
    `,
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

  const enrichedFriendsWatched = await Promise.all(
    friendsWatched.map(async (row) => {
      try {
        const movie = await getMovieDetails(row.tmdb_id);
        return {
          ...row,
          movie_title: movie?.title || null,
          poster_url: movie?.poster_url || null
        };
      } catch {
        return row;
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
  if (topRated.length > 0 || favoriteGenres.length > 0) {
    // Get genre IDs from top-rated movies
    const genreCounts = {};

    for (const name of favoriteGenres) {
      const id = GENRE_TO_ID[String(name || "").trim()];
      if (id) {
        genreCounts[id] = (genreCounts[id] || 0) + 3;
      }
    }

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
    friendRecommendations: enrichedFriendRecs,
    friendsWatchedRecommendations: enrichedFriendsWatched
  });
});
