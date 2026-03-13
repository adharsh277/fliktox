import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const friendsRouter = Router();

friendsRouter.use(requireAuth);

async function sendFriendRequest(senderId, receiverId) {
  const receiver = await pool.query(`SELECT id FROM users WHERE id = $1`, [receiverId]);
  if (!receiver.rows[0]) {
    return { status: 404, error: "Receiver not found" };
  }

  if (receiverId === senderId) {
    return { status: 400, error: "You cannot send a friend request to yourself" };
  }

  const alreadyFriends = await pool.query(
    `SELECT 1 FROM users WHERE id = $1 AND $2 = ANY(friends)`,
    [senderId, receiverId]
  );
  if (alreadyFriends.rows[0]) {
    return { status: 409, error: "You are already friends" };
  }

  const existing = await pool.query(
    `
    SELECT id, sender_id, receiver_id
    FROM friend_requests
    WHERE status = 'pending'
      AND (
        (sender_id = $1 AND receiver_id = $2)
        OR
        (sender_id = $2 AND receiver_id = $1)
      )
    LIMIT 1
    `,
    [senderId, receiverId]
  );

  if (existing.rows[0]) {
    if (existing.rows[0].sender_id === senderId) {
      return { status: 409, error: "Friend request already sent" };
    }
    return { status: 409, error: "This user already sent you a friend request" };
  }

  const created = await pool.query(
    `
    INSERT INTO friend_requests (sender_id, receiver_id, status)
    VALUES ($1, $2, 'pending')
    RETURNING id, sender_id, receiver_id, status, created_at
    `,
    [senderId, receiverId]
  );

  // Keep legacy table in sync so old joins still work.
  await pool.query(
    `
    INSERT INTO friends (user_id, friend_id, status)
    VALUES ($1, $2, 'pending')
    ON CONFLICT (user_id, friend_id)
    DO UPDATE SET status = EXCLUDED.status
    `,
    [senderId, receiverId]
  );

  return { status: 201, data: created.rows[0] };
}

