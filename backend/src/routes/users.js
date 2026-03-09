import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) {
    return res.json([]);
  }

  const { rows } = await pool.query(
    `SELECT id, username, profile_photo
     FROM users
     WHERE username ILIKE $1 AND id != $2
     ORDER BY username ASC
     LIMIT 10`,
    [`%${q}%`, req.user.id]
  );

  return res.json(rows);
});
