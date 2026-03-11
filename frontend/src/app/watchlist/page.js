"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "../../components/NavBar";
import { api, getCurrentUser } from "../../lib/api";

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

export default function WatchlistPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.push("/login"); return; }

    api.getWatchlist()
      .then(async (watchlist) => {
        const enriched = await Promise.all(
          watchlist.map(async (item) => {
            try {
              const movie = await api.movie(item.tmdb_id);
              return { ...item, title: movie.title, poster_url: movie.poster_url, vote_average: movie.vote_average };
            } catch {
              return { ...item, title: `Movie #${item.tmdb_id}`, poster_url: null };
            }
          })
        );
        setItems(enriched);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function removeFromWatchlist(tmdbId) {
    await api.removeFromWatchlist(tmdbId);
    setItems((prev) => prev.filter((i) => i.tmdb_id !== tmdbId));
  }

  async function markWatched(tmdbId) {
    await api.markWatched(tmdbId);
    setItems((prev) =>
      prev.map((i) => (i.tmdb_id === tmdbId ? { ...i, watched: true } : i))
    );
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
        <h1 className="font-display text-5xl tracking-wide text-gold">My Watchlist</h1>
        <p className="mt-2 text-sm text-mist/60">{items.length} movie{items.length !== 1 ? "s" : ""}</p>

        {loading ? (
          <p className="mt-8 text-mist/50">Loading watchlist...</p>
        ) : items.length === 0 ? (
          <div className="mt-8 text-center">
            <p className="text-mist/60">Your watchlist is empty.</p>
            <Link href="/discover" className="mt-3 inline-block rounded-xl bg-ember px-5 py-2 text-sm text-white">
              Discover Movies
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <div key={item.tmdb_id} className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
                <Link href={`/movie/${item.tmdb_id}`}>
                  {item.poster_url ? (
                    <img src={item.poster_url} alt={item.title} className="aspect-[2/3] w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex aspect-[2/3] items-center justify-center bg-[#172638] text-xs text-mist/40">
                      {item.title}
                    </div>
                  )}
                </Link>
                <div className="p-3">
                  <Link href={`/movie/${item.tmdb_id}`} className="text-sm font-medium text-mist line-clamp-1 hover:text-gold">
                    {item.title}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-xs text-mist/50">
                    {item.rating && (
                      <span className="text-gold">{"★".repeat(item.rating)}</span>
                    )}
                    {item.watched && (
                      <span className="text-emerald-400">✓ Watched</span>
                    )}
                  </div>
                  <div className="mt-2 flex gap-2">
                    {!item.watched && (
                      <button
                        onClick={() => markWatched(item.tmdb_id)}
                        className="rounded-lg border border-white/15 px-2 py-1 text-xs text-mist/70 hover:border-emerald-400 hover:text-emerald-400"
                      >
                        Mark Watched
                      </button>
                    )}
                    <button
                      onClick={() => removeFromWatchlist(item.tmdb_id)}
                      className="rounded-lg border border-white/15 px-2 py-1 text-xs text-mist/70 hover:border-red-400 hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
