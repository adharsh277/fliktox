"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import NavBar from "../../../components/NavBar";
import { api, getCurrentUser, setSession } from "../../../lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
const GENRE_OPTIONS = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller"
];

function toMediaUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const origin = API_BASE.startsWith("http") ? API_BASE.replace(/\/api\/?$/, "") : "";
  return origin && url.startsWith("/") ? `${origin}${url}` : url;
}

function stars(rating) {
  const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return `${"★".repeat(value)}${"☆".repeat(5 - value)}`;
}

function MovieGrid({ items, emptyText }) {
  if (!items.length) {
    return <p className="text-sm text-mist/55">{emptyText}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((item) => (
        <Link key={item.movieId} href={`/movie/${item.movieId}`} className="group overflow-hidden rounded-xl border border-white/10 bg-black/30">
          <div className="aspect-[2/3] bg-[#172638]">
            {item.poster ? (
              <img src={toMediaUrl(item.poster)} alt={item.title} className="h-full w-full object-cover transition group-hover:scale-105" />
            ) : (
              <div className="flex h-full items-center justify-center px-3 text-center text-xs text-mist/50">{item.title}</div>
            )}
          </div>
          <div className="px-2 py-2">
            <p className="line-clamp-1 text-xs text-mist/80">{item.title}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  const cleanUsername = String(username || "").trim();

  const [profile, setProfile] = useState(null);
  const [watched, setWatched] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);

  const currentUser = useMemo(() => getCurrentUser(), []);
  const isOwnProfile = String(currentUser?.username || "").trim() === cleanUsername;

  async function loadProfile() {
    setLoading(true);
    setMessage("");
    try {
      const [p, watchedRes, reviewsRes, ratingsRes, watchlistRes] = await Promise.all([
        api.userProfile(cleanUsername),
        api.userWatched(cleanUsername),
        api.userReviews(cleanUsername),
        api.userRatings(cleanUsername),
        api.userWatchlist(cleanUsername)
      ]);

      setProfile(p);
      setWatched(watchedRes);
      setReviews(reviewsRes);
      setRatings(ratingsRes);
      setWatchlist(watchlistRes);
      setBioInput(p.bio || "");
      setSelectedGenres(Array.isArray(p.favoriteGenres) ? p.favoriteGenres : []);
    } catch (err) {
      setMessage(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!cleanUsername) return;

    // Keep canonical profile URLs and strip accidental leading/trailing spaces.
    if (cleanUsername !== username) {
      router.replace(`/profile/${encodeURIComponent(cleanUsername)}`);
      return;
    }

    loadProfile();
  }, [username, cleanUsername, router]);

  async function onSaveBio() {
    setMessage("");
    try {
      await api.updateProfile({ bio: bioInput });
      setProfile((prev) => ({ ...prev, bio: bioInput }));
      setMessage("Bio updated");
    } catch (err) {
      setMessage(err.message || "Failed to update bio");
    }
  }

  async function onSaveFavorites() {
    setMessage("");
    try {
      const data = await api.updateFavorites(selectedGenres);
      setProfile((prev) => ({ ...prev, favoriteGenres: data.genres || [] }));
      setMessage("Favorite genres updated");
    } catch (err) {
      setMessage(err.message || "Failed to update favorite genres");
    }
  }

  async function onUploadAvatar() {
    if (!avatarFile) {
      setMessage("Please choose an image first");
      return;
    }

    setMessage("");
    try {
      const data = await api.uploadAvatar(avatarFile);
      const nextPhoto = data.avatar;
      setProfile((prev) => ({ ...prev, profilePhoto: nextPhoto }));

      if (currentUser) {
        setSession(localStorage.getItem("fliktox_token"), { ...currentUser, profile_photo: nextPhoto });
      }

      setAvatarFile(null);
      setMessage("Profile photo updated");
    } catch (err) {
      setMessage(err.message || "Failed to upload avatar");
    }
  }

  async function onRemoveFromWatchlist(movieId) {
    try {
      await api.removeFromWatchlist(movieId);
      await loadProfile();
    } catch (err) {
      setMessage(err.message || "Failed to remove from watchlist");
    }
  }

  async function onMarkWatched(movieId) {
    try {
      await api.markWatched(movieId);
      await loadProfile();
    } catch (err) {
      setMessage(err.message || "Failed to mark as watched");
    }
  }

  if (loading) {
    return (
      <main>
        <NavBar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-mist/60">Loading profile...</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main>
        <NavBar />
        <div className="mx-auto w-full max-w-4xl px-4 py-10">
          <p className="text-sm text-red-300">{message || "User not found"}</p>
          <p className="mt-1 text-sm text-mist/65">This profile may not exist.</p>
          <button onClick={() => router.push("/discover")} className="mt-4 rounded-lg bg-ember px-4 py-2 text-sm text-white">
            Go to Discover
          </button>
        </div>
      </main>
    );
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div className="card-surface rounded-2xl p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="h-24 w-24 overflow-hidden rounded-full border border-white/20 bg-[#172638]">
              {profile.profilePhoto ? (
                <img src={toMediaUrl(profile.profilePhoto)} alt={`${profile.username} avatar`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl font-bold text-gold">{profile.username?.[0]?.toUpperCase()}</div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="font-display text-5xl text-gold">{profile.username}</h1>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-white/5 p-3 text-center">
                  <p className="font-display text-3xl text-gold">{profile.stats.watched}</p>
                  <p className="text-xs text-mist/60">Watched</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3 text-center">
                  <p className="font-display text-3xl text-gold">{profile.stats.reviews}</p>
                  <p className="text-xs text-mist/60">Reviews</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3 text-center">
                  <p className="font-display text-3xl text-gold">{profile.stats.watchlist}</p>
                  <p className="text-xs text-mist/60">Watchlist</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3 text-center">
                  <p className="font-display text-3xl text-gold">{stars(profile.stats.avgRating)}</p>
                  <p className="text-xs text-mist/60">Avg Rating</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-mist/80">{profile.bio || "No bio yet."}</p>
              </div>

              <div className="mt-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-mist/65">Favorite Genres</h2>
                <p className="mt-1 text-sm text-mist/80">
                  {profile.favoriteGenres?.length ? profile.favoriteGenres.join(" | ") : "No favorite genres selected yet."}
                </p>
              </div>
            </div>
          </div>

          {isOwnProfile && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <h2 className="text-lg font-semibold text-mist">Edit Profile</h2>
              <div className="mt-3 grid gap-5 lg:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-mist/70">Bio</label>
                  <textarea value={bioInput} onChange={(e) => setBioInput(e.target.value)} rows={3} className="w-full rounded-xl border border-white/15 bg-[#102032] px-3 py-2 outline-none focus:border-gold/50" />
                  <button onClick={onSaveBio} className="mt-2 rounded-lg bg-ember px-4 py-2 text-sm text-white">
                    Save Bio
                  </button>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-mist/70">Change Photo</label>
                  <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} className="block w-full text-sm text-mist/80" />
                  <button onClick={onUploadAvatar} className="mt-2 rounded-lg bg-ember px-4 py-2 text-sm text-white">
                    Upload Photo
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-sm text-mist/70">Favorite Genres</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {GENRE_OPTIONS.map((genre) => {
                    const checked = selectedGenres.includes(genre);
                    return (
                      <label key={genre} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-mist/85">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGenres((prev) => [...new Set([...prev, genre])]);
                            } else {
                              setSelectedGenres((prev) => prev.filter((g) => g !== genre));
                            }
                          }}
                        />
                        {genre}
                      </label>
                    );
                  })}
                </div>
                <button onClick={onSaveFavorites} className="mt-3 rounded-lg bg-ember px-4 py-2 text-sm text-white">
                  Save Favorite Genres
                </button>
              </div>
            </div>
          )}

          {message && <p className="mt-4 text-sm text-gold">{message}</p>}
        </div>

        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold text-mist">Watched Movies</h2>
          <MovieGrid items={watched} emptyText="No watched movies yet." />
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold text-mist">Reviews</h2>
          {reviews.length ? (
            <div className="space-y-3">
              {reviews.map((item, index) => (
                <Link key={`${item.movieId}-${index}`} href={`/movie/${item.movieId}`} className="block rounded-xl bg-white/5 p-4 transition hover:bg-white/10">
                  <p className="text-base font-semibold text-gold">{item.movieTitle} {stars(item.rating)}</p>
                  <p className="mt-1 text-sm text-mist/80">{item.review}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-mist/55">No reviews yet.</p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold text-mist">Ratings History</h2>
          {ratings.length ? (
            <div className="space-y-2">
              {ratings.map((item, index) => (
                <Link key={`${item.movieId}-${index}`} href={`/movie/${item.movieId}`} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 transition hover:bg-white/10">
                  <p className="text-sm text-mist">{item.movie}</p>
                  <p className="text-sm text-gold">{stars(item.rating)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-mist/55">No ratings yet.</p>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-mist">Watchlist</h2>
          </div>

          {watchlist.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {watchlist.map((item) => (
                <div key={item.movieId} className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                  <Link href={`/movie/${item.movieId}`}>
                    <div className="aspect-[2/3] bg-[#172638]">
                      {item.poster ? (
                        <img src={toMediaUrl(item.poster)} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center px-3 text-center text-xs text-mist/50">{item.title}</div>
                      )}
                    </div>
                  </Link>
                  {isOwnProfile && (
                    <div className="grid gap-1 p-2">
                      <button onClick={() => onRemoveFromWatchlist(item.movieId)} className="rounded-md border border-red-400/40 px-2 py-1 text-xs text-red-300">
                        Remove
                      </button>
                      <button onClick={() => onMarkWatched(item.movieId)} className="rounded-md border border-emerald-400/40 px-2 py-1 text-xs text-emerald-300">
                        Mark as watched
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-mist/55">Watchlist is empty.</p>
          )}
        </section>
      </section>
    </main>
  );
}
