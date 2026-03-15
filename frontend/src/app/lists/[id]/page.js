"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "../../../components/NavBar";
import BackButton from "../../../components/BackButton";
import ShareMenu from "../../../components/ShareMenu";
import { api, getCurrentUser } from "../../../lib/api";

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [list, setList] = useState(null);
  const [movieDetails, setMovieDetails] = useState({});
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.push("/login"); return; }
    loadList(user.id);
  }, [params.id, router]);

  async function loadList(currentUserId) {
    const data = await api.getList(params.id);
    setList(data);
    setIsOwner(data.user_id === currentUserId);

    // Fetch movie details for each movie in the list
    const details = {};
    await Promise.all(
      data.movies.map(async (m) => {
        try {
          const movie = await api.movie(m.tmdb_id);
          details[m.tmdb_id] = movie;
        } catch { /* skip */ }
      })
    );
    setMovieDetails(details);
  }

  async function onSearch(e) {
    e.preventDefault();
    if (!search.trim()) return;
    const movies = await api.searchMovies(search.trim());
    setResults(movies.slice(0, 8));
  }

  async function addMovie(tmdbId) {
    await api.addMovieToList(params.id, tmdbId);
    const user = getCurrentUser();
    await loadList(user.id);
    setResults([]);
    setSearch("");
  }

  async function removeMovie(tmdbId) {
    await api.removeMovieFromList(params.id, tmdbId);
    setList((prev) => ({
      ...prev,
      movies: prev.movies.filter((m) => m.tmdb_id !== tmdbId)
    }));
  }

  if (!list) {
    return <main><NavBar /><div className="flex min-h-[60vh] items-center justify-center"><p className="text-mist/60">Loading...</p></div></main>;
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <BackButton fallbackHref="/lists" label="Back to Lists" />
          <ShareMenu
            title={list.title}
            text={list.description || `Check out ${list.title} on Fliktox`}
            path={`/lists/${list.id}`}
            disabled={!list.is_public}
            disabledMessage="This list is private. Make it public to share."
          />
        </div>

        <h1 className="mt-3 font-display text-4xl tracking-wide text-gold">{list.title}</h1>
        <p className="mt-1 text-sm text-mist/60">by @{list.username} · {list.movies.length} films</p>
        {list.description && <p className="mt-2 text-mist/75">{list.description}</p>}
        <div className="mt-2">
          <span className="text-xs text-mist/55">{list.is_public ? "Public" : "Private"}</span>
        </div>

        {/* Add movies (owner only) */}
        {isOwner && (
          <div className="mt-5">
            <form onSubmit={onSearch} className="flex gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search movies to add..."
                className="flex-1 rounded-lg border border-white/20 bg-[#102032] px-4 py-2 text-sm outline-none focus:border-gold" />
              <button type="submit" className="rounded-lg bg-ember px-4 py-2 text-sm text-white">Search</button>
            </form>
            {results.length > 0 && (
              <div className="mt-2 space-y-1">
                {results.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-sm text-mist">{m.title}</p>
                    <button onClick={() => addMovie(m.id)} className="rounded bg-gold/20 px-2 py-1 text-xs text-gold">+ Add</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Movie grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {list.movies.map((m) => {
            const detail = movieDetails[m.tmdb_id];
            return (
              <div key={m.tmdb_id} className="group relative overflow-hidden rounded-xl border border-white/10">
                <Link href={`/movie/${m.tmdb_id}`}>
                  {detail?.poster_url ? (
                    <img src={detail.poster_url} alt={detail.title || ""} className="aspect-[2/3] w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex aspect-[2/3] items-center justify-center bg-[#172638] text-xs text-mist/40">#{m.tmdb_id}</div>
                  )}
                </Link>
                {isOwner && (
                  <button onClick={() => removeMovie(m.tmdb_id)}
                    className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-red-400 opacity-0 transition group-hover:opacity-100">
                    ✕
                  </button>
                )}
                {detail && <p className="px-2 py-1 text-xs text-mist/70 line-clamp-1">{detail.title}</p>}
              </div>
            );
          })}
        </div>
        {!list.movies.length && <p className="mt-6 text-center text-sm text-mist/50">This list is empty. Add some movies!</p>}
      </section>
    </main>
  );
}
