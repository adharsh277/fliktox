import { pool } from "../db/pool.js";
import { getMovieDetails } from "../utils/tmdb.js";

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_REFRESH_MINUTES = 10;

const trendingState = {
  updatedAt: null,
  windowDays: DEFAULT_WINDOW_DAYS,
  mostWatched: [],
  mostVoted: [],
  mostReviewed: []
};

function coercePositiveInt(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return fallback;
  }
  return Math.floor(num);
}

async function withMovieDetails(rows) {
  return Promise.all(
    rows.map(async (row) => {
      const tmdbId = Number(row.tmdb_id);
      let details = null;

      try {
        details = await getMovieDetails(tmdbId);
      } catch {
        details = null;
      }

      return {
        id: tmdbId,
        tmdb_id: tmdbId,
        title: details?.title || `Movie #${tmdbId}`,
        poster_url: details?.poster_url || null,
        score: Number(row.score) || 0
      };
    })
  );
}

async function aggregateByMetric({ whereClause, limit, windowDays }) {
  const { rows } = await pool.query(
    `SELECT tmdb_id, COUNT(*)::int AS score
     FROM ratings
     WHERE tmdb_id IS NOT NULL
       AND updated_at >= NOW() - ($2::int * INTERVAL '1 day')
       AND ${whereClause}
     GROUP BY tmdb_id
     ORDER BY score DESC, tmdb_id ASC
     LIMIT $1`,
    [limit, windowDays]
  );

  return withMovieDetails(rows);
}

export async function recomputeTrendingLists(options = {}) {
  const limit = coercePositiveInt(options.limit, DEFAULT_LIMIT);
  const windowDays = coercePositiveInt(options.windowDays, DEFAULT_WINDOW_DAYS);

  const [mostWatched, mostVoted, mostReviewed] = await Promise.all([
    aggregateByMetric({ whereClause: "watched = TRUE", limit, windowDays }),
    aggregateByMetric({ whereClause: "rating IS NOT NULL", limit, windowDays }),
    aggregateByMetric({ whereClause: "review IS NOT NULL AND review <> ''", limit, windowDays })
  ]);

  trendingState.updatedAt = new Date().toISOString();
  trendingState.windowDays = windowDays;
  trendingState.mostWatched = mostWatched;
  trendingState.mostVoted = mostVoted;
  trendingState.mostReviewed = mostReviewed;

  return trendingState;
}

export function getTrendingLists() {
  return trendingState;
}

export async function startTrendingRefreshLoop(options = {}) {
  const refreshMinutes = coercePositiveInt(options.refreshMinutes, DEFAULT_REFRESH_MINUTES);
  const limit = coercePositiveInt(options.limit, DEFAULT_LIMIT);
  const windowDays = coercePositiveInt(options.windowDays, DEFAULT_WINDOW_DAYS);

  const refreshOnce = async () => {
    try {
      await recomputeTrendingLists({ limit, windowDays });
    } catch (error) {
      console.error("Trending refresh failed", error);
    }
  };

  await refreshOnce();

  const timer = setInterval(refreshOnce, refreshMinutes * 60 * 1000);
  if (typeof timer.unref === "function") {
    timer.unref();
  }

  return timer;
}
