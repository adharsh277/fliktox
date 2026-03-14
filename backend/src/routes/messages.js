import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { getIO } from "../socket/chatSocket.js";

export const messagesRouter = Router();
messagesRouter.use(requireAuth);

messagesRouter.get("/unread", async (req, res) => {
  const userId = req.user.id;

  const { rows } = await pool.query(
    `
    SELECT sender_id,
           COUNT(*)::int AS count
    FROM messages
    WHERE receiver_id = $1
      AND seen = FALSE
    GROUP BY sender_id
    `,
    [userId]
  );

  const byFriend = rows.reduce((acc, row) => {
    acc[row.sender_id] = row.count;
    return acc;
  }, {});

  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return res.json({ total, byFriend });
});

messagesRouter.post("/seen", async (req, res) => {
  const userId = req.user.id;
  const friendId = Number(req.body?.friendId);

  if (!friendId) {
    return res.status(400).json({ error: "friendId is required" });
  }

  const { rows } = await pool.query(
    `
    UPDATE messages
    SET seen = TRUE,
        seen_at = NOW()
    WHERE sender_id = $1
      AND receiver_id = $2
      AND seen = FALSE
    RETURNING id
    `,
    [friendId, userId]
  );

  const io = getIO();
  if (io && rows.length > 0) {
    io.to(`user:${friendId}`).emit("message:seen", {
      userId,
      friendId,
      messageIds: rows.map((row) => row.id)
    });
  }

  return res.json({ updated: rows.length });
});

messagesRouter.post("/:messageId/reactions", async (req, res) => {
  const userId = req.user.id;
  const messageId = Number(req.params.messageId);
  const reaction = String(req.body?.reaction || "").trim().slice(0, 16);

  if (!messageId || !reaction) {
    return res.status(400).json({ error: "messageId and reaction are required" });
  }

  const messageRes = await pool.query(
    `
    SELECT id, sender_id, receiver_id
    FROM messages
    WHERE id = $1
    `,
    [messageId]
  );

  const message = messageRes.rows[0];
  if (!message) {
    return res.status(404).json({ error: "Message not found" });
  }

  if (message.sender_id !== userId && message.receiver_id !== userId) {
    return res.status(403).json({ error: "Not allowed" });
  }

  await pool.query(
    `
    INSERT INTO message_reactions (message_id, user_id, reaction)
    VALUES ($1, $2, $3)
    ON CONFLICT (message_id, user_id)
    DO UPDATE SET reaction = EXCLUDED.reaction, updated_at = NOW()
    `,
    [messageId, userId, reaction]
  );

  const summaryRes = await pool.query(
    `
    SELECT reaction, COUNT(*)::int AS count
    FROM message_reactions
    WHERE message_id = $1
    GROUP BY reaction
    ORDER BY count DESC, reaction ASC
    `,
    [messageId]
  );

  const reactionCounts = summaryRes.rows.reduce((acc, row) => {
    acc[row.reaction] = row.count;
    return acc;
  }, {});

  const io = getIO();
  if (io) {
    io.to(`user:${message.sender_id}`).emit("message:reaction", { messageId, reactionCounts });
    io.to(`user:${message.receiver_id}`).emit("message:reaction", { messageId, reactionCounts });
  }

  return res.json({ messageId, reactionCounts });
});

messagesRouter.delete("/:messageId/reactions", async (req, res) => {
  const userId = req.user.id;
  const messageId = Number(req.params.messageId);

  if (!messageId) {
    return res.status(400).json({ error: "Invalid message id" });
  }

  const { rows: messageRows } = await pool.query(
    `SELECT id, sender_id, receiver_id FROM messages WHERE id = $1`,
    [messageId]
  );
  const message = messageRows[0];
  if (!message) {
    return res.status(404).json({ error: "Message not found" });
  }

  if (message.sender_id !== userId && message.receiver_id !== userId) {
    return res.status(403).json({ error: "Not allowed" });
  }

  await pool.query(
    `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2`,
    [messageId, userId]
  );

  const summaryRes = await pool.query(
    `
    SELECT reaction, COUNT(*)::int AS count
    FROM message_reactions
    WHERE message_id = $1
    GROUP BY reaction
    ORDER BY count DESC, reaction ASC
    `,
    [messageId]
  );

  const reactionCounts = summaryRes.rows.reduce((acc, row) => {
    acc[row.reaction] = row.count;
    return acc;
  }, {});

  const io = getIO();
  if (io) {
    io.to(`user:${message.sender_id}`).emit("message:reaction", { messageId, reactionCounts });
    io.to(`user:${message.receiver_id}`).emit("message:reaction", { messageId, reactionCounts });
  }

  return res.json({ messageId, reactionCounts });
});

