import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const feedRouter = Router();
feedRouter.use(requireAuth);

feedRouter.get("/activity", async (req, res) => {
  const { rows } = await pool.query(
    `
    SELECT u.username,
           r.tmdb_id,
           r.rating,
           r.review,
           r.watched,
           r.updated_at
    FROM ratings r
    JOIN friends f ON f.friend_id = r.user_id
    JOIN users u ON u.id = r.user_id
    WHERE f.user_id = $1
      AND f.status = 'accepted'
    ORDER BY r.updated_at DESC
    LIMIT 50
    `,
    [req.user.id]
  );

  return res.json(rows);
});
