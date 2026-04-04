"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "../../components/NavBar";
import { api, getCurrentUser } from "../../lib/api";

export default function ClubsPage() {
  const router = useRouter();
  const [clubs, setClubs] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadClubs() {
    const rows = await api.myClubs();
    setClubs(Array.isArray(rows) ? rows : []);
  }

  useEffect(() => {
    if (!getCurrentUser()) {
      router.push("/login");
      return;
    }

    loadClubs()
      .catch((err) => setError(err?.message || "Failed to load clubs"))
      .finally(() => setLoading(false));
  }, [router]);

  async function onCreate(event) {
    event.preventDefault();
    setError("");
    try {
      if (!name.trim()) {
        setError("Club name is required");
        return;
      }

      const created = await api.createClub({
        name: name.trim(),
        description: description.trim()
      });

      setName("");
      setDescription("");
      router.push(`/clubs/${created.id}`);
    } catch (err) {
      setError(err?.message || "Failed to create club");
    }
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
        <h1 className="font-display text-5xl tracking-wide text-gold">Movie Clubs</h1>
        <p className="mt-1 text-sm text-mist/75">Create or join communities for movie discussions.</p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <form onSubmit={onCreate} className="mt-6 card-surface rounded-xl p-4 space-y-3">
          <h2 className="text-lg font-semibold text-mist">Create Club</h2>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Club name"
            className="w-full rounded-lg border border-white/20 bg-[#102032] px-4 py-2 outline-none focus:border-gold"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this club about?"
            rows={3}
            className="w-full rounded-lg border border-white/20 bg-[#102032] px-4 py-2 outline-none focus:border-gold"
          />
          <button type="submit" className="rounded-lg bg-ember px-4 py-2 text-sm text-white">Create</button>
        </form>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-mist">My Clubs</h2>
          {loading ? (
            <p className="mt-3 text-sm text-mist/60">Loading clubs...</p>
          ) : clubs.length ? (
            <div className="mt-3 space-y-3">
              {clubs.map((club) => (
                <Link key={club.id} href={`/clubs/${club.id}`} className="card-surface block rounded-xl p-4 transition hover:border-gold/40">
                  <p className="font-semibold text-mist">{club.name}</p>
                  <p className="text-xs text-mist/60">Role: {club.role} · Members: {club.members_count}</p>
                  {club.description ? <p className="mt-1 text-sm text-mist/70">{club.description}</p> : null}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-mist/60">You are not in any clubs yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}