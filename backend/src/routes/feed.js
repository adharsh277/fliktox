import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const feedRouter = Router();
feedRouter.use(requireAuth);

feedRouter.get("/friends", async (req, res) => {
  const { rows } = await pool.query(
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
    LIMIT 100
    `,
    [req.user.id]
  );

  return res.json(rows);
});

feedRouter.get("/activity", async (req, res) => {
  const { rows } = await pool.query(
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
    LIMIT 50
    `,
    [req.user.id]
  );

  return res.json(rows);
});
