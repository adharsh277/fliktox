export default function ActivityFeed({ items = [] }) {
  if (!items.length) {
    return (
      <div className="card-surface rounded-2xl p-4 text-sm text-mist/75">
        Your friends' activity will show up here after they rate or review movies.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={`${item.username}-${item.tmdb_id}-${idx}`} className="card-surface rounded-2xl p-4">
          <p className="text-sm text-mist">
            <span className="font-semibold text-gold">{item.username}</span> rated movie #{item.tmdb_id} {" "}
            <span className="text-ember">{"★".repeat(item.rating)}</span>
          </p>
          {item.review ? <p className="mt-2 text-sm text-mist/80">{item.review}</p> : null}
        </div>
      ))}
    </div>
  );
}
