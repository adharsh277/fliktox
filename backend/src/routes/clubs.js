import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const clubsRouter = Router();
clubsRouter.use(requireAuth);

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