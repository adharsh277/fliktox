"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import NavBar from "../../../components/NavBar";
import BackButton from "../../../components/BackButton";
import ShareMenu from "../../../components/ShareMenu";
import { api, getCurrentUser } from "../../../lib/api";

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

function StarBar({ distribution }) {
  const max = Math.max(...distribution.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const entry = distribution.find((d) => d.rating === star);
        const count = entry?.count || 0;
        const height = Math.max((count / max) * 60, 4);
        return (
          <div key={star} className="flex flex-col items-center gap-1">
            <div className="w-8 rounded-t bg-gold/80" style={{ height: `${height}px` }} />
            <span className="text-xs text-mist/60">{"★".repeat(star)}</span>
            <span className="text-xs text-mist/50">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ProfilePage() {
  const params = useParams();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [lists, setLists] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState("films");
  const [editBio, setEditBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [isOwn, setIsOwn] = useState(false);

  useEffect(() => {
    const current = getCurrentUser();
    const username = params.username;

    api.publicProfile(username).then((data) => {
      setProfile(data);
      setBioText(data.user.bio || "");
      if (current && current.id === data.user.id) {
        setIsOwn(true);
        api.friendRequests().then(setRequests).catch(() => {});
        api.myLists().then(setLists).catch(() => {});
        api.myStats().then(setStats).catch(() => {});
      } else {
        api.userStats(data.user.id).then(setStats).catch(() => {});
        api.userLists(data.user.id).then(setLists).catch(() => {});
      }
    }).catch(() => {});
  }, [params.username]);

  async function saveBio() {
    await api.updateProfile({ bio: bioText });
    setProfile((p) => ({ ...p, user: { ...p.user, bio: bioText } }));
    setEditBio(false);
  }

  async function onAccept(requestId) {
    await api.acceptRequest(requestId);
    const next = await api.friendRequests();
    setRequests(next);
  }

  if (!profile) {
    return (
      <main>
        <NavBar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-mist/60">Loading profile...</p>
        </div>
      </main>
    );
  }

  const { user, ratings, totalWatched, watchlist, reviews, totalFriends } = profile;
  const watchedMovies = ratings.filter((r) => r.watched);
  const tabs = ["films", "diary", "reviews", "lists", "watchlist", "stats"];

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <BackButton fallbackHref="/dashboard" label="Back" />
          <ShareMenu
            title={`${user.username}'s profile`}
            text={`Check out ${user.username} on Fliktox`}
            path={`/user/${encodeURIComponent(String(user.username || "").trim())}`}
          />
        </div>

        {/* Profile Header */}
        <div className="flex items-start gap-5">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold to-ember text-3xl font-bold text-black">
            {user.profilePhoto ? (
              <img src={user.profilePhoto} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              user.username[0].toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-5xl tracking-wide text-gold">@{user.username}</h1>
            {editBio && isOwn ? (
              <div className="mt-2 flex gap-2">
                <input value={bioText} onChange={(e) => setBioText(e.target.value)} className="flex-1 rounded-lg border border-white/20 bg-[#102032] px-3 py-1 text-sm outline-none" placeholder="Write something about yourself..." />
                <button onClick={saveBio} className="rounded-lg bg-gold px-3 py-1 text-sm font-semibold text-black">Save</button>
                <button onClick={() => setEditBio(false)} className="rounded-lg border border-white/20 px-3 py-1 text-sm text-mist/60">Cancel</button>
              </div>
            ) : (
              <p className="mt-1 text-sm text-mist/75">
                {user.bio || "No bio yet."}
                {isOwn && <button onClick={() => setEditBio(true)} className="ml-2 text-gold/70 hover:text-gold">Edit</button>}
              </p>
            )}
            {user.favoriteGenres?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {user.favoriteGenres.map((g) => (
                  <span key={g} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-mist/70">{g}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card-surface rounded-xl p-3 text-center">
            <p className="font-display text-3xl text-gold">{totalWatched}</p>
            <p className="text-xs text-mist/60">Films</p>
          </div>
          <div className="card-surface rounded-xl p-3 text-center">
            <p className="font-display text-3xl text-gold">{reviews.length}</p>
            <p className="text-xs text-mist/60">Reviews</p>
          </div>
          <div className="card-surface rounded-xl p-3 text-center">
            <p className="font-display text-3xl text-gold">{watchlist.length}</p>
            <p className="text-xs text-mist/60">Watchlist</p>
          </div>
          <div className="card-surface rounded-xl p-3 text-center">
            <p className="font-display text-3xl text-gold">{totalFriends}</p>
            <p className="text-xs text-mist/60">Friends</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-1 overflow-x-auto border-b border-white/10 pb-0">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium capitalize transition ${tab === t ? "border-b-2 border-gold text-gold" : "text-mist/60 hover:text-mist"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {tab === "films" && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-mist">Watched Films</h2>
              {watchedMovies.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {watchedMovies.map((m) => (
                    <Link key={m.tmdb_id} href={`/movie/${m.tmdb_id}`} className="group overflow-hidden rounded-xl border border-white/10">
                      <div className="relative aspect-[2/3] bg-[#172638]">
                        <div className="flex h-full items-center justify-center text-xs text-mist/40">#{m.tmdb_id}</div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 text-center">
                          <p className="text-xs text-gold">{"★".repeat(m.rating || 0)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-mist/50">No films watched yet.</p>
              )}
            </div>
          )}

          {tab === "diary" && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-mist">Film Diary</h2>
              <div className="space-y-2">
                {ratings.slice(0, 30).map((r, i) => (
                  <Link key={`${r.tmdb_id}-${i}`} href={`/movie/${r.tmdb_id}`}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 transition hover:bg-white/10">
                    <div>
                      <p className="text-sm font-medium text-mist">Movie #{r.tmdb_id}</p>
                      <p className="text-xs text-mist/50">{new Date(r.updated_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.watched && <span className="text-xs text-green-400">Watched</span>}
                      {r.watchlist && <span className="text-xs text-blue-400">Watchlist</span>}
                      <span className="text-sm text-gold">{"★".repeat(r.rating || 0)}</span>
                    </div>
                  </Link>
                ))}
                {!ratings.length && <p className="text-sm text-mist/50">No diary entries yet.</p>}
              </div>
            </div>
          )}

          {tab === "reviews" && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-mist">Reviews</h2>
              <div className="space-y-3">
                {reviews.map((r, i) => (
                  <Link key={`${r.tmdb_id}-${i}`} href={`/movie/${r.tmdb_id}`}
                    className="block rounded-xl bg-white/5 p-4 transition hover:bg-white/10">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-mist">Movie #{r.tmdb_id}</p>
                      <span className="text-sm text-gold">{"★".repeat(r.rating || 0)}</span>
                    </div>
                    <p className="mt-2 text-sm text-mist/80">{r.review}</p>
                    <p className="mt-1 text-xs text-mist/40">{new Date(r.updated_at).toLocaleDateString()}</p>
                  </Link>
                ))}
                {!reviews.length && <p className="text-sm text-mist/50">No reviews yet.</p>}
              </div>
            </div>
          )}

          {tab === "lists" && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-mist">Movie Lists</h2>
              {isOwn && (
                <Link href="/lists" className="mb-3 inline-block rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black">
                  Manage Lists
                </Link>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {lists.map((list) => (
                  <Link key={list.id} href={`/lists/${list.id}`}
                    className="card-surface rounded-xl p-4 transition hover:border-gold/30">
                    <p className="font-semibold text-mist">{list.title}</p>
                    <p className="mt-1 text-xs text-mist/50">{list.movie_count} films · {list.is_public ? "Public" : "Private"}</p>
                    {list.description && <p className="mt-1 text-sm text-mist/60">{list.description}</p>}
                  </Link>
                ))}
                {!lists.length && <p className="text-sm text-mist/50">No lists yet.</p>}
              </div>
            </div>
          )}

          {tab === "watchlist" && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-mist">Watchlist</h2>
              {watchlist.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {watchlist.map((m) => (
                    <Link key={m.tmdb_id} href={`/movie/${m.tmdb_id}`}
                      className="group overflow-hidden rounded-xl border border-white/10">
                      <div className="flex aspect-[2/3] items-center justify-center bg-[#172638] text-xs text-mist/40">
                        #{m.tmdb_id}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-mist/50">Watchlist is empty.</p>
              )}
            </div>
          )}

          {tab === "stats" && stats && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-mist">Movie Statistics</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="card-surface rounded-xl p-4">
                  <p className="text-sm text-mist/60">Average Rating</p>
                  <p className="font-display text-4xl text-gold">{stats.averageRating || "—"}</p>
                </div>
                <div className="card-surface rounded-xl p-4">
                  <p className="text-sm text-mist/60">Rating Distribution</p>
                  <div className="mt-2">
                    <StarBar distribution={stats.ratingDistribution || []} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Friend Requests (own profile only) */}
        {isOwn && requests.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-mist">Friend Requests</h2>
            <div className="space-y-2">
              {requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                  <p className="text-sm text-mist">{req.username}</p>
                  <button onClick={() => onAccept(req.id)} className="rounded-lg bg-ember px-3 py-1 text-sm text-white">Accept</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
