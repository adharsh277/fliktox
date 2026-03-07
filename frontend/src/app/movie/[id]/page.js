"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import NavBar from "../../../components/NavBar";
import { api } from "../../../lib/api";

function fallbackPoster(movie) {
  const id = Number(movie?.id || 0);
  const title = String(movie?.title || "Movie");
  const hue = (id * 37) % 360;
  const bg1 = `hsl(${hue}, 45%, 28%)`;
  const bg2 = `hsl(${(hue + 55) % 360}, 52%, 16%)`;

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='750' viewBox='0 0 500 750'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='${bg1}'/>
        <stop offset='100%' stop-color='${bg2}'/>
      </linearGradient>
    </defs>
    <rect width='500' height='750' fill='url(#g)'/>
    <rect x='24' y='24' width='452' height='702' rx='18' fill='none' stroke='rgba(255,255,255,0.2)' stroke-width='4'/>
    <text x='250' y='330' fill='white' font-family='Inter, sans-serif' font-size='28' text-anchor='middle'>FLIKTOX</text>
    <text x='250' y='380' fill='rgba(255,255,255,0.82)' font-family='Inter, sans-serif' font-size='22' text-anchor='middle'>${title.replace(/&/g, "and")}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function MoviePage() {
  const params = useParams();
  const movieId = useMemo(() => Number(params.id), [params.id]);
  const [movie, setMovie] = useState(null);
  const [summary, setSummary] = useState({ averageRating: 0, totalRatings: 0 });
  const [form, setForm] = useState({ rating: 5, review: "", watched: true, watchlist: false });
  const [status, setStatus] = useState("");

  const releaseYear = movie?.release_date ? String(movie.release_date).slice(0, 4) : "-";

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
                  <img
                    src={fallbackPoster(movie)}
                    alt={movie.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div>
                <h1 className="font-display text-6xl tracking-wide text-gold">{movie.title}</h1>
                <p className="mt-2 text-sm text-mist/75">
                  Fliktox Rating: {summary.averageRating} ({summary.totalRatings} ratings)
                </p>
                <p className="mt-1 text-sm text-mist/75">TMDB Rating: {movie.vote_average?.toFixed?.(1) || movie.vote_average || "-"}</p>
                <div className="mt-3 grid gap-2 text-sm text-mist/80 md:grid-cols-2">
                  <p><span className="text-mist">Year:</span> {releaseYear}</p>
                  <p><span className="text-mist">Runtime:</span> {movie.runtime || "-"} min</p>
                  <p className="md:col-span-2">
                    <span className="text-mist">Genres:</span>{" "}
                    {(movie.genres || []).map((genre) => genre.name).join(" • ") || "-"}
                  </p>
                  <p><span className="text-mist">Director:</span> {movie.director?.name || "-"}</p>
                  <p><span className="text-mist">Producer:</span> {movie.producer?.name || "-"}</p>
                </div>
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

            <section className="mt-8">
              <h2 className="font-display text-4xl tracking-wide text-gold">Top Cast</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {(movie.cast || []).slice(0, 9).map((member) => (
                  <div key={member.id} className="card-surface rounded-xl p-3">
                    <p className="font-medium text-mist">{member.name}</p>
                    <p className="text-sm text-mist/75">{member.character || "Cast"}</p>
                  </div>
                ))}
                {!(movie.cast || []).length ? (
                  <p className="text-sm text-mist/75">Cast information unavailable.</p>
                ) : null}
              </div>
            </section>
          </>
        ) : (
          <div className="text-mist/75">Loading movie...</div>
        )}
      </section>
    </main>
  );
}
