"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setSession } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api.login({ email, password });
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
        <h1 className="font-display text-5xl text-gold">Welcome Back</h1>
        <p className="text-sm text-mist/80">Login to continue your watchlist streak.</p>

        <div className="mt-5 grid gap-3">
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember" />
          <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember" />
        </div>

        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

        <button type="submit" disabled={loading} className="mt-5 w-full rounded-xl bg-ember px-4 py-3 text-white disabled:opacity-60">
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="mt-4 text-sm text-mist/80">
          New to Fliktox? <Link href="/signup" className="text-gold">Create account</Link>
        </p>
      </form>
    </main>
  );
}
