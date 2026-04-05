"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavBar from "../../components/NavBar";
import { api, getCurrentUser } from "../../lib/api";

function toAvatar(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
  const origin = apiBase.startsWith("http") ? apiBase.replace(/\/api\/?$/, "") : "";
  return origin && url.startsWith("/") ? `${origin}${url}` : url;
}

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [sentIds, setSentIds] = useState(new Set());
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refreshFriends() {
    const rows = await api.friendList();
    setFriends(Array.isArray(rows) ? rows : []);
  }

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/login");
      return;
    }

    refreshFriends()
      .catch((err) => {
        setError(err.message || "Failed to load friends");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  async function onSearch(event) {
    event.preventDefault();
    setError("");

    const value = query.trim();
    if (!value) {
      setSearchResults([]);
      setSearched(false);
      return;
    }

    setSearching(true);
    try {
      const rows = await api.searchUsers(value);
      const friendIds = new Set((friends || []).map((friend) => friend.id));
      const filtered = (rows || []).filter((user) => !friendIds.has(user.id));
      setSearchResults(filtered);
      setSearched(true);
    } catch (err) {
      setError(err.message || "Failed to search users");
      setSearchResults([]);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }

  async function onSendRequest(userId) {
    setError("");
    try {
      await api.sendRequest(userId);
      setSentIds((prev) => new Set([...prev, userId]));
    } catch (err) {
      setError(err.message || "Failed to send request");
    }
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-5xl text-gold">Friends</h1>
          <div className="flex gap-2">
            <Link href="/friends/suggestions" className="rounded-lg border border-white/20 px-4 py-2 text-sm text-mist/80 hover:bg-white/5">
              Suggestions
            </Link>
            <Link href="/friends/requests" className="rounded-lg border border-white/20 px-4 py-2 text-sm text-mist/80 hover:bg-white/5">
              View Requests
            </Link>
          </div>
        </div>

        <div className="card-surface mb-6 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-mist">Add Friend</h2>
          <p className="mt-1 text-xs text-mist/60">Search by username or user ID.</p>

          <form onSubmit={onSearch} className="mt-3 flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter username or user ID"
              className="w-full rounded-lg border border-white/20 bg-[#102032] px-3 py-2 text-sm outline-none focus:border-ember"
            />
            <button type="submit" className="rounded-lg bg-ember px-4 py-2 text-sm text-white" disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          {searched && searchResults.length === 0 ? (
            <p className="mt-3 text-xs text-mist/60">No users found.</p>
          ) : null}

          {searchResults.length > 0 ? (
            <div className="mt-3 space-y-2">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                  <div className="flex items-center gap-3">
                    {user.profile_photo ? (
                      <img src={toAvatar(user.profile_photo)} alt={user.username} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ember/30 text-xs font-bold text-gold">
                        {user.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-mist">{user.username}</p>
                      <p className="text-[11px] text-mist/55">ID: {user.id}</p>
                    </div>
                  </div>

                  {sentIds.has(user.id) ? (
                    <span className="text-xs text-mist/55">Request sent</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSendRequest(user.id)}
                      className="rounded-lg bg-ember px-3 py-1 text-xs text-white"
                    >
                      Add Friend
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
              <p className="mt-3 text-sm text-mist/60">Loading friends...</p>
            </div>
          </div>
        ) : error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : friends.length === 0 ? (
          <div className="card-surface rounded-2xl p-6">
            <p className="text-sm text-mist/70">No friends yet. Visit profiles and send friend requests.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {friends.map((friend) => (
              <Link
                key={friend.id}
                href={`/profile/${encodeURIComponent(friend.username)}`}
                className="card-surface flex items-center gap-3 rounded-xl px-4 py-3 transition hover:bg-white/5"
              >
                {friend.profile_photo || friend.avatar ? (
                  <img
                    src={toAvatar(friend.profile_photo || friend.avatar)}
                    alt={friend.username}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ember/30 text-sm font-bold text-gold">
                    {friend.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-mist">{friend.username}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
