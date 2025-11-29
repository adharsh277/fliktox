import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from '../../lib/axios';
import MovieCard from '../../components/MovieCard';
import ReviewCard from '../../components/ReviewCard';

export default function MoviePage(){
  const router = useRouter();
  const { id } = router.query;
  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await axios.get(`/movies/${id}`);
        setMovie(res.data);
        const r = await axios.get(`/reviews/${id}`);
        setReviews(r.data || []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [id]);

  if (!movie) return <div>Loading...</div>;
  return (
    <div>
      <MovieCard movie={movie} large />
      <h3 className="mt-6 text-xl font-semibold">Reviews</h3>
      <div className="space-y-4 mt-4">
        {reviews.map(rv => <ReviewCard key={rv._id} review={rv} />)}
      </div>
    </div>
  );
}
