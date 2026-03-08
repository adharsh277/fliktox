"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

const fallbackPosters = [
  "qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  "6agKYU5IQFpuDyUYPu39w7UCRrJ.jpg",
  "nMkByUotTgQJpXX25J7pwWqR4Ww.jpg",
  "gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  "udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
  "9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
  "f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
  "rSPw7tgCH9c6NqICZef4kZjFOQ5.jpg",
  "q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
  "5KCVkau1HEl7ZzfPsKAPM0sMiKc.jpg"
].map((path) => `${TMDB_IMG}/${path}`);

const defaultSocialFeed = [
  { user: "Rahul", action: "rated Interstellar", score: "★★★★★", poster: fallbackPosters[3] },
  { user: "Maya", action: "added Parasite to Watchlist", score: "", poster: fallbackPosters[7] },
  { user: "Arjun", action: "reviewed Dune", score: "★★★★☆", poster: fallbackPosters[1] }
];

const community = [
  { title: "Top Reviewers", value: "12.4K" },
  { title: "Most Active Members", value: "8.1K" },
  { title: "Trending Lists", value: "3.3K" }
];

function uniqueMovies(source, existing) {
  const seen = new Set(existing.map((movie) => movie.id));
  return source.filter((movie) => !seen.has(movie.id));
}

function posterFor(movie, index) {
  if (movie.poster_url) return movie.poster_url;
  if (movie.poster_path) return `${TMDB_IMG}${movie.poster_path}`;

  // Keep fallback posters deterministic but varied across rows and movies.
  const seeded = Math.abs(Number(movie.id || 0) + index * 17);
  return fallbackPosters[seeded % fallbackPosters.length];
}

function handlePosterError(event) {
  event.currentTarget.src = "/images/movie-placeholder.svg";
}

