"use client";

import { useState } from "react";
import Link from "next/link";

const INITIAL_COUNT = 4;

function actionLabel(item) {
  const action = item.action || "rated";
  const meta = item.metadata || {};
  const title = meta.movie_title || meta.title;
  const rating = meta.rating ?? item.rating;

  const movieLink = item.tmdb_id ? (
    <Link href={`/movie/${item.tmdb_id}`} className="text-mist hover:underline">
      {title || `movie #${item.tmdb_id}`}
    </Link>
  ) : (
    "a movie"
  );

  if (action === "rated" && rating) {
    return (
      <>
        rated {movieLink}{" "}
        <span className="text-ember">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>
      </>
    );
  }
  if (action === "reviewed") {
    return (
      <>
        reviewed {movieLink}{" "}
        {rating && <span className="text-ember">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>}
      </>
    );
  }
  if (action === "watchlist_add") return <>added {movieLink} to watchlist</>;
  if (action === "watched") return <>watched {movieLink}</>;
  return (
    <>
      {action} {movieLink}
    </>
  );
}

export default function ActivityFeed({ items = [] }) {
  const [expanded, setExpanded] = useState(false);

  if (!items.length) {
    return (
      <div className="card-surface rounded-2xl p-4 text-sm text-mist/75">
        Your friends' activity will show up here after they rate or review movies.
      </div>
    );
  }

  const visible = expanded ? items : items.slice(0, INITIAL_COUNT);

  return (
    <div className="space-y-3">
      {visible.map((item, idx) => (
        <div key={`${item.username}-${item.tmdb_id}-${idx}`} className="card-surface rounded-2xl p-4">
          <p className="text-sm text-mist">
            <span className="font-semibold text-gold">{item.username}</span>{" "}
            {actionLabel(item)}
          </p>
          {(item.review || item.metadata?.review) && (
            <p className="mt-2 text-sm italic text-mist/80">
              &ldquo;{item.review || item.metadata.review}&rdquo;
            </p>
          )}
          {item.created_at && (
            <p className="mt-1 text-xs text-mist/40">
              {new Date(item.created_at).toLocaleString()}
            </p>
          )}
        </div>
      ))}
      {items.length > INITIAL_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm text-mist/70 hover:bg-white/5"
        >
          {expanded ? "Show less" : `Show all (${items.length})`}
        </button>
      )}
    </div>
  );
}
