import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const feedRouter = Router();
feedRouter.use(requireAuth);

function getPagination(query, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, Number(query.page) || 1);
  const requestedLimit = Number(query.limit) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, requestedLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

feedRouter.get("/friends", async (req, res) => {
  const { page, limit, offset } = getPagination(req.query, 20, 100);

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(
    `
    SELECT u.id AS user_id,
           u.username,
           u.profile_photo,
           a.action,
           a.tmdb_id,
           a.metadata,
           a.created_at
    FROM users me
    JOIN activity_feed a ON a.user_id = ANY(COALESCE(me.friends, '{}'))
    JOIN users u ON u.id = a.user_id
    WHERE me.id = $1
    ORDER BY a.created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [req.user.id, limit, offset]
    ),
    pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM users me
      JOIN activity_feed a ON a.user_id = ANY(COALESCE(me.friends, '{}'))
      WHERE me.id = $1
      `,
      [req.user.id]
    )
  ]);

  const total = countRows[0]?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return res.json({
    items: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages
    }
  });
});

feedRouter.get("/activity", async (req, res) => {
  const { page, limit, offset } = getPagination(req.query, 20, 100);

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(
    `
    SELECT u.username,
           a.action,
           a.tmdb_id,
           a.metadata,
           a.created_at
    FROM activity_feed a
    JOIN users u ON u.id = a.user_id
    WHERE (
      a.user_id = $1
      OR a.user_id IN (
        SELECT UNNEST(COALESCE(friends, '{}'))
        FROM users
        WHERE id = $1
      )
    )
    ORDER BY a.created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [req.user.id, limit, offset]
    ),
    pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM activity_feed a
      WHERE (
        a.user_id = $1
        OR a.user_id IN (
          SELECT UNNEST(COALESCE(friends, '{}'))
          FROM users
          WHERE id = $1
        )
      )
      `,
      [req.user.id]
    )
  ]);

  const total = countRows[0]?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return res.json({
    items: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages
    }
  });
});