function CarouselRow({ title, movies }) {
  const scrollRef = useRef(null);

  function scrollRow(direction) {
    if (!scrollRef.current) return;
    const amount = direction === "next" ? 420 : -420;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  }

  const titleOffset = title.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-3xl tracking-wide text-white">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollRow("prev")}
            className="rounded-full border border-white/30 bg-white/5 px-3 py-1 text-xs hover:bg-white/10"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => scrollRow("next")}
            className="rounded-full border border-white/30 bg-white/5 px-3 py-1 text-xs hover:bg-white/10"
          >
            Next
          </button>
          <Link href="/discover" className="ml-1 text-sm text-[#ffb800]">Browse all</Link>
        </div>
      </div>
      <div ref={scrollRef} className="hide-scrollbar flex gap-4 overflow-x-auto pb-2">
        {movies.map((movie, idx) => (
          <Link
            key={`${title}-${movie.id}-${idx}`}
            href={`/movie/${movie.id}`}
            className="group relative w-36 shrink-0 overflow-hidden rounded-2xl border border-white/15"
          >
            <img
              src={posterFor(movie, idx + titleOffset)}
              alt={movie.title}
              onError={handlePosterError}
              className="aspect-[2/3] w-full object-cover transition duration-300 group-hover:scale-105"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [friendsWatching, setFriendsWatching] = useState([]);
  const [seen, setSeen] = useState({});
  const [liveFeed, setLiveFeed] = useState([]);
  const { scrollYProgress } = useScroll();
  const ySlow = useTransform(scrollYProgress, [0, 1], ["0%", "-25%"]);
  const blur = useTransform(scrollYProgress, [0, 1], ["0px", "6px"]);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/movies/trending`, { cache: "no-store" }).then((res) =>
        res.ok ? res.json() : []
      ),
      fetch(`${API}/movies/popular?page=1`, { cache: "no-store" }).then((res) =>
        res.ok ? res.json() : []
      ),
      fetch(`${API}/movies/top-rated?page=1`, { cache: "no-store" }).then((res) =>
        res.ok ? res.json() : []
      ),
      fetch(`${API}/movies/discover?page=1`, { cache: "no-store" }).then((res) =>
        res.ok ? res.json() : []
      )
    ])
      .then(([trendingRes, popularRes, topRatedRes, discoverRes]) => {
        setTrending(Array.isArray(trendingRes) ? trendingRes : []);
        setPopular(Array.isArray(popularRes) ? popularRes : []);
        setTopRated(Array.isArray(topRatedRes) ? topRatedRes : []);
        setFriendsWatching(Array.isArray(discoverRes) ? discoverRes : []);
      })
      .catch(() => {
        setTrending([]);
        setPopular([]);
        setTopRated([]);
        setFriendsWatching([]);
      });

    // Try to load real activity feed if user is logged in
    const token = typeof window !== "undefined" ? localStorage.getItem("fliktox_token") : null;
    if (token) {
      fetch(`${API}/feed/activity`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.ok ? res.json() : [])
        .then((data) => { if (Array.isArray(data) && data.length) setLiveFeed(data.slice(0, 5)); })
        .catch(() => {});
    }
  }, []);

  const heroLoop = useMemo(() => {
    const source = trending.length ? trending : fallbackPosters.map((url, idx) => ({ id: idx + 8000, title: `Movie ${idx + 1}`, poster_url: url }));
    return [...source, ...source, ...source].slice(0, 18);
  }, [trending]);

  const discoveryRows = useMemo(() => {
    const trendList = trending.length
      ? trending
      : fallbackPosters.map((url, idx) => ({ id: idx + 9100, title: `Movie ${idx + 1}`, poster_url: url }));

    const loggedSource = popular.length
      ? popular
      : fallbackPosters.map((url, idx) => ({ id: idx + 9200, title: `Movie ${idx + 1}`, poster_url: url }));
    const loggedList = uniqueMovies(loggedSource, trendList).length
      ? uniqueMovies(loggedSource, trendList)
      : loggedSource;

    const topSource = topRated.length
      ? topRated
      : fallbackPosters.map((url, idx) => ({ id: idx + 9300, title: `Movie ${idx + 1}`, poster_url: url }));
    const topList = uniqueMovies(topSource, [...trendList, ...loggedList]).length
      ? uniqueMovies(topSource, [...trendList, ...loggedList])
      : topSource;

    const friendsSource = friendsWatching.length
      ? friendsWatching
      : fallbackPosters.map((url, idx) => ({ id: idx + 9400, title: `Movie ${idx + 1}`, poster_url: url }));
    const friendsList = uniqueMovies(friendsSource, [...trendList, ...loggedList, ...topList]).length
      ? uniqueMovies(friendsSource, [...trendList, ...loggedList, ...topList])
      : friendsSource;

    return {
      trending: trendList,
      logged: loggedList,
      topRated: topList,
      friends: friendsList
    };
  }, [trending, popular, topRated, friendsWatching]);

  return (
    <main className="bg-[#0b0f19] text-white">
      <section className="relative min-h-screen overflow-hidden">
        <motion.div style={{ y: ySlow, filter: blur }} className="absolute inset-0 grid grid-cols-3 gap-2 p-2 md:grid-cols-6 md:gap-3 md:p-4">
          {heroLoop.map((movie, idx) => (
            <img
              key={`${movie.id}-${idx}`}
              src={posterFor(movie, idx)}
              alt={movie.title || "movie poster"}
              onError={handlePosterError}
              className="h-full w-full rounded-lg object-cover opacity-70"
            />
          ))}
        </motion.div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.28)_44%,rgba(0,0,0,0.9)_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 text-center md:px-6">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-7xl tracking-wide text-[#ffb800] md:text-9xl">
            FLIKTOX
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-2 text-2xl font-semibold md:text-4xl">
            Track • Rate • Share Movies
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.24 }} className="mt-5 max-w-2xl text-sm text-[#d1d5db] md:text-lg">
            The social network for people who live for cinema. Log films, rate masterpieces, argue with friends.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="rounded-full bg-[#ffb800] px-6 py-3 font-semibold text-[#111827]">Start Watching</Link>
            <Link href="/discover" className="rounded-full border border-white/40 bg-white/5 px-6 py-3 font-semibold">Explore Movies</Link>
          </motion.div>
          <p className="mt-4 text-sm text-[#9ca3af]">Join thousands of film fans.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 pt-14 md:px-6">
        <h2 className="font-display text-4xl tracking-wide text-[#ffb800] md:text-5xl">Poster Wall</h2>
        <p className="mt-1 text-[#9ca3af]">Rate, mark watched, and queue watchlist directly from the wall.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {(trending.length ? trending : heroLoop).slice(0, 12).map((movie, idx) => (
            <Link key={`wall-${movie.id}-${idx}`} href={`/movie/${movie.id}`} className="group relative overflow-hidden rounded-xl border border-white/10">
              <img
                src={posterFor(movie, idx)}
                alt={movie.title || "poster"}
                onError={handlePosterError}
                className="aspect-[2/3] w-full object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex flex-col justify-end gap-2 bg-gradient-to-t from-black/85 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                <span className="rounded-md bg-white/10 px-3 py-1 text-left text-sm">⭐ Rate</span>
                <span className="rounded-md bg-white/10 px-3 py-1 text-left text-sm">👁 Mark watched</span>
                <span className="rounded-md bg-white/10 px-3 py-1 text-left text-sm">➕ Add watchlist</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                <p className="text-xs text-white/80 line-clamp-1">{movie.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="glass-card rounded-3xl p-5 md:p-7">
          <h2 className="font-display text-4xl tracking-wide text-[#ffb800] md:text-5xl">Tell Us What You've Seen</h2>
          <p className="mt-2 text-[#9ca3af]">Start by marking a few films you watched. We'll build your movie profile instantly.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {(trending.length ? trending : heroLoop).slice(0, 12).map((movie, idx) => {
              const key = String(movie.id);
              const active = !!seen[key];
              return (
                <button
                  key={`seen-${movie.id}-${idx}`}
                  type="button"
                  onClick={() => setSeen((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className={`group relative overflow-hidden rounded-xl border ${active ? "border-[#ffb800]" : "border-white/10"}`}
                >
                  <img
                    src={posterFor(movie, idx)}
                    alt={movie.title || "poster"}
                    onError={handlePosterError}
                    className="aspect-[2/3] w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/75 to-transparent p-2 text-xs">
                    <span>👁 Watched</span>
                    <span>⭐ Rate</span>
                    <span>❤ Like</span>
                  </div>
                  {active ? <div className="absolute right-2 top-2 rounded-full bg-[#ffb800] px-2 py-1 text-xs font-semibold text-black">Saved</div> : null}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <h2 className="font-display text-4xl tracking-wide text-[#ffb800] md:text-5xl">Social Activity</h2>
        <div className="mt-5 space-y-3">
          {liveFeed.length > 0 ? liveFeed.map((item, idx) => (
            <div key={`live-${item.tmdb_id}-${idx}`} className="glass-card flex items-center gap-3 rounded-2xl p-3 md:p-4">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#ff4c4c] font-semibold">{(item.username || "?")[0].toUpperCase()}</div>
              <div className="flex-1">
                <p className="text-sm md:text-base">
                  <span className="font-semibold">{item.username}</span>
                  {item.watched ? " watched" : " rated"} Movie #{item.tmdb_id}
                  {item.rating ? <span className="text-[#ffb800]"> {"★".repeat(item.rating)}</span> : null}
                </p>
                {item.review && <p className="mt-1 text-xs text-[#9ca3af]">{item.review}</p>}
              </div>
            </div>
          )) : defaultSocialFeed.map((item) => (
            <div key={`${item.user}-${item.action}`} className="glass-card flex items-center gap-3 rounded-2xl p-3 md:p-4">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#ff4c4c] font-semibold">{item.user[0]}</div>
              <div className="flex-1">
                <p className="text-sm md:text-base"><span className="font-semibold">{item.user}</span> {item.action} <span className="text-[#ffb800]">{item.score}</span></p>
              </div>
              <img src={item.poster} alt={item.action} className="h-14 w-10 rounded object-cover" />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <h2 className="font-display text-4xl tracking-wide text-[#ffb800] md:text-5xl">Movie Discovery</h2>
        <CarouselRow title="Trending this week" movies={discoveryRows.trending} />
        <CarouselRow title="Most logged films" movies={discoveryRows.logged} />
        <CarouselRow title="Highest rated" movies={discoveryRows.topRated} />
        <CarouselRow title="Friends watching" movies={discoveryRows.friends} />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <h2 className="font-display text-4xl tracking-wide text-[#ffb800] md:text-5xl">Community</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {community.map((item) => (
            <div key={item.title} className="glass-card rounded-2xl p-5">
              <p className="text-sm text-[#9ca3af]">{item.title}</p>
              <p className="mt-1 font-display text-4xl tracking-wide text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 md:px-6">
        <div className="glass-card rounded-3xl border border-[#ffb800]/40 p-6 md:p-9">
          <p className="font-display text-4xl tracking-wide text-[#ffb800]">Your cinema taste will look like this</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/5 p-4">Top genres</div>
            <div className="rounded-xl bg-white/5 p-4">Most watched actors</div>
            <div className="rounded-xl bg-white/5 p-4">Favorite decades</div>
          </div>
        </div>
      </section>
    </main>
  );
}
