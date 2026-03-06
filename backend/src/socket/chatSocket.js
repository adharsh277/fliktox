import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";

export function registerChatSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientOrigin,
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    try {
      const user = jwt.verify(token, env.jwtSecret);
      socket.data.user = user;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.user.id;
    socket.join(`user:${userId}`);

    socket.on("private:message", async (payload) => {
      const receiverId = Number(payload?.receiverId);
      const text = String(payload?.message || "").trim();
      if (!receiverId || !text) {
        return;
      }

      const { rows } = await pool.query(
        `
        INSERT INTO messages (sender_id, receiver_id, message)
        VALUES ($1, $2, $3)
        RETURNING id, sender_id, receiver_id, message, created_at
        `,
        [userId, receiverId, text]
      );

      const msg = rows[0];
      io.to(`user:${receiverId}`).emit("private:message", msg);
      io.to(`user:${userId}`).emit("private:message", msg);
    });
  });
}
