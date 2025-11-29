import React, { useEffect, useState } from 'react';
import { movies as mockMovies } from '../mock/movies';
import MovieCard from '../components/MovieCard';

export default function Home() {
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    // No backend — use mock data
    setMovies(mockMovies);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4 text-white">Latest</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {movies.map((m) => (
          <MovieCard key={m.id} movie={m} />
        ))}
      </div>
    </div>
  );
}
