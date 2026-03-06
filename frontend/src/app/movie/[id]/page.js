"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import NavBar from "../../../components/NavBar";
import { api } from "../../../lib/api";

export default function MoviePage() {
  const params = useParams();
  const movieId = useMemo(() => Number(params.id), [params.id]);
  const [movie, setMovie] = useState(null);
  const [summary, setSummary] = useState({ averageRating: 0, totalRatings: 0 });
  const [form, setForm] = useState({ rating: 5, review: "", watched: true, watchlist: false });
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!movieId) return;

    Promise.all([api.movie(movieId), api.movieSummary(movieId)])
      .then(([movieData, summaryData]) => {
        setMovie(movieData);
        setSummary(summaryData);
      })
      .catch(() => setMovie(null));
  }, [movieId]);

  async function onRate(e) {
    e.preventDefault();
    setStatus("");

    try {
      await api.rateMovie(movieId, { ...form, rating: Number(form.rating) });
      const newSummary = await api.movieSummary(movieId);
      setSummary(newSummary);
      setStatus("Saved rating and review.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
        {movie ? (
          <>
            <div className="grid gap-6 md:grid-cols-[300px_1fr]">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                {movie.poster_url ? (
                  <img src={movie.poster_url} alt={movie.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="aspect-[2/3] grid place-items-center text-mist/70">No poster</div>
                )}
              </div>
              <div>
                <h1 className="font-display text-6xl tracking-wide text-gold">{movie.title}</h1>
                <p className="mt-2 text-sm text-mist/75">Average Rating: {summary.averageRating} ({summary.totalRatings} ratings)</p>
                <p className="mt-4 text-mist/85">{movie.overview || "Synopsis unavailable."}</p>

                <form onSubmit={onRate} className="card-surface mt-6 rounded-2xl p-4">
                  <h2 className="text-lg font-semibold text-mist">Rate / Review</h2>
                  <div className="mt-3 grid gap-3">
                    <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="rounded-xl border border-white/20 bg-[#102032] px-3 py-2 outline-none focus:border-ember">
                      <option value={1}>1 - Terrible</option>
                      <option value={2}>2 - Bad</option>
                      <option value={3}>3 - Ok</option>
                      <option value={4}>4 - Good</option>
                      <option value={5}>5 - Masterpiece</option>
                    </select>
                    <textarea value={form.review} onChange={(e) => setForm({ ...form, review: e.target.value })} placeholder="Write your review..." rows={4} className="rounded-xl border border-white/20 bg-[#102032] px-3 py-2 outline-none focus:border-ember" />
                    <label className="flex items-center gap-2 text-sm text-mist/80"><input type="checkbox" checked={form.watched} onChange={(e) => setForm({ ...form, watched: e.target.checked })} /> Mark as watched</label>
                    <label className="flex items-center gap-2 text-sm text-mist/80"><input type="checkbox" checked={form.watchlist} onChange={(e) => setForm({ ...form, watchlist: e.target.checked })} /> Add to watchlist</label>
                    <button type="submit" className="rounded-xl bg-ember px-4 py-2 text-white">Save</button>
                  </div>
                  {status ? <p className="mt-3 text-sm text-gold">{status}</p> : null}
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="text-mist/75">Loading movie...</div>
        )}
      </section>
    </main>
  );
}
