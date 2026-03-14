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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/login");
      return;
    }

    api.friendList()
      .then((rows) => {
        setFriends(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        setError(err.message || "Failed to load friends");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

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
