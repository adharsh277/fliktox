import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { getIO } from "../socket/chatSocket.js";

export const clubsRouter = Router();
clubsRouter.use(requireAuth);

async function getClubWithMembership(clubId, userId) {
  const { rows } = await pool.query(
    `SELECT c.id,
            c.name,
            c.owner_id,
            cm.role AS my_role
     FROM clubs c
     LEFT JOIN club_members cm
       ON cm.club_id = c.id
      AND cm.user_id = $2
     WHERE c.id = $1`,
    [clubId, userId]
  );

  return rows[0] || null;
}

clubsRouter.post("/", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const description = String(req.body?.description || "").trim();

  if (!name) {
    return res.status(400).json({ error: "Club name is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: clubRows } = await client.query(
      `INSERT INTO clubs (name, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, owner_id, created_at`,
      [name, description, req.user.id]
    );

    const club = clubRows[0];

    await client.query(
      `INSERT INTO club_members (user_id, club_id, role)
       VALUES ($1, $2, 'owner')`,
      [req.user.id, club.id]
    );

    await client.query("COMMIT");
    return res.status(201).json(club);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "Failed to create club" });
  } finally {
    client.release();
  }
});

clubsRouter.post("/:id/join", async (req, res) => {
  const clubId = Number(req.params.id);
  if (!clubId) {
    return res.status(400).json({ error: "Valid club id is required" });
  }

  const { rows: clubRows } = await pool.query(`SELECT id, name FROM clubs WHERE id = $1`, [clubId]);
  if (!clubRows[0]) {
    return res.status(404).json({ error: "Club not found" });
  }

  await pool.query(
    `INSERT INTO club_members (user_id, club_id, role)
     VALUES ($1, $2, 'member')
     ON CONFLICT (user_id, club_id) DO NOTHING`,
    [req.user.id, clubId]
  );

  return res.json({ ok: true, clubId });
});

