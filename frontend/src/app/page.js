import Link from "next/link";
import MoviePosterGrid from "../components/MoviePosterGrid";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";

async function getTrending() {
  try {
    const response = await fetch(`${API}/movies/trending`, { cache: "no-store" });
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const trending = await getTrending();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 md:px-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#10253a] to-[#06101a] p-7 md:p-12">
        <div className="absolute -left-8 -top-8 h-36 w-36 rounded-full bg-ember/25 blur-2xl" />
        <div className="absolute -bottom-10 right-0 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <p className="font-display text-6xl tracking-wide text-gold md:text-7xl">FLIKTOX</p>
          <h1 className="mt-2 text-3xl font-bold text-mist md:text-5xl">
            Track, rate and share movies with friends.
          </h1>
          <p className="mt-4 text-mist/80">
            A social movie app for logging films, dropping reviews, and chatting recommendations in real time.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-full bg-ember px-5 py-2 text-white">
              Sign Up
            </Link>
            <Link href="/login" className="rounded-full border border-mist/30 px-5 py-2 text-mist">
              Login
            </Link>
            <Link href="/discover" className="rounded-full bg-gold px-5 py-2 text-[#101214]">
              Explore Movies
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-4xl tracking-wide text-gold">Top 10 Trending Movies</h2>
          <Link href="/discover" className="text-sm text-ember hover:text-gold">
            View more
          </Link>
        </div>
        <MoviePosterGrid movies={trending.slice(0, 10)} />
      </section>
    </main>
  );
}
