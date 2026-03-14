"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavBar from "../../../components/NavBar";
import { api, getCurrentUser } from "../../../lib/api";
import { getSocket } from "../../../lib/socket";

function toAvatar(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
  const origin = apiBase.startsWith("http") ? apiBase.replace(/\/api\/?$/, "") : "";
  return origin && url.startsWith("/") ? `${origin}${url}` : url;
}

export default function FriendRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRequests() {
    const rows = await api.friendRequests();
    setRequests(Array.isArray(rows) ? rows : []);
  }

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/login");
      return;
    }

    loadRequests()
      .catch((err) => setError(err.message || "Failed to load requests"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      return undefined;
    }

    function onFriendRequest() {
      loadRequests().catch(() => {});
    }

    socket.on("friend:request", onFriendRequest);

    return () => {
      socket.off("friend:request", onFriendRequest);
    };
  }, []);

  async function onAccept(requestId) {
    try {
      await api.acceptRequest(requestId);
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      setError(err.message || "Failed to accept request");
    }
  }

  async function onReject(requestId) {
    try {
      await api.rejectRequest(requestId);
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      setError(err.message || "Failed to reject request");
    }
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-5xl text-gold">Friend Requests</h1>
          <Link href="/friends" className="rounded-lg border border-white/20 px-4 py-2 text-sm text-mist/80 hover:bg-white/5">
            View Friends
          </Link>
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
              <p className="mt-3 text-sm text-mist/60">Loading requests...</p>
            </div>
          </div>
        ) : error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : requests.length === 0 ? (
          <div className="card-surface rounded-2xl p-6">
            <p className="text-sm text-mist/70">No pending friend requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="card-surface flex items-center justify-between rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  {req.profile_photo ? (
                    <img src={toAvatar(req.profile_photo)} alt={req.username} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ember/30 text-sm font-bold text-gold">
                      {req.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-mist">{req.username}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onAccept(req.id)} className="rounded-lg bg-ember px-3 py-1 text-xs text-white">
                    Accept
                  </button>
                  <button onClick={() => onReject(req.id)} className="rounded-lg border border-white/20 px-3 py-1 text-xs text-mist/70 hover:bg-white/5">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
