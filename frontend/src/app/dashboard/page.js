"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "../../components/NavBar";
import ActivityFeed from "../../components/ActivityFeed";
import MoviePosterGrid from "../../components/MoviePosterGrid";
import ChatPanel from "../../components/ChatPanel";
import { api, getCurrentUser } from "../../lib/api";
import { getSocket } from "../../lib/socket";

export default function DashboardPage() {
  const router = useRouter();
  const [feed, setFeed] = useState([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
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

  async function refreshDashboardData() {
    const [feedRes, friendsRes, trendRes, requestsRes] = await Promise.all([
      api.friendsFeed(1, 20),
      api.friendList(),
      api.trending(),
      api.friendRequests()
    ]);
    setFeed(feedRes?.items || []);
    setFeedPage(1);
    setFeedHasMore(Boolean(feedRes?.pagination?.hasMore));
    setFriends(friendsRes);
    setTrending(trendRes);
    setFriendRequests(Array.isArray(requestsRes) ? requestsRes : []);
  }

  async function onLoadMoreFeed() {
    if (feedLoadingMore || !feedHasMore) {
      return;
    }

    const nextPage = feedPage + 1;
    setFeedLoadingMore(true);
    try {
      const response = await api.friendsFeed(nextPage, 20);
      const nextItems = Array.isArray(response?.items) ? response.items : [];
      setFeed((prev) => [...prev, ...nextItems]);
      setFeedPage(nextPage);
      setFeedHasMore(Boolean(response?.pagination?.hasMore));
    } catch {
      // Keep existing feed when pagination request fails.
    } finally {
      setFeedLoadingMore(false);
    }
  }

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }

    refreshDashboardData()
      .catch(() => {
        setFeed([]);
        setFriends([]);
      })
      .finally(() => setLoading(false));

    const intervalId = setInterval(() => {
      refreshDashboardData().catch(() => {});
    }, 15000);

    return () => clearInterval(intervalId);
  }, [router]);

  // Live feed updates via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    socketRef.current = socket;

    socket.on("feed:newActivity", (item) => {
      setFeed((prev) => [item, ...prev]);
    });

    socket.on("feed:newRating", (item) => {
      setFeed((prev) => [item, ...prev]);
    });

    socket.on("connect_error", () => {
      // Keep UI active even if socket transport fails in forwarded/dev environments.
      refreshDashboardData().catch(() => {});
    });

    return () => {
      socket.off("feed:newActivity");
      socket.off("feed:newRating");
      socket.off("connect_error");
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

  async function onAccept(requestId) {
    try {
      await api.acceptRequest(requestId);
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
      const updated = await api.friendList();
      setFriends(updated);
    } catch {}
  }

  async function onReject(requestId) {
    try {
      await api.rejectRequest(requestId);
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
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

          <h2 className="mt-6 text-lg font-semibold text-mist">Friends Activity</h2>
          <div className="mt-3">
            <ActivityFeed
              items={feed}
              hasMore={feedHasMore}
              loadingMore={feedLoadingMore}
              onLoadMore={onLoadMoreFeed}
            />
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
                  <div key={r.id} className="card-surface flex items-center justify-between rounded-xl px-4 py-3">
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
                        onClick={() => onAccept(r.id)}
                        className="rounded-lg bg-ember px-3 py-1 text-xs text-white"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(r.id)}
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
