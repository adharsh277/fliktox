"use client";

import { useEffect, useState } from "react";
import NavBar from "../../components/NavBar";
import MoviePosterGrid from "../../components/MoviePosterGrid";
import { api } from "../../lib/api";

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    api.trending().then(setMovies).catch(() => setMovies([]));
  }, []);

  async function onSearch(e) {
    e.preventDefault();
    if (!query.trim()) {
      const trending = await api.trending();
      setMovies(trending);
      return;
    }

    const result = await api.searchMovies(query.trim());
    setMovies(result);
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <h1 className="font-display text-5xl tracking-wide text-gold">Discovery</h1>
        <p className="mt-1 text-mist/75">Trending, top picks and your next obsession.</p>

        <form onSubmit={onSearch} className="mt-4 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies..."
            className="w-full rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember"
          />
          <button type="submit" className="rounded-xl bg-ember px-5 py-3 text-white">
            Search
          </button>
        </form>

        <div className="mt-6">
          <MoviePosterGrid movies={movies} />
        </div>
      </section>
    </main>
  );
}
