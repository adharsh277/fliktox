import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool.js";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

function createToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    env.jwtSecret,
    { expiresIn: "7d" }
  );
}

authRouter.post("/signup", async (req, res) => {
  const { username, email, password, profilePhoto, favoriteGenres = [] } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email and password are required" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await pool.query(
      `
      INSERT INTO users (username, email, password_hash, profile_photo, favorite_genres)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, profile_photo, favorite_genres
      `,
      [username, email, passwordHash, profilePhoto || null, favoriteGenres]
    );

    const user = rows[0];
    const token = createToken(user);
    return res.status(201).json({ token, user });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Username or email already exists" });
    }

    console.error(error);
    return res.status(500).json({ error: "Failed to create account" });
  }
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const { rows } = await pool.query(
    `SELECT id, username, email, password_hash, profile_photo, favorite_genres FROM users WHERE email = $1`,
    [email]
  );

  const user = rows[0];
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = createToken(user);
  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      profile_photo: user.profile_photo,
      favorite_genres: user.favorite_genres
    }
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, username, email, profile_photo, favorite_genres FROM users WHERE id = $1`,
    [req.user.id]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json(rows[0]);
});

authRouter.put("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }

  const { rows } = await pool.query(
    `SELECT password_hash FROM users WHERE id = $1`,
    [req.user.id]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: "User not found" });
  }

  const isValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!isValid) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, req.user.id]);

  return res.json({ ok: true });
});
