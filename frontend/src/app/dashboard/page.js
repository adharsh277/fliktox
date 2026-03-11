"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import NavBar from "../../components/NavBar";
import ActivityFeed from "../../components/ActivityFeed";
import MoviePosterGrid from "../../components/MoviePosterGrid";
import ChatPanel from "../../components/ChatPanel";
import { api, getCurrentUser } from "../../lib/api";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export default function DashboardPage() {
  const router = useRouter();
  const [feed, setFeed] = useState([]);
  const [friends, setFriends] = useState([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const socketRef = useRef(null);

  // Find Friends state
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userSearched, setUserSearched] = useState(false);
  const [sentIds, setSentIds] = useState(new Set());
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }

    Promise.all([api.feed(), api.friendList(), api.trending(), api.friendRequests()])
      .then(([feedRes, friendsRes, trendRes, requestsRes]) => {
        setFeed(feedRes);
        setFriends(friendsRes);
        setTrending(trendRes);
        setFriendRequests(Array.isArray(requestsRes) ? requestsRes : []);
      })
      .catch(() => {
        setFeed([]);
        setFriends([]);
      })
      .finally(() => setLoading(false));
  }, [router]);

  // Live feed updates via socket
  useEffect(() => {
    const token = localStorage.getItem("fliktox_token");
    if (!token) return undefined;

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    socket.on("feed:newRating", (item) => {
      setFeed((prev) => [item, ...prev]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  async function onSearch(e) {
    e.preventDefault();
    if (!search.trim()) {
      setResults([]);
      return;
    }

    const movies = await api.searchMovies(search.trim());
    setResults(movies.slice(0, 10));
  }

  async function onSearchUsers(e) {
    e.preventDefault();
    if (!userQuery.trim()) {
      setUserResults([]);
      setUserSearched(false);
      return;
    }
    try {
      const users = await api.searchUsers(userQuery.trim());
      setUserResults(users);
      setUserSearched(true);
    } catch {
      setUserResults([]);
      setUserSearched(true);
    }
  }

  async function onSendRequest(userId) {
    try {
      await api.sendRequest(userId);
      setSentIds((prev) => new Set([...prev, userId]));
    } catch {}
  }

  async function onAccept(fromUserId) {
    try {
      await api.acceptRequest(fromUserId);
      setFriendRequests((prev) => prev.filter((r) => r.from_user_id !== fromUserId));
      const updated = await api.friendList();
      setFriends(updated);
    } catch {}
  }

  async function onReject(fromUserId) {
    try {
      await api.rejectRequest(fromUserId);
      setFriendRequests((prev) => prev.filter((r) => r.from_user_id !== fromUserId));
    } catch {}
  }

  return (
    <main>
      <NavBar />
      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <p className="mt-3 text-sm text-mist/60">Loading dashboard...</p>
          </div>
        </div>
      ) : (
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 md:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h1 className="font-display text-5xl tracking-wide text-gold">Home Dashboard</h1>
          <p className="mt-1 text-sm text-mist/75">Friends activity, movie search, and live chat.</p>

          <h2 className="mt-6 text-lg font-semibold text-mist">Activity Feed</h2>
          <div className="mt-3">
            <ActivityFeed items={feed} />
          </div>

          <form onSubmit={onSearch} className="mt-6 flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search movies..."
              className="w-full rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember"
            />
            <button type="submit" className="rounded-xl bg-ember px-5 py-3 text-white">
              Search
            </button>
          </form>

          <div className="mt-4">
            <MoviePosterGrid movies={results.length ? results : trending.slice(0, 5)} />
          </div>
        </div>

        <div>
          {/* ── Find Friends ── */}
          <h2 className="text-lg font-semibold text-mist">Find Friends</h2>
          <form onSubmit={onSearchUsers} className="mt-2 flex gap-2">
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search username..."
              className="w-full rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember"
            />
            <button type="submit" className="rounded-xl bg-ember px-5 py-3 text-white">
              Search
            </button>
          </form>
          {userSearched && userResults.length === 0 && (
            <p className="mt-3 text-sm text-mist/50">No users found. Try a different username.</p>
          )}
          {userResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {userResults.map((u) => {
                const alreadyFriend = friends.some((f) => f.id === u.id);
                const alreadySent = sentIds.has(u.id);
                return (
                  <div key={u.id} className="card-surface flex items-center justify-between rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.profile_photo ? (
                        <img src={u.profile_photo} alt={u.username} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ember/30 text-xs font-bold text-gold">
                          {u.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-mist">{u.username}</span>
                    </div>
                    {alreadyFriend ? (
                      <span className="text-xs text-mist/50">Already friends</span>
                    ) : alreadySent ? (
                      <span className="text-xs text-mist/50">Request Sent</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSendRequest(u.id)}
                        className="rounded-full border border-ember/50 px-3 py-1 text-xs text-ember hover:bg-ember/15"
                      >
                        Add Friend
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Friend Requests ── */}
          {friendRequests.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-mist">Friend Requests</h2>
              <div className="mt-2 space-y-2">
                {friendRequests.map((r) => (
                  <div key={r.from_user_id} className="card-surface flex items-center justify-between rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.profile_photo ? (
                        <img src={r.profile_photo} alt={r.username} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ember/30 text-xs font-bold text-gold">
                          {r.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-mist">{r.username}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onAccept(r.from_user_id)}
                        className="rounded-lg bg-ember px-3 py-1 text-xs text-white"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(r.from_user_id)}
                        className="rounded-lg border border-white/20 px-3 py-1 text-xs text-mist/70 hover:bg-white/5"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Friend Chat ── */}
          <h2 className="mt-6 text-lg font-semibold text-mist">Friend Chat</h2>
          <p className="mb-3 text-sm text-mist/75">Private chat with accepted friends.</p>
          <ChatPanel friends={friends} />
        </div>
      </section>
      )}
    </main>
  );
}
