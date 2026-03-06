"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "../../components/NavBar";
import ActivityFeed from "../../components/ActivityFeed";
import MoviePosterGrid from "../../components/MoviePosterGrid";
import ChatPanel from "../../components/ChatPanel";
import { api, getCurrentUser } from "../../lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [feed, setFeed] = useState([]);
  const [friends, setFriends] = useState([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }

    Promise.all([api.feed(), api.friendList(), api.trending()])
      .then(([feedRes, friendsRes, trendRes]) => {
        setFeed(feedRes);
        setFriends(friendsRes);
        setTrending(trendRes);
      })
      .catch(() => {
        setFeed([]);
        setFriends([]);
      });
  }, [router]);

  async function onSearch(e) {
    e.preventDefault();
    if (!search.trim()) {
      setResults([]);
      return;
    }

    const movies = await api.searchMovies(search.trim());
    setResults(movies.slice(0, 10));
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 md:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h1 className="font-display text-5xl tracking-wide text-gold">Home Dashboard</h1>
          <p className="mt-1 text-sm text-mist/75">Friends activity, movie search, and live chat.</p>

          <h2 className="mt-6 text-lg font-semibold text-mist">Activity Feed</h2>
          <div className="mt-3">
            <ActivityFeed items={feed} />
          </div>

          <form onSubmit={onSearch} className="mt-6 flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search movies..."
              className="w-full rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember"
            />
            <button type="submit" className="rounded-xl bg-ember px-5 py-3 text-white">
              Search
            </button>
          </form>

          <div className="mt-4">
            <MoviePosterGrid movies={results.length ? results : trending.slice(0, 5)} />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-mist">Friend Chat</h2>
          <p className="mb-3 text-sm text-mist/75">Private chat with accepted friends.</p>
          <ChatPanel friends={friends} />
        </div>
      </section>
    </main>
  );
}
