import Link from "next/link";

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
              <div className="flex h-full items-center justify-center px-3 text-center text-sm text-mist/70">
                No poster
              </div>
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
