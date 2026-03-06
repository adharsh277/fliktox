"use client";

import { useEffect, useState } from "react";
import NavBar from "../../components/NavBar";
import MoviePosterGrid from "../../components/MoviePosterGrid";
import { api } from "../../lib/api";

function Section({ title, movies }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-3xl tracking-wide text-gold">{title}</h2>
      <div className="mt-4">
        <MoviePosterGrid movies={movies} />
      </div>
    </section>
  );
}

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [browseAll, setBrowseAll] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([
      api.trending(),
      api.popularMovies(1),
      api.topRatedMovies(1),
      api.discoverMovies(1)
    ])
      .then(([trendingRes, popularRes, topRatedRes, discoverRes]) => {
        setTrending(trendingRes);
        setPopular(popularRes);
        setTopRated(topRatedRes);
        setBrowseAll(discoverRes);
      })
      .catch(() => {
        setTrending([]);
        setPopular([]);
        setTopRated([]);
        setBrowseAll([]);
      });
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    const timer = setTimeout(async () => {
      if (!trimmed) {
        setSearchResults([]);
        return;
      }

      try {
        const result = await api.searchMovies(trimmed, 1);
        setSearchResults(result);
      } catch {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  async function onBrowsePage(nextPage) {
    if (nextPage < 1) {
      return;
    }

    const results = await api.discoverMovies(nextPage);
    setPage(nextPage);
    setBrowseAll(results);
  }

  async function onSubmitSearch(e) {
    e.preventDefault();
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <h1 className="font-display text-5xl tracking-wide text-gold">Discovery</h1>
        <p className="mt-1 text-mist/75">Trending, most logged, top rated, and full browse catalog.</p>

        <form onSubmit={onSubmitSearch} className="mt-4 flex gap-2">
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

        {query.trim() ? (
          <section className="mt-8">
            <h2 className="font-display text-3xl tracking-wide text-gold">Search Results</h2>
            <div className="mt-4">
              <MoviePosterGrid movies={searchResults} />
            </div>
          </section>
        ) : null}

        <Section title="Trending this week" movies={trending} />
        <Section title="Most logged films" movies={popular} />
        <Section title="Highest rated" movies={topRated} />

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl tracking-wide text-gold">Browse All Movies</h2>
            <p className="text-sm text-mist/70">Page {page}</p>
          </div>
          <div className="mt-4">
            <MoviePosterGrid movies={browseAll} />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => onBrowsePage(page - 1)}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm text-mist hover:bg-white/10"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => onBrowsePage(page + 1)}
              className="rounded-lg bg-ember px-4 py-2 text-sm text-white"
            >
              Next
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
