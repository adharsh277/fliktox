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
    JOIN users u ON u.id = a.user_id
    WHERE (
      a.user_id = $1
      OR a.user_id IN (
        SELECT friend_id FROM friends WHERE user_id = $1 AND status = 'accepted'
      )
    )
    ORDER BY a.created_at DESC
    LIMIT 50
    `,
    [req.user.id]
  );

  return res.json(rows);
});