friendsRouter.post("/request", async (req, res) => {
  const senderId = req.user.id;
  const receiverId = Number(req.body?.receiverId);

  if (!receiverId) {
    return res.status(400).json({ error: "receiverId is required" });
  }

  try {
    const result = await sendFriendRequest(senderId, receiverId);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.status(201).json({ message: "Friend request sent", request: result.data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to send request" });
  }
});

// Legacy compatibility endpoint used by current dashboard UI.
friendsRouter.post("/request/:friendId", async (req, res) => {
  const senderId = req.user.id;
  const receiverId = Number(req.params.friendId);

  if (!receiverId) {
    return res.status(400).json({ error: "Invalid friend id" });
  }

  try {
    const result = await sendFriendRequest(senderId, receiverId);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.status(201).json({ ok: true, request: result.data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to send request" });
  }
});

async function acceptFriendRequestById(requestId, currentUserId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const requestRes = await client.query(
      `
      SELECT id, sender_id, receiver_id, status
      FROM friend_requests
      WHERE id = $1
      FOR UPDATE
      `,
      [requestId]
    );

    const request = requestRes.rows[0];
    if (!request || request.status !== "pending") {
      await client.query("ROLLBACK");
      return { status: 404, error: "Friend request not found" };
    }

    if (request.receiver_id !== currentUserId) {
      await client.query("ROLLBACK");
      return { status: 403, error: "Not allowed to accept this request" };
    }

    await client.query(
      `UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
      [requestId]
    );

    await client.query(
      `
      UPDATE users
      SET friends = CASE
        WHEN friends IS NULL THEN ARRAY[$2]::INTEGER[]
        WHEN array_position(friends, $2) IS NULL THEN array_append(friends, $2)
        ELSE friends
      END
      WHERE id = $1
      `,
      [request.sender_id, request.receiver_id]
    );

    await client.query(
      `
      UPDATE users
      SET friends = CASE
        WHEN friends IS NULL THEN ARRAY[$2]::INTEGER[]
        WHEN array_position(friends, $2) IS NULL THEN array_append(friends, $2)
        ELSE friends
      END
      WHERE id = $1
      `,
      [request.receiver_id, request.sender_id]
    );

    // Keep legacy table in sync for existing joins.
    await client.query(
      `
      INSERT INTO friends (user_id, friend_id, status)
      VALUES ($1, $2, 'accepted')
      ON CONFLICT (user_id, friend_id)
      DO UPDATE SET status = 'accepted'
      `,
      [request.sender_id, request.receiver_id]
    );
    await client.query(
      `
      INSERT INTO friends (user_id, friend_id, status)
      VALUES ($1, $2, 'accepted')
      ON CONFLICT (user_id, friend_id)
      DO UPDATE SET status = 'accepted'
      `,
      [request.receiver_id, request.sender_id]
    );

    await client.query("COMMIT");
    return {
      status: 200,
      data: {
        requestId: request.id,
        senderId: request.sender_id,
        receiverId: request.receiver_id,
        status: "accepted"
      }
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

friendsRouter.post("/accept/:requestId", async (req, res) => {
  const requestId = Number(req.params.requestId);
  if (!requestId) {
    return res.status(400).json({ error: "Invalid request id" });
  }

  try {
    const result = await acceptFriendRequestById(requestId, req.user.id);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.json({ message: "Friend request accepted", request: result.data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to accept request" });
  }
});

// Legacy compatibility endpoint: accepts by sender id.
friendsRouter.post("/accept-by-user/:friendId", async (req, res) => {
  const senderId = Number(req.params.friendId);
  if (!senderId) {
    return res.status(400).json({ error: "Invalid friend id" });
  }

  try {
    const pending = await pool.query(
      `
      SELECT id
      FROM friend_requests
      WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [senderId, req.user.id]
    );

    const requestId = pending.rows[0]?.id;
    if (!requestId) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    const result = await acceptFriendRequestById(requestId, req.user.id);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ ok: true, request: result.data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to accept request" });
  }
});

friendsRouter.get("/requests", async (req, res) => {
  const { rows } = await pool.query(
    `
    SELECT fr.id,
           fr.sender_id AS from_user_id,
           fr.sender_id,
           fr.receiver_id,
           fr.status,
           fr.created_at,
           u.username,
           u.profile_photo
    FROM friend_requests fr
    JOIN users u ON u.id = fr.sender_id
    WHERE fr.receiver_id = $1 AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
    `,
    [req.user.id]
  );

  return res.json(rows);
});

async function rejectFriendRequestById(requestId, currentUserId) {
  const { rows } = await pool.query(
    `
    UPDATE friend_requests
    SET status = 'rejected', updated_at = NOW()
    WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
    RETURNING id, sender_id, receiver_id
    `,
    [requestId, currentUserId]
  );

  if (!rows[0]) {
    return { status: 404, error: "Friend request not found" };
  }

  await pool.query(
    `DELETE FROM friends WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'`,
    [rows[0].sender_id, rows[0].receiver_id]
  );

  return { status: 200, data: rows[0] };
}

friendsRouter.post("/reject/:requestId", async (req, res) => {
  const requestId = Number(req.params.requestId);
  if (!requestId) {
    return res.status(400).json({ error: "Invalid request id" });
  }

  try {
    const result = await rejectFriendRequestById(requestId, req.user.id);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.json({ message: "Friend request rejected", request: result.data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to reject request" });
  }
});

// Legacy compatibility endpoint: reject by sender id.
friendsRouter.post("/reject-by-user/:friendId", async (req, res) => {
  const senderId = Number(req.params.friendId);
  if (!senderId) {
    return res.status(400).json({ error: "Invalid friend id" });
  }

  try {
    const pending = await pool.query(
      `
      SELECT id
      FROM friend_requests
      WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [senderId, req.user.id]
    );

    const requestId = pending.rows[0]?.id;
    if (!requestId) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    const result = await rejectFriendRequestById(requestId, req.user.id);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ ok: true, request: result.data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to reject request" });
  }
});

friendsRouter.get("/", async (req, res) => {
  const { rows } = await pool.query(
    `
    SELECT u.id,
           u.username,
           u.profile_photo,
           u.profile_photo AS avatar
    FROM users me
    JOIN users u ON u.id = ANY(COALESCE(me.friends, '{}'))
    WHERE me.id = $1
    ORDER BY u.username ASC
    `,
    [req.user.id]
  );

  return res.json(rows);
});

// Legacy compatibility endpoint.
friendsRouter.get("/list", async (req, res) => {
  const { rows } = await pool.query(
    `
    SELECT u.id,
           u.username,
           u.profile_photo,
           u.profile_photo AS avatar
    FROM users me
    JOIN users u ON u.id = ANY(COALESCE(me.friends, '{}'))
    WHERE me.id = $1
    ORDER BY u.username ASC
    `,
    [req.user.id]
  );
  return res.json(rows);
});

friendsRouter.delete("/:friendId", async (req, res) => {
  const userId = req.user.id;
  const friendId = Number(req.params.friendId);

  if (!friendId || friendId === userId) {
    return res.status(400).json({ error: "Invalid friend id" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE users SET friends = array_remove(COALESCE(friends, '{}'), $2) WHERE id = $1`,
      [userId, friendId]
    );
    await client.query(
      `UPDATE users SET friends = array_remove(COALESCE(friends, '{}'), $2) WHERE id = $1`,
      [friendId, userId]
    );

    await client.query(
      `DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [userId, friendId]
    );

    await client.query(
      `
      UPDATE friend_requests
      SET status = 'rejected', updated_at = NOW()
      WHERE status = 'accepted'
        AND (
          (sender_id = $1 AND receiver_id = $2)
          OR
          (sender_id = $2 AND receiver_id = $1)
        )
      `,
      [userId, friendId]
    );

    await client.query("COMMIT");
    return res.json({ message: "Friend removed" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "Failed to remove friend" });
  } finally {
    client.release();
  }
});

friendsRouter.get("/status/:userId", async (req, res) => {
  const currentUserId = req.user.id;
  const targetUserId = Number(req.params.userId);

  if (!targetUserId || targetUserId === currentUserId) {
    return res.json({ status: "self" });
  }

  const isFriend = await pool.query(
    `SELECT 1 FROM users WHERE id = $1 AND $2 = ANY(friends)`,
    [currentUserId, targetUserId]
  );

  if (isFriend.rows[0]) {
    return res.json({ status: "friends" });
  }

  const outgoing = await pool.query(
    `
    SELECT id
    FROM friend_requests
    WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [currentUserId, targetUserId]
  );
  if (outgoing.rows[0]) {
    return res.json({ status: "request_sent", requestId: outgoing.rows[0].id });
  }

  const incoming = await pool.query(
    `
    SELECT id
    FROM friend_requests
    WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [targetUserId, currentUserId]
  );

  if (incoming.rows[0]) {
    return res.json({ status: "request_received", requestId: incoming.rows[0].id });
  }

  return res.json({ status: "none" });
});
