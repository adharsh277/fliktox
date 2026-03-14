"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavBar from "../../../components/NavBar";
import { api, getCurrentUser } from "../../../lib/api";

function toAvatar(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
  const origin = apiBase.startsWith("http") ? apiBase.replace(/\/api\/?$/, "") : "";
  return origin && url.startsWith("/") ? `${origin}${url}` : url;
}

export default function FriendSuggestionsPage() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState([]);
  const [sentIds, setSentIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSuggestions() {
    try {
      const rows = await api.friendSuggestions(30);
      setSuggestions(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || "Failed to load suggestions");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/login");
      return;
    }

    loadSuggestions();
  }, [router]);

  async function onSendRequest(userId) {
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
          <h1 className="font-display text-5xl text-gold">People You May Know</h1>
          <Link href="/friends" className="rounded-lg border border-white/20 px-4 py-2 text-sm text-mist/80 hover:bg-white/5">
            Back to Friends
          </Link>
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
              <p className="mt-3 text-sm text-mist/60">Loading suggestions...</p>
            </div>
          </div>
        ) : error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : suggestions.length === 0 ? (
          <div className="card-surface rounded-2xl p-6">
            <p className="text-sm text-mist/70">No suggestions right now. Add more friends to unlock more connections.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((user) => (
              <div key={user.id} className="card-surface flex items-center justify-between rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  {user.profile_photo ? (
                    <img src={toAvatar(user.profile_photo)} alt={user.username} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ember/30 text-sm font-bold text-gold">
                      {user.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <Link href={`/profile/${encodeURIComponent(user.username)}`} className="text-sm text-mist hover:text-gold">
                      {user.username}
                    </Link>
                    <p className="text-xs text-mist/55">{user.mutual_count} mutual friends</p>
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
        )}
      </section>
    </main>
  );
}
