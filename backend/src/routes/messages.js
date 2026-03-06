import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const messagesRouter = Router();
messagesRouter.use(requireAuth);

messagesRouter.get("/:friendId", async (req, res) => {
  const userId = req.user.id;
  const friendId = Number(req.params.friendId);

  const { rows } = await pool.query(
    `
    SELECT id, sender_id, receiver_id, message, created_at
    FROM messages
    WHERE (sender_id = $1 AND receiver_id = $2)
       OR (sender_id = $2 AND receiver_id = $1)
    ORDER BY created_at ASC
    LIMIT 100
    `,
    [userId, friendId]
  );

  return res.json(rows);
});

messagesRouter.post("/:friendId", async (req, res) => {
  const userId = req.user.id;
  const friendId = Number(req.params.friendId);
  const message = String(req.body.message || "").trim();

  if (!message) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  const { rows } = await pool.query(
    `
    INSERT INTO messages (sender_id, receiver_id, message)
    VALUES ($1, $2, $3)
    RETURNING id, sender_id, receiver_id, message, created_at
    `,
    [userId, friendId, message]
  );

  return res.status(201).json(rows[0]);
});
