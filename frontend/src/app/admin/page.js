"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "../../components/NavBar";
import { api, getCurrentUser } from "../../lib/api";

function StatCard({ label, value }) {
  return (
    <div className="card-surface rounded-xl p-4">
      <p className="text-xs uppercase tracking-wide text-mist/60">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-gold">{value}</p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [userQuery, setUserQuery] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const totalStatCards = useMemo(() => {
    return [
      { label: "Users", value: overview?.users ?? 0 },
      { label: "Banned Users", value: overview?.banned_users ?? 0 },
      { label: "New Users (7d)", value: overview?.new_users_7d ?? 0 },
      { label: "Active Users (7d)", value: overview?.active_users_7d ?? 0 },
      { label: "Feed Events (7d)", value: overview?.activity_events_7d ?? 0 },
      { label: "Total Activity Rows", value: overview?.reviews ?? 0 }
    ];
  }, [overview]);

  async function loadAll() {
    const [overviewRes, usersRes, reviewsRes] = await Promise.all([
      api.adminOverview(),
      api.adminUsers(userQuery, 30),
      api.adminReviews(reviewQuery, 40)
    ]);
    setOverview(overviewRes || {});
    setUsers(Array.isArray(usersRes) ? usersRes : []);
    setReviews(Array.isArray(reviewsRes) ? reviewsRes : []);
  }

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }

    loadAll()
      .catch((err) => {
        setError(err?.message || "Failed to load admin dashboard");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function onSearchUsers(event) {
    event.preventDefault();
    try {
      const rows = await api.adminUsers(userQuery, 30);
      setUsers(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err?.message || "Failed to search users");
    }
  }

  async function onSearchReviews(event) {
    event.preventDefault();
    try {
      const rows = await api.adminReviews(reviewQuery, 40);
      setReviews(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err?.message || "Failed to search reviews");
    }
  }

  async function onToggleBan(userId, ban) {
    try {
      await api.adminBanUser(userId, ban);
      const rows = await api.adminUsers(userQuery, 30);
      setUsers(Array.isArray(rows) ? rows : []);
      const summary = await api.adminOverview();
      setOverview(summary || {});
    } catch (err) {
      setError(err?.message || "Failed to update user status");
    }
  }

  async function onDeleteReview(reviewId) {
    try {
      await api.adminDeleteReview(reviewId);
      setReviews((prev) => prev.filter((row) => row.id !== reviewId));
    } catch (err) {
      setError(err?.message || "Failed to delete review");
    }
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <h1 className="font-display text-5xl tracking-wide text-gold">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-mist/75">Moderate users, manage abusive reviews, and track site activity.</p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-10 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {totalStatCards.map((card) => (
                <StatCard key={card.label} label={card.label} value={card.value} />
              ))}
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <section>
                <h2 className="text-xl font-semibold text-mist">View Users</h2>
                <form onSubmit={onSearchUsers} className="mt-3 flex gap-2">
                  <input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Search username or email"
                    className="w-full rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember"
                  />
                  <button type="submit" className="rounded-xl bg-ember px-4 py-3 text-white">
                    Search
                  </button>
                </form>
                <div className="mt-3 space-y-2">
                  {users.map((u) => (
                    <div key={u.id} className="card-surface flex items-center justify-between rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-mist">{u.username}</p>
                        <p className="text-xs text-mist/60">{u.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleBan(u.id, !u.is_banned)}
                        className={`rounded-full px-3 py-1 text-xs ${u.is_banned ? "border border-emerald-400/60 text-emerald-300" : "border border-red-400/60 text-red-300"}`}
                      >
                        {u.is_banned ? "Unban User" : "Ban User"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-mist">Delete Abusive Reviews</h2>
                <form onSubmit={onSearchReviews} className="mt-3 flex gap-2">
                  <input
                    value={reviewQuery}
                    onChange={(e) => setReviewQuery(e.target.value)}
                    placeholder="Search review text"
                    className="w-full rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember"
                  />
                  <button type="submit" className="rounded-xl bg-ember px-4 py-3 text-white">
                    Search
                  </button>
                </form>
                <div className="mt-3 space-y-2">
                  {reviews.map((review) => (
                    <div key={review.id} className="card-surface rounded-xl px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-mist/60">@{review.username} - movie #{review.tmdb_id}</p>
                          <p className="mt-1 text-sm text-mist">{review.review}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteReview(review.id)}
                          className="rounded-full border border-red-400/60 px-3 py-1 text-xs text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </section>
    </main>
  );
}