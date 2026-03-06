"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setSession } from "../../lib/api";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    profilePhoto: "",
    favoriteGenres: "Action, Drama"
  });

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        ...form,
        favoriteGenres: form.favoriteGenres
          .split(",")
          .map((genre) => genre.trim())
          .filter(Boolean)
      };

      const data = await api.signup(payload);
      setSession(data.token, data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-4xl place-items-center px-4 py-10">
      <form onSubmit={onSubmit} className="card-surface w-full rounded-2xl p-6 md:p-8">
        <h1 className="font-display text-5xl text-gold">Create Account</h1>
        <p className="text-sm text-mist/80">Start tracking your movie journey.</p>

        <div className="mt-5 grid gap-3">
          <input required placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember" />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember" />
          <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember" />
          <input placeholder="Profile Photo URL" value={form.profilePhoto} onChange={(e) => setForm({ ...form, profilePhoto: e.target.value })} className="rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember" />
          <input placeholder="Favorite Genres (comma separated)" value={form.favoriteGenres} onChange={(e) => setForm({ ...form, favoriteGenres: e.target.value })} className="rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember" />
        </div>

        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

        <button type="submit" disabled={loading} className="mt-5 w-full rounded-xl bg-ember px-4 py-3 text-white disabled:opacity-60">
          {loading ? "Creating..." : "Sign Up"}
        </button>

        <p className="mt-4 text-sm text-mist/80">
          Already have an account? <Link href="/login" className="text-gold">Login</Link>
        </p>
      </form>
    </main>
  );
}
