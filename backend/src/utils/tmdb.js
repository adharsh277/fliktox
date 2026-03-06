import { env } from "../config/env.js";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

const fallbackTrending = [
  "Oppenheimer",
  "Dune",
  "The Batman",
  "Interstellar",
  "Joker",
  "Inception",
  "Avengers: Endgame",
  "Parasite",
  "Fight Club",
  "The Dark Knight"
].map((title, idx) => ({
  id: 9000 + idx,
  title,
  poster_path: "",
  poster_url: "",
  overview: "",
  vote_average: 0
}));

function withPoster(movie) {
  return {
    ...movie,
    poster_url: movie.poster_path ? `${TMDB_IMAGE}${movie.poster_path}` : ""
  };
}

export async function tmdbRequest(path, params = {}) {
  if (!env.tmdbApiKey) {
    return null;
  }

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", env.tmdbApiKey);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }

  return response.json();
}

export async function getTrendingMovies() {
  const data = await tmdbRequest("/trending/movie/week");
  if (!data?.results) {
    return fallbackTrending;
  }

  return data.results.slice(0, 10).map(withPoster);
}

export async function searchMovies(query) {
  const data = await tmdbRequest("/search/movie", { query });
  return (data?.results || []).map(withPoster);
}

export async function getMovieDetails(tmdbId) {
  const data = await tmdbRequest(`/movie/${tmdbId}`, {
    append_to_response: "videos,credits"
  });

  if (!data) {
    return null;
  }

  return withPoster(data);
}
