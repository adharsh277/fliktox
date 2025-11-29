import Link from 'next/link';

export default function MovieCard({ movie }) {
  return (
    <div className="bg-gray-900 p-4 rounded-lg shadow text-white">
      <Link href={`/movie/${movie.id}`}>
        <div>
          <h3 className="text-lg font-semibold">{movie.title}</h3>
          <p className="text-sm opacity-60">
            {movie.type} • {movie.genres?.join(', ')}
          </p>

          {movie.rating && (
            <p className="mt-2">Rating: {movie.rating}</p>
          )}

          <p className="mt-2 opacity-80">
            {movie.description.slice(0, 100)}...
          </p>
        </div>
      </Link>
    </div>
  );
}

