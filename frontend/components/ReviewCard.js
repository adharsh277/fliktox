export default function ReviewCard({ review }){
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{review.user?.name || 'User'}</div>
          <div className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleString()}</div>
        </div>
        <div className="text-xl font-bold">{review.rating}/10</div>
      </div>
      {review.text ? <p className="mt-3 text-gray-700">{review.text}</p> : null}
    </div>
  );
}
