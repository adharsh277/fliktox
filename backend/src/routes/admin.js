import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/overview", async (_, res) => {
  const [totalsRes, activityRes] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)::int AS users,
         SUM(CASE WHEN is_banned = TRUE THEN 1 ELSE 0 END)::int AS banned_users,
         SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END)::int AS new_users_7d
       FROM users`
    ),
    pool.query(
      `SELECT
         COUNT(*)::int AS reviews,
         SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END)::int AS activity_events_7d,
         COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN user_id END)::int AS active_users_7d
       FROM activity_feed`
    )
  ]);

  return res.json({
    ...(totalsRes.rows[0] || {}),
    ...(activityRes.rows[0] || {})
  });
});

adminRouter.get("/users", async (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));

  const { rows } = await pool.query(
    `SELECT id, username, email, is_banned, created_at
     FROM users
     WHERE ($1 = '' OR LOWER(username) LIKE '%' || $1 || '%' OR LOWER(email) LIKE '%' || $1 || '%')
     ORDER BY created_at DESC
     LIMIT $2`,
    [q, limit]
  );

  return res.json(rows);
});

adminRouter.patch("/users/:userId/ban", async (req, res) => {
  const userId = Number(req.params.userId);
  const ban = Boolean(req.body?.ban);

  if (!userId) {
    return res.status(400).json({ error: "Valid user id is required" });
  }

  if (Number(req.user?.id) === userId) {
    return res.status(400).json({ error: "You cannot ban your own account" });
  }

  const { rows } = await pool.query(
    `UPDATE users
     SET is_banned = $1
     WHERE id = $2
     RETURNING id, username, email, is_banned, created_at`,
    [ban, userId]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json(rows[0]);
});

adminRouter.get("/reviews", async (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40));

  const { rows } = await pool.query(
    `SELECT r.id, r.user_id, r.tmdb_id, r.rating, r.review, r.updated_at,
            u.username, u.email
     FROM ratings r
     JOIN users u ON u.id = r.user_id
     WHERE r.review IS NOT NULL
       AND r.review != ''
       AND ($1 = '' OR LOWER(r.review) LIKE '%' || $1 || '%' OR LOWER(u.username) LIKE '%' || $1 || '%')
     ORDER BY r.updated_at DESC
     LIMIT $2`,
    [q, limit]
  );

  return res.json(rows);
});

adminRouter.delete("/reviews/:ratingId", async (req, res) => {
  const ratingId = Number(req.params.ratingId);
  if (!ratingId) {
    return res.status(400).json({ error: "Valid review id is required" });
  }

  const { rows } = await pool.query(
    `UPDATE ratings
     SET review = NULL, updated_at = NOW()
     WHERE id = $1
     RETURNING id, user_id, tmdb_id`,
    [ratingId]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: "Review not found" });
  }

  return res.json({ ok: true, reviewId: ratingId });
});