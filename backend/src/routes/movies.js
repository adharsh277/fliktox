import { Router } from "express";
import {
  discoverMovies,
  getMovieDetails,
  getPopularMovies,
  getTopRatedMovies,
  getTrendingMovies,
  searchMovies
} from "../utils/tmdb.js";

export const moviesRouter = Router();

moviesRouter.get("/trending", async (_, res) => {
  try {
    const movies = await getTrendingMovies();
    return res.json(movies);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch trending movies" });
  }
});

moviesRouter.get("/popular", async (req, res) => {
  const page = Number(req.query.page || 1);
  try {
    const movies = await getPopularMovies(page);
    return res.json(movies);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch popular movies" });
  }
});

moviesRouter.get("/top-rated", async (req, res) => {
  const page = Number(req.query.page || 1);
  try {
    const movies = await getTopRatedMovies(page);
    return res.json(movies);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch top rated movies" });
  }
});

moviesRouter.get("/discover", async (req, res) => {
  const page = Number(req.query.page || 1);
  try {
    const movies = await discoverMovies(page);
    return res.json(movies);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch discover movies" });
  }
});

moviesRouter.get("/search", async (req, res) => {
  const query = String(req.query.q || "").trim();
  const page = Number(req.query.page || 1);
  if (!query) {
    return res.json([]);
  }

  try {
    const movies = await searchMovies(query, page);
    return res.json(movies);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Movie search failed" });
  }
});

moviesRouter.get("/:tmdbId", async (req, res) => {
  try {
    const movie = await getMovieDetails(req.params.tmdbId);
    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    return res.json(movie);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch movie details" });
  }
});
