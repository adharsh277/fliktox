import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const listsRouter = Router();
listsRouter.use(requireAuth);

// Create a new list
listsRouter.post("/", async (req, res) => {
  const { title, description = "", is_public = true } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }

  const { rows } = await pool.query(
    `INSERT INTO lists (user_id, title, description, is_public)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.user.id, title.trim(), description, is_public]
  );
  return res.status(201).json(rows[0]);
});

// Get all lists for the current user
listsRouter.get("/mine", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT l.*, COUNT(lm.id)::int AS movie_count
     FROM lists l
     LEFT JOIN list_movies lm ON lm.list_id = l.id
     WHERE l.user_id = $1
     GROUP BY l.id
     ORDER BY l.updated_at DESC`,
    [req.user.id]
  );
  return res.json(rows);
});

// Get public lists for a specific user
listsRouter.get("/user/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  const { rows } = await pool.query(
    `SELECT l.*, COUNT(lm.id)::int AS movie_count
     FROM lists l
     LEFT JOIN list_movies lm ON lm.list_id = l.id
     WHERE l.user_id = $1 AND l.is_public = TRUE
     GROUP BY l.id
     ORDER BY l.updated_at DESC`,
    [userId]
  );
  return res.json(rows);
});

// Get a single list with its movies
listsRouter.get("/:listId", async (req, res) => {
  const listId = Number(req.params.listId);
  const { rows: listRows } = await pool.query(
    `SELECT l.*, u.username FROM lists l JOIN users u ON u.id = l.user_id WHERE l.id = $1`,
    [listId]
  );
  if (!listRows.length) {
    return res.status(404).json({ error: "List not found" });
  }

  const list = listRows[0];
  if (!list.is_public && list.user_id !== req.user.id) {
    return res.status(403).json({ error: "This list is private" });
  }

  const { rows: movies } = await pool.query(
    `SELECT tmdb_id, position, added_at FROM list_movies WHERE list_id = $1 ORDER BY position`,
    [listId]
  );

  return res.json({ ...list, movies });
});

// Update a list
listsRouter.put("/:listId", async (req, res) => {
  const listId = Number(req.params.listId);
  const { title, description, is_public } = req.body;

  const { rows } = await pool.query(
    `UPDATE lists SET title = COALESCE($1, title), description = COALESCE($2, description),
     is_public = COALESCE($3, is_public), updated_at = NOW()
     WHERE id = $4 AND user_id = $5 RETURNING *`,
    [title, description, is_public, listId, req.user.id]
  );
  if (!rows.length) {
    return res.status(404).json({ error: "List not found or not yours" });
  }
  return res.json(rows[0]);
});

// Delete a list
listsRouter.delete("/:listId", async (req, res) => {
  const listId = Number(req.params.listId);
  const { rowCount } = await pool.query(
    `DELETE FROM lists WHERE id = $1 AND user_id = $2`,
    [listId, req.user.id]
  );
  if (!rowCount) {
    return res.status(404).json({ error: "List not found or not yours" });
  }
  return res.json({ deleted: true });
});

// Add a movie to a list
listsRouter.post("/:listId/movies", async (req, res) => {
  const listId = Number(req.params.listId);
  const { tmdb_id } = req.body;
  if (!tmdb_id) {
    return res.status(400).json({ error: "tmdb_id is required" });
  }

  // verify ownership
  const { rows: own } = await pool.query(
    `SELECT id FROM lists WHERE id = $1 AND user_id = $2`,
    [listId, req.user.id]
  );
  if (!own.length) {
    return res.status(403).json({ error: "Not your list" });
  }

  const { rows: posRows } = await pool.query(
    `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM list_movies WHERE list_id = $1`,
    [listId]
  );

  const { rows } = await pool.query(
    `INSERT INTO list_movies (list_id, tmdb_id, position)
     VALUES ($1, $2, $3)
     ON CONFLICT (list_id, tmdb_id) DO NOTHING
     RETURNING *`,
    [listId, tmdb_id, posRows[0].next_pos]
  );

  await pool.query(`UPDATE lists SET updated_at = NOW() WHERE id = $1`, [listId]);
  return res.status(201).json(rows[0] || { already_exists: true });
});

// Remove a movie from a list
listsRouter.delete("/:listId/movies/:tmdbId", async (req, res) => {
  const listId = Number(req.params.listId);
  const tmdbId = Number(req.params.tmdbId);

  const { rows: own } = await pool.query(
    `SELECT id FROM lists WHERE id = $1 AND user_id = $2`,
    [listId, req.user.id]
  );
  if (!own.length) {
    return res.status(403).json({ error: "Not your list" });
  }

  await pool.query(`DELETE FROM list_movies WHERE list_id = $1 AND tmdb_id = $2`, [listId, tmdbId]);
  await pool.query(`UPDATE lists SET updated_at = NOW() WHERE id = $1`, [listId]);
  return res.json({ deleted: true });
});
