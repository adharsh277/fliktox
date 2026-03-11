"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "../../components/NavBar";
import { api, getCurrentUser } from "../../lib/api";

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

function Bar({ label, value, max, color = "bg-gold" }) {
  const width = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 text-right text-sm text-mist/60">{label}</span>
      <div className="flex-1 rounded-full bg-white/10">
        <div className={`${color} h-5 rounded-full transition-all duration-500`} style={{ width: `${width}%` }} />
      </div>
      <span className="w-8 text-sm text-mist/70">{value}</span>
    </div>
  );
}

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [recs, setRecs] = useState(null);
  const [seedMovie, setSeedMovie] = useState(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.push("/login"); return; }

    api.myStats().then(setStats).catch(() => {});
    api.recommendations().then((data) => {
      setRecs(data);
      if (data.seedTitle) {
        setSeedMovie({ title: data.seedTitle });
      } else if (data.becauseYouLiked) {
        api.movie(data.becauseYouLiked).then(setSeedMovie).catch(() => {});
      }
    }).catch(() => {});
  }, [router]);

  if (!stats) {
    return (
      <main>
        <NavBar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <p className="mt-3 text-sm text-mist/60">Loading stats...</p>
          </div>
        </div>
      </main>
    );
  }

  const distMax = Math.max(...(stats.ratingDistribution || []).map((d) => d.count), 1);

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
        <h1 className="font-display text-5xl tracking-wide text-gold">Your Stats</h1>
        <p className="mt-1 text-sm text-mist/60">Your movie journey at a glance.</p>

        {/* Overview Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card-surface rounded-xl p-4 text-center">
            <p className="font-display text-4xl text-gold">{stats.totalWatched}</p>
            <p className="text-xs text-mist/60">Films Watched</p>
          </div>
          <div className="card-surface rounded-xl p-4 text-center">
            <p className="font-display text-4xl text-gold">{stats.totalReviews}</p>
            <p className="text-xs text-mist/60">Reviews</p>
          </div>
          <div className="card-surface rounded-xl p-4 text-center">
            <p className="font-display text-4xl text-gold">{stats.totalWatchlist}</p>
            <p className="text-xs text-mist/60">Watchlist</p>
          </div>
          <div className="card-surface rounded-xl p-4 text-center">
            <p className="font-display text-4xl text-gold">{stats.averageRating || "—"}</p>
            <p className="text-xs text-mist/60">Avg Rating</p>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="mt-8 card-surface rounded-xl p-5">
          <h2 className="mb-4 text-lg font-semibold text-mist">Rating Distribution</h2>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const entry = (stats.ratingDistribution || []).find((d) => d.rating === star);
              return <Bar key={star} label={"★".repeat(star)} value={entry?.count || 0} max={distMax} />;
            })}
          </div>
        </div>

        {/* Recent Activity */}
        {stats.recentActivity?.length > 0 && (
          <div className="mt-8 card-surface rounded-xl p-5">
            <h2 className="mb-4 text-lg font-semibold text-mist">Recent Activity</h2>
            <div className="space-y-2">
              {stats.recentActivity.map((r, i) => (
                <Link key={`${r.tmdb_id}-${i}`} href={`/movie/${r.tmdb_id}`}
                  className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 transition hover:bg-white/10">
                  {r.poster_url ? (
                    <img src={r.poster_url} alt={r.movie_title || ""} className="h-12 w-8 rounded object-cover" />
                  ) : (
                    <div className="flex h-12 w-8 items-center justify-center rounded bg-white/10 text-[8px] text-mist/30">?</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-mist truncate">{r.movie_title || `Movie #${r.tmdb_id}`}</p>
                    {r.release_year && <p className="text-xs text-mist/40">{r.release_year}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {r.watched && <span className="text-xs text-green-400">Watched</span>}
                    <span className="text-sm text-gold">{"★".repeat(r.rating || 0)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recs && (recs.similar?.length > 0 || recs.friendRecommendations?.length > 0 || recs.genreRecommendations?.length > 0) && (
          <div className="mt-10">
            <h2 className="font-display text-4xl tracking-wide text-gold">Recommended for You</h2>

            {recs.similar?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-mist/60">
                  Because you liked <span className="font-semibold text-gold">{seedMovie?.title || `Movie #${recs.becauseYouLiked}`}</span>
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                  {recs.similar.slice(0, 10).map((m) => (
                    <Link key={m.id} href={`/movie/${m.id}`} className="group overflow-hidden rounded-xl border border-white/10">
                      {m.poster_url ? (
                        <img src={m.poster_url} alt={m.title} className="aspect-[2/3] w-full object-cover transition group-hover:scale-105" />
                      ) : (
                        <div className="flex aspect-[2/3] items-center justify-center bg-[#172638] text-xs text-mist/40">{m.title}</div>
                      )}
                      <p className="px-2 py-1 text-xs text-mist/70 line-clamp-1">{m.title}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {recs.genreRecommendations?.length > 0 && (
              <div className="mt-6">
                <p className="text-sm text-mist/60">Based on your favorite genres</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                  {recs.genreRecommendations.slice(0, 10).map((m) => (
                    <Link key={m.id} href={`/movie/${m.id}`} className="group overflow-hidden rounded-xl border border-white/10">
                      {m.poster_url ? (
                        <img src={m.poster_url} alt={m.title} className="aspect-[2/3] w-full object-cover transition group-hover:scale-105" />
                      ) : (
                        <div className="flex aspect-[2/3] items-center justify-center bg-[#172638] text-xs text-mist/40">{m.title}</div>
                      )}
                      <p className="px-2 py-1 text-xs text-mist/70 line-clamp-1">{m.title}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {recs.friendRecommendations?.length > 0 && (
              <div className="mt-6">
                <p className="text-sm text-mist/60">Highly rated by friends</p>
                <div className="mt-3 space-y-2">
                  {recs.friendRecommendations.map((r, i) => (
                    <Link key={`${r.tmdb_id}-${i}`} href={`/movie/${r.tmdb_id}`}
                      className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3 transition hover:bg-white/10">
                      {r.poster_url ? (
                        <img src={r.poster_url} alt={r.movie_title || ""} className="h-12 w-8 rounded object-cover" />
                      ) : (
                        <div className="flex h-12 w-8 items-center justify-center rounded bg-white/10 text-[8px] text-mist/30">?</div>
                      )}
                      <span className="flex-1 text-sm text-mist truncate">{r.movie_title || `Movie #${r.tmdb_id}`}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-mist/50">@{r.username}</span>
                        <span className="text-sm text-gold">{"★".repeat(r.rating)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