messagesRouter.get("/:friendId", async (req, res) => {
  const userId = req.user.id;
  const friendId = Number(req.params.friendId);
  const cursor = req.query.cursor ? new Date(String(req.query.cursor)) : null;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));

  if (!friendId) {
    return res.status(400).json({ error: "Invalid friend id" });
  }

  const params = [userId, friendId, limit];
  let cursorFilter = "";
  if (cursor && !Number.isNaN(cursor.getTime())) {
    params.push(cursor.toISOString());
    cursorFilter = ` AND created_at < $${params.length}`;
  }

  const { rows } = await pool.query(
    `
    SELECT id,
           sender_id,
           receiver_id,
           message,
           message_type,
           movie_id,
           movie_title,
           movie_poster,
           seen,
           seen_at,
           created_at
    FROM messages
    WHERE (
      (sender_id = $1 AND receiver_id = $2)
      OR
      (sender_id = $2 AND receiver_id = $1)
    )
    ${cursorFilter}
    ORDER BY created_at DESC
    LIMIT $3
    `,
    params
  );

  const ordered = [...rows].reverse();
  const nextCursor = rows.length === limit ? rows[rows.length - 1].created_at : null;

  const messageIds = ordered.map((row) => row.id);
  const reactionCountsByMessage = {};

  if (messageIds.length > 0) {
    const reactionRows = await pool.query(
      `
      SELECT message_id, reaction, COUNT(*)::int AS count
      FROM message_reactions
      WHERE message_id = ANY($1::int[])
      GROUP BY message_id, reaction
      `,
      [messageIds]
    );

    for (const row of reactionRows.rows) {
      if (!reactionCountsByMessage[row.message_id]) {
        reactionCountsByMessage[row.message_id] = {};
      }
      reactionCountsByMessage[row.message_id][row.reaction] = row.count;
    }
  }

  const messages = ordered.map((row) => ({
    ...row,
    reaction_counts: reactionCountsByMessage[row.id] || {}
  }));

  return res.json({
    messages,
    nextCursor
  });
});

messagesRouter.post("/:friendId", async (req, res) => {
  const userId = req.user.id;
  const friendId = Number(req.params.friendId);
  const type = String(req.body?.type || "text").trim();
  const message = String(req.body?.message || "").trim();
  const movieId = req.body?.movieId ? Number(req.body.movieId) : null;
  const movieTitle = req.body?.movieTitle ? String(req.body.movieTitle).trim() : null;
  const moviePoster = req.body?.moviePoster ? String(req.body.moviePoster).trim() : null;

  if (!friendId) {
    return res.status(400).json({ error: "Invalid friend id" });
  }

  const isMovieMessage = type === "movie";
  if (!isMovieMessage && !message) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  if (isMovieMessage && !movieId) {
    return res.status(400).json({ error: "movieId is required for movie messages" });
  }

  const { rows } = await pool.query(
    `
    INSERT INTO messages (
      sender_id,
      receiver_id,
      message,
      message_type,
      movie_id,
      movie_title,
      movie_poster
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id,
              sender_id,
              receiver_id,
              message,
              message_type,
              movie_id,
              movie_title,
              movie_poster,
              seen,
              seen_at,
              created_at
    `,
    [
      userId,
      friendId,
      isMovieMessage ? message || "Shared a movie" : message,
      isMovieMessage ? "movie" : "text",
      isMovieMessage ? movieId : null,
      isMovieMessage ? movieTitle : null,
      isMovieMessage ? moviePoster : null
    ]
  );

  const msg = {
    ...rows[0],
    reaction_counts: {}
  };

  const io = getIO();
  if (io) {
    io.to(`user:${friendId}`).emit("private:message", msg);
    io.to(`user:${friendId}`).emit("chat:notification", {
      fromUserId: userId,
      fromUsername: req.user.username,
      message: isMovieMessage ? "shared a movie" : msg.message,
      type: msg.message_type
    });
  }

  return res.status(201).json(msg);
});
