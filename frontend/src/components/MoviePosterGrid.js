import Link from "next/link";

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

export default function MoviePosterGrid({ movies = [] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {movies.map((movie) => (
        <Link
          href={`/movie/${movie.id}`}
          key={movie.id}
          className="group overflow-hidden rounded-xl border border-white/10 bg-black/30 shadow-poster transition-transform hover:-translate-y-1"
        >
          <div className="aspect-[2/3] overflow-hidden bg-[#172638]">
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <img
                src={fallbackPoster(movie)}
                alt="No poster available"
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="px-3 py-2">
            <p className="line-clamp-1 text-sm font-medium text-mist">{movie.title}</p>
            <p className="text-xs text-mist/70">TMDB #{movie.id}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
