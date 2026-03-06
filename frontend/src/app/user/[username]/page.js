"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import NavBar from "../../../components/NavBar";
import { api, getCurrentUser } from "../../../lib/api";

export default function ProfilePage() {
  const params = useParams();
  const [user, setUser] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) return;

    setUser(current);
    api.profileRatings(current.id).then(setRatings).catch(() => setRatings([]));
    api.friendRequests().then(setRequests).catch(() => setRequests([]));
  }, [params.username]);

  async function onAccept(id) {
    await api.acceptRequest(id);
    const next = await api.friendRequests();
    setRequests(next);
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <h1 className="font-display text-5xl tracking-wide text-gold">
          {user ? `@${user.username}` : "Profile"}
        </h1>
        <p className="mt-1 text-sm text-mist/75">Watched movies, ratings, reviews, and friendships.</p>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="card-surface rounded-2xl p-4">
            <h2 className="text-lg font-semibold text-mist">Recent Ratings</h2>
            <div className="mt-3 space-y-3">
              {ratings.slice(0, 12).map((item, idx) => (
                <div key={`${item.tmdb_id}-${idx}`} className="rounded-xl bg-white/5 p-3">
                  <p className="text-sm text-gold">Movie #{item.tmdb_id}</p>
                  <p className="text-sm text-mist">{"★".repeat(item.rating)}</p>
                  {item.review ? <p className="mt-1 text-sm text-mist/80">{item.review}</p> : null}
                </div>
              ))}
              {!ratings.length ? <p className="text-sm text-mist/75">No ratings yet.</p> : null}
            </div>
          </div>

          <div className="card-surface rounded-2xl p-4">
            <h2 className="text-lg font-semibold text-mist">Friend Requests</h2>
            <div className="mt-3 space-y-3">
              {requests.map((req) => (
                <div key={req.from_user_id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                  <p className="text-sm text-mist">{req.username}</p>
                  <button onClick={() => onAccept(req.from_user_id)} className="rounded-lg bg-ember px-3 py-1 text-sm text-white">
                    Accept
                  </button>
                </div>
              ))}
              {!requests.length ? <p className="text-sm text-mist/75">No pending requests.</p> : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