clubsRouter.get("/mine", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.description, c.owner_id, cm.role, c.created_at,
            COUNT(all_members.id)::int AS members_count
     FROM club_members cm
     JOIN clubs c ON c.id = cm.club_id
     LEFT JOIN club_members all_members ON all_members.club_id = c.id
     WHERE cm.user_id = $1
     GROUP BY c.id, cm.role
     ORDER BY c.created_at DESC`,
    [req.user.id]
  );

  return res.json(rows);
});

clubsRouter.get("/discover", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 12));
  const hasQuery = Boolean(q);

  const { rows } = await pool.query(
    `SELECT c.id,
            c.name,
            c.description,
            c.owner_id,
            u.username AS owner_username,
            COUNT(all_members.id)::int AS members_count,
            BOOL_OR(my_membership.user_id IS NOT NULL) AS is_member
     FROM clubs c
     JOIN users u ON u.id = c.owner_id
     LEFT JOIN club_members all_members ON all_members.club_id = c.id
     LEFT JOIN club_members my_membership
       ON my_membership.club_id = c.id
      AND my_membership.user_id = $1
     WHERE ($2::boolean = FALSE OR c.name ILIKE $3)
     GROUP BY c.id, u.username
     ORDER BY c.created_at DESC
     LIMIT $4`,
    [req.user.id, hasQuery, `%${q}%`, limit]
  );

  return res.json(rows);
});

clubsRouter.get("/:id", async (req, res) => {
  const clubId = Number(req.params.id);
  if (!clubId) {
    return res.status(400).json({ error: "Valid club id is required" });
  }

  const { rows: clubRows } = await pool.query(
    `SELECT c.id, c.name, c.description, c.owner_id, c.created_at,
            u.username AS owner_username
     FROM clubs c
     JOIN users u ON u.id = c.owner_id
     WHERE c.id = $1`,
    [clubId]
  );

  const club = clubRows[0];
  if (!club) {
    return res.status(404).json({ error: "Club not found" });
  }

  const [membersRes, membershipRes] = await Promise.all([
    pool.query(
      `SELECT cm.user_id, cm.role, cm.joined_at, u.username, u.profile_photo
       FROM club_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.club_id = $1
       ORDER BY cm.joined_at ASC`,
      [clubId]
    ),
    pool.query(
      `SELECT role FROM club_members WHERE club_id = $1 AND user_id = $2`,
      [clubId, req.user.id]
    )
  ]);

  return res.json({
    ...club,
    is_member: Boolean(membershipRes.rows[0]),
    my_role: membershipRes.rows[0]?.role || null,
    members: membersRes.rows
  });
});

clubsRouter.post("/:id/members", async (req, res) => {
  const clubId = Number(req.params.id);
  const userId = Number(req.body?.userId);

  if (!clubId || !userId) {
    return res.status(400).json({ error: "Valid club id and userId are required" });
  }

  const club = await getClubWithMembership(clubId, req.user.id);
  if (!club) {
    return res.status(404).json({ error: "Club not found" });
  }

  if (club.owner_id !== req.user.id) {
    return res.status(403).json({ error: "Only the club owner can add members" });
  }

  if (userId === req.user.id) {
    return res.status(400).json({ error: "Owner is already a member" });
  }

  const { rows: userRows } = await pool.query(
    `SELECT id, username, profile_photo FROM users WHERE id = $1`,
    [userId]
  );

  if (!userRows[0]) {
    return res.status(404).json({ error: "User not found" });
  }

  const { rows } = await pool.query(
    `INSERT INTO club_members (user_id, club_id, role)
     VALUES ($1, $2, 'member')
     ON CONFLICT (user_id, club_id) DO NOTHING
     RETURNING user_id, role, joined_at`,
    [userId, clubId]
  );

  if (!rows[0]) {
    return res.status(409).json({ error: "User is already in this club" });
  }

  return res.status(201).json({
    user_id: rows[0].user_id,
    role: rows[0].role,
    joined_at: rows[0].joined_at,
    username: userRows[0].username,
    profile_photo: userRows[0].profile_photo
  });
});

clubsRouter.delete("/:id/members/:userId", async (req, res) => {
  const clubId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);

  if (!clubId || !targetUserId) {
    return res.status(400).json({ error: "Valid club id and user id are required" });
  }

  const club = await getClubWithMembership(clubId, req.user.id);
  if (!club) {
    return res.status(404).json({ error: "Club not found" });
  }

  if (club.owner_id !== req.user.id) {
    return res.status(403).json({ error: "Only the club owner can remove members" });
  }

  if (targetUserId === club.owner_id) {
    return res.status(400).json({ error: "Owner cannot be removed from the club" });
  }

  const { rows } = await pool.query(
    `DELETE FROM club_members
     WHERE club_id = $1 AND user_id = $2
     RETURNING user_id`,
    [clubId, targetUserId]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: "Member not found in this club" });
  }

  return res.json({ ok: true, removedUserId: targetUserId });
});

clubsRouter.get("/:id/messages", async (req, res) => {
  const clubId = Number(req.params.id);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

  if (!clubId) {
    return res.status(400).json({ error: "Valid club id is required" });
  }

  const club = await getClubWithMembership(clubId, req.user.id);
  if (!club) {
    return res.status(404).json({ error: "Club not found" });
  }

  if (!club.my_role) {
    return res.status(403).json({ error: "Only members can view club chat" });
  }

  const { rows } = await pool.query(
    `SELECT cm.id,
            cm.club_id,
            cm.sender_id,
            cm.message,
            cm.created_at,
            u.username,
            u.profile_photo
     FROM club_messages cm
     JOIN users u ON u.id = cm.sender_id
     WHERE cm.club_id = $1
     ORDER BY cm.created_at DESC
     LIMIT $2`,
    [clubId, limit]
  );

  return res.json(rows.reverse());
});

clubsRouter.post("/:id/messages", async (req, res) => {
  const clubId = Number(req.params.id);
  const message = String(req.body?.message || "").trim();

  if (!clubId) {
    return res.status(400).json({ error: "Valid club id is required" });
  }

  if (!message) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  const club = await getClubWithMembership(clubId, req.user.id);
  if (!club) {
    return res.status(404).json({ error: "Club not found" });
  }

  if (!club.my_role) {
    return res.status(403).json({ error: "Only members can send club messages" });
  }

  const { rows } = await pool.query(
    `INSERT INTO club_messages (club_id, sender_id, message)
     VALUES ($1, $2, $3)
     RETURNING id, club_id, sender_id, message, created_at`,
    [clubId, req.user.id, message]
  );

  const newMessage = {
    ...rows[0],
    username: req.user.username,
    profile_photo: req.user.profile_photo || null
  };

  const io = getIO();
  if (io) {
    io.to(`club:${clubId}`).emit("club:message", newMessage);
  }

  return res.status(201).json(newMessage);
});