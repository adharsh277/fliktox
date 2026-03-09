import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const friendsRouter = Router();

friendsRouter.use(requireAuth);

friendsRouter.post("/request/:friendId", async (req, res) => {
  const userId = req.user.id;
  const friendId = Number(req.params.friendId);

  if (!friendId || friendId === userId) {
    return res.status(400).json({ error: "Invalid friend id" });
  }

  try {
    await pool.query(
      `INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, 'pending') ON CONFLICT DO NOTHING`,
      [userId, friendId]
    );

    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to send request" });
  }
});

friendsRouter.post("/accept/:friendId", async (req, res) => {
  const userId = req.user.id;
  const friendId = Number(req.params.friendId);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const update = await client.query(
      `
      UPDATE friends
      SET status = 'accepted'
      WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'
      RETURNING id
      `,
      [friendId, userId]
    );

    if (!update.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Friend request not found" });
    }

    await client.query(
      `INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, 'accepted') ON CONFLICT DO NOTHING`,
      [userId, friendId]
    );

    await client.query("COMMIT");
    return res.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "Failed to accept request" });
  } finally {
    client.release();
  }
});

friendsRouter.get("/requests", async (req, res) => {
  const { rows } = await pool.query(
    `
    SELECT f.user_id AS from_user_id, u.username, u.profile_photo, f.created_at
    FROM friends f
    JOIN users u ON u.id = f.user_id
    WHERE f.friend_id = $1 AND f.status = 'pending'
    ORDER BY f.created_at DESC
    `,
    [req.user.id]
  );

  return res.json(rows);
});

friendsRouter.post("/reject/:friendId", async (req, res) => {
  const userId = req.user.id;
  const friendId = Number(req.params.friendId);

  const { rowCount } = await pool.query(
    `DELETE FROM friends WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'`,
    [friendId, userId]
  );

  if (!rowCount) {
    return res.status(404).json({ error: "Friend request not found" });
  }

  return res.json({ ok: true });
});

friendsRouter.get("/list", async (req, res) => {
  const { rows } = await pool.query(
    `
    SELECT u.id, u.username, u.profile_photo
    FROM friends f
    JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = $1 AND f.status = 'accepted'
    ORDER BY u.username ASC
    `,
    [req.user.id]
  );

  return res.json(rows);
});
