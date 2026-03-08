import { env } from "../config/env.js";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

const fallbackPosterPaths = [
  "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  "/6agKYU5IQFpuDyUYPu39w7UCRrJ.jpg",
  "/nMkByUotTgQJpXX25J7pwWqR4Ww.jpg",
  "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  "/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
  "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
  "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
  "/rSPw7tgCH9c6NqICZef4kZjFOQ5.jpg",
  "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
  "/5KCVkau1HEl7ZzfPsKAPM0sMiKc.jpg"
];

const fallbackCatalog = [
  { id: 872585, title: "Oppenheimer", release_date: "2023-07-19", vote_average: 8.1 },
  { id: 438631, title: "Dune", release_date: "2021-09-15", vote_average: 7.8 },
  { id: 414906, title: "The Batman", release_date: "2022-03-01", vote_average: 7.7 },
  { id: 157336, title: "Interstellar", release_date: "2014-11-05", vote_average: 8.4 },
  { id: 475557, title: "Joker", release_date: "2019-10-01", vote_average: 8.1 },
  { id: 27205, title: "Inception", release_date: "2010-07-15", vote_average: 8.4 },
  { id: 299534, title: "Avengers: Endgame", release_date: "2019-04-24", vote_average: 8.2 },
  { id: 496243, title: "Parasite", release_date: "2019-05-30", vote_average: 8.5 },
  { id: 550, title: "Fight Club", release_date: "1999-10-15", vote_average: 8.4 },
  { id: 155, title: "The Dark Knight", release_date: "2008-07-16", vote_average: 8.5 },
  { id: 680, title: "Pulp Fiction", release_date: "1994-09-10", vote_average: 8.5 },
  { id: 13, title: "Forrest Gump", release_date: "1994-06-23", vote_average: 8.5 },
  { id: 278, title: "The Shawshank Redemption", release_date: "1994-09-23", vote_average: 8.7 },
  { id: 238, title: "The Godfather", release_date: "1972-03-14", vote_average: 8.7 },
  { id: 122, title: "The Lord of the Rings", release_date: "2001-12-18", vote_average: 8.4 },
  { id: 603, title: "The Matrix", release_date: "1999-03-30", vote_average: 8.2 },
  { id: 24428, title: "The Avengers", release_date: "2012-04-25", vote_average: 7.7 },
  { id: 299536, title: "Avengers: Infinity War", release_date: "2018-04-25", vote_average: 8.2 },
  { id: 11, title: "Star Wars", release_date: "1977-05-25", vote_average: 8.2 },
  { id: 76341, title: "Mad Max: Fury Road", release_date: "2015-05-13", vote_average: 7.6 },
  { id: 807, title: "Se7en", release_date: "1995-09-22", vote_average: 8.4 },
  { id: 597, title: "Titanic", release_date: "1997-11-18", vote_average: 7.9 },
  { id: 120, title: "The Fellowship of the Ring", release_date: "2001-12-18", vote_average: 8.4 },
  { id: 1891, title: "The Empire Strikes Back", release_date: "1980-05-20", vote_average: 8.4 }
].map((movie, idx) => ({
  ...movie,
  poster_path: fallbackPosterPaths[idx % fallbackPosterPaths.length],
  overview: "TMDB API key is not set yet. Add TMDB_API_KEY in backend/.env for live metadata."
}));

const fallbackTrending = fallbackCatalog.slice(0, 10);
const fallbackPopular = fallbackCatalog.slice(8, 18);
const fallbackTopRated = fallbackCatalog.slice(12, 22);
const fallbackDiscover = fallbackCatalog.slice(4, 24);

const fallbackCast = [
  { id: 1, name: "Matthew McConaughey", character: "Cooper", profile_path: "", profile_url: "" },
  { id: 2, name: "Anne Hathaway", character: "Brand", profile_path: "", profile_url: "" },
  { id: 3, name: "Jessica Chastain", character: "Murph", profile_path: "", profile_url: "" },
  { id: 4, name: "Michael Caine", character: "Professor Brand", profile_path: "", profile_url: "" }
];

function fallbackMovieDetails(tmdbId) {
  const found = fallbackCatalog.find((movie) => Number(movie.id) === Number(tmdbId));
  if (!found) {
    return null;
  }

  return {
    ...found,
    runtime: 169,
    genres: [
      { id: 878, name: "Sci-Fi" },
      { id: 12, name: "Adventure" }
    ],
    cast: fallbackCast,
    director: { id: 101, name: "Christopher Nolan", job: "Director" },
    producer: { id: 102, name: "Emma Thomas", job: "Producer" },
    trailers: []
  };
}

function withPoster(movie) {
  return {
    ...movie,
    poster_url: movie.poster_path ? `${TMDB_IMAGE}${movie.poster_path}` : null
  };
}

function mapMovieList(data, limit = 20) {
  return (data?.results || [])
    .filter((movie) => movie.poster_path)
    .slice(0, limit)
    .map(withPoster);
}

function normalizeCrew(crew = []) {
  return {
    director: crew.find((member) => member.job === "Director") || null,
    producer: crew.find((member) => member.job === "Producer") || null
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

  return mapMovieList(data, 20);
}

export async function getPopularMovies(page = 1) {
  const data = await tmdbRequest("/movie/popular", { page });
  if (!data?.results) {
    return fallbackPopular;
  }

  return mapMovieList(data, 20);
}

export async function getTopRatedMovies(page = 1) {
  const data = await tmdbRequest("/movie/top_rated", { page });
  if (!data?.results) {
    return fallbackTopRated;
  }

  return mapMovieList(data, 20);
}

export async function discoverMovies(page = 1) {
  const data = await tmdbRequest("/discover/movie", {
    page,
    include_adult: false,
    include_video: false,
    sort_by: "popularity.desc"
  });

  if (!data?.results) {
    return fallbackDiscover;
  }

  return mapMovieList(data, 20);
}

export async function searchMovies(query, page = 1) {
  if (!env.tmdbApiKey) {
    const q = String(query || "").toLowerCase();
    return fallbackCatalog.filter((movie) => movie.title.toLowerCase().includes(q));
  }

  const data = await tmdbRequest("/search/movie", { query, page, include_adult: false });
  return mapMovieList(data, 20);
}

export async function getMovieDetails(tmdbId) {
  if (!env.tmdbApiKey) {
    return fallbackMovieDetails(tmdbId);
  }

  const [movie, credits, videos] = await Promise.all([
    tmdbRequest(`/movie/${tmdbId}`),
    tmdbRequest(`/movie/${tmdbId}/credits`),
    tmdbRequest(`/movie/${tmdbId}/videos`)
  ]);

  if (!movie) {
    return null;
  }

  const { director, producer } = normalizeCrew(credits?.crew || []);

  return {
    ...withPoster(movie),
    cast: (credits?.cast || []).slice(0, 10).map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character,
      profile_path: member.profile_path,
      profile_url: member.profile_path ? `${TMDB_IMAGE}${member.profile_path}` : ""
    })),
    director,
    producer,
    trailers: (videos?.results || []).filter((item) => item.site === "YouTube" && item.type === "Trailer")
  };
}

export function tmdbPosterUrl(path) {
  return path ? `${TMDB_IMAGE}${path}` : "";
}
