"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import NavBar from "../../../components/NavBar";
import { api, getCurrentUser } from "../../../lib/api";

export default function ClubDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [club, setClub] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const clubId = Number(params?.id);

  async function loadClub() {
    const data = await api.club(clubId);
    setClub(data);
  }

  useEffect(() => {
    if (!getCurrentUser()) {
      router.push("/login");
      return;
    }

    if (!clubId) {
      setError("Invalid club id");
      setLoading(false);
      return;
    }

    loadClub()
      .catch((err) => setError(err?.message || "Failed to load club"))
      .finally(() => setLoading(false));
  }, [router, clubId]);

  async function onJoin() {
    try {
      await api.joinClub(clubId);
      await loadClub();
    } catch (err) {
      setError(err?.message || "Failed to join club");
    }
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
        {error ? (
          <div className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-mist/60">Loading club...</p>
        ) : club ? (
          <>
            <h1 className="font-display text-5xl tracking-wide text-gold">{club.name}</h1>
            <p className="mt-1 text-sm text-mist/75">Owner: @{club.owner_username}</p>
            {club.description ? <p className="mt-4 text-mist/85">{club.description}</p> : null}

            <div className="mt-5">
              {club.is_member ? (
                <p className="inline-flex rounded-full border border-emerald-400/50 px-3 py-1 text-xs text-emerald-300">
                  You are a member ({club.my_role})
                </p>
              ) : (
                <button
                  type="button"
                  onClick={onJoin}
                  className="rounded-lg bg-ember px-4 py-2 text-sm text-white"
                >
                  Join Club
                </button>
              )}
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold text-mist">Members</h2>
              <div className="mt-3 space-y-2">
                {club.members?.map((member) => (
                  <div key={member.user_id} className="card-surface flex items-center justify-between rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      {member.profile_photo ? (
                        <img src={member.profile_photo} alt={member.username} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ember/30 text-xs font-bold text-gold">
                          {member.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-mist">@{member.username}</span>
                    </div>
                    <span className="text-xs text-mist/60">{member.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-mist/60">Club not found.</p>
        )}
      </section>
    </main>
  );
}