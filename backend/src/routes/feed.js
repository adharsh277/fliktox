import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const feedRouter = Router();
feedRouter.use(requireAuth);

feedRouter.get("/activity", async (req, res) => {
  const { rows } = await pool.query(
    `
    SELECT u.username,
           a.action,
           a.tmdb_id,
           a.metadata,
           a.created_at
    FROM activity_feed a
    JOIN friends f ON f.friend_id = a.user_id
    JOIN users u ON u.id = a.user_id
    WHERE f.user_id = $1
      AND f.status = 'accepted'
    ORDER BY a.created_at DESC
    LIMIT 50
    `,
    [req.user.id]
  );

  return res.json(rows);
});
