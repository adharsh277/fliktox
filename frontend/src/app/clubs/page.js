"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "../../components/NavBar";
import { api, getCurrentUser } from "../../lib/api";

export default function ClubsPage() {
  const router = useRouter();
  const [clubs, setClubs] = useState([]);
  const [discover, setDiscover] = useState([]);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  async function loadClubs() {
    const [myRows, discoverRows] = await Promise.all([api.myClubs(), api.discoverClubs("", 16)]);
    setClubs(Array.isArray(myRows) ? myRows : []);
    setDiscover(Array.isArray(discoverRows) ? discoverRows : []);
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

  async function onSearchClubs(event) {
    event.preventDefault();
    setError("");
    setDiscoverLoading(true);
    try {
      const rows = await api.discoverClubs(discoverQuery.trim(), 16);
      setDiscover(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err?.message || "Failed to search clubs");
    } finally {
      setDiscoverLoading(false);
    }
  }

  async function onJoinClub(clubId) {
    setError("");
    try {
      await api.joinClub(clubId);
      await loadClubs();
      router.push(`/clubs/${clubId}`);
    } catch (err) {
      setError(err?.message || "Failed to join club");
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

        <div className="mt-6 card-surface rounded-xl p-4">
          <h2 className="text-lg font-semibold text-mist">Join Club</h2>
          <p className="mt-1 text-xs text-mist/65">Search clubs and join instantly.</p>

          <form onSubmit={onSearchClubs} className="mt-3 flex gap-2">
            <input
              value={discoverQuery}
              onChange={(event) => setDiscoverQuery(event.target.value)}
              placeholder="Search club name"
              className="w-full rounded-lg border border-white/20 bg-[#102032] px-4 py-2 outline-none focus:border-gold"
            />
            <button type="submit" className="rounded-lg border border-white/20 px-4 py-2 text-sm text-mist/80 hover:bg-white/5" disabled={discoverLoading}>
              {discoverLoading ? "Searching..." : "Search"}
            </button>
          </form>

          {discover.length ? (
            <div className="mt-3 space-y-2">
              {discover.map((club) => (
                <div key={club.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-mist">{club.name}</p>
                    <p className="text-xs text-mist/60">Owner: @{club.owner_username} · Members: {club.members_count}</p>
                    {club.description ? <p className="mt-1 text-xs text-mist/65">{club.description}</p> : null}
                  </div>

                  {club.is_member ? (
                    <Link href={`/clubs/${club.id}`} className="rounded-lg border border-gold/40 px-3 py-1 text-xs text-gold hover:bg-gold/10">
                      Open
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onJoinClub(club.id)}
                      className="rounded-lg bg-ember px-3 py-1 text-xs text-white"
                    >
                      Join
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-mist/60">No clubs found.</p>
          )}
        </div>

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