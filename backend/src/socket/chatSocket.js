import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";

let io;

const configuredOrigins = (env.clientOrigin || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (configuredOrigins.includes(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  if (/^https:\/\/.*\.(app\.github\.dev|githubpreview\.dev)$/.test(origin)) return true;
  return false;
}

export function getIO() {
  return io;
}

// Track online user IDs
const onlineUsers = new Set();

export function registerChatSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (isAllowedOrigin(origin)) return cb(null, true);
        return cb(new Error("Origin not allowed by CORS"));
      },
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
    socket.join(String(userId));

    const joinMemberClubs = async () => {
      const { rows } = await pool.query(
        `SELECT club_id FROM club_members WHERE user_id = $1`,
        [userId]
      );

      for (const row of rows) {
        socket.join(`club:${row.club_id}`);
      }
    };

    joinMemberClubs().catch(() => {
      // Keep private chat connected even if club room auto-join fails.
    });

    socket.on("register", (registeredUserId) => {
      if (Number(registeredUserId) !== userId) {
        return;
      }

      socket.join(`user:${userId}`);
      socket.join(String(userId));
    });

    socket.on("club:join", async ({ clubId }) => {
      const numericClubId = Number(clubId);
      if (!numericClubId) {
        return;
      }

      try {
        const { rows } = await pool.query(
          `SELECT 1 FROM club_members WHERE club_id = $1 AND user_id = $2`,
          [numericClubId, userId]
        );

        if (rows[0]) {
          socket.join(`club:${numericClubId}`);
        }
      } catch {
        // Ignore join failures and keep socket connected.
      }
    });

    socket.on("club:leave", ({ clubId }) => {
      const numericClubId = Number(clubId);
      if (!numericClubId) {
        return;
      }

      socket.leave(`club:${numericClubId}`);
    });

    socket.on("club:typing", ({ clubId }) => {
      const numericClubId = Number(clubId);
      if (!numericClubId) {
        return;
      }

      socket.to(`club:${numericClubId}`).emit("club:typing", {
        clubId: numericClubId,
        userId,
        username: socket.data.user.username
      });
    });

    // Mark online and broadcast
    onlineUsers.add(userId);
    socket.broadcast.emit("user:online", { userId });
    socket.broadcast.emit("online", { userId });

    // Send the full online list to the new connection
    socket.emit("online:list", [...onlineUsers]);

    // Typing indicator
    socket.on("typing", ({ receiverId }) => {
      if (receiverId) {
        io.to(`user:${receiverId}`).emit("user:typing", { userId });
        io.to(`user:${receiverId}`).emit("typing", { userId });
      }
    });

    socket.on("disconnect", () => {
      // Only mark offline if no other sockets for this user
      const rooms = io.sockets.adapter.rooms.get(`user:${userId}`);
      if (!rooms || rooms.size === 0) {
        onlineUsers.delete(userId);
        socket.broadcast.emit("user:offline", { userId });
        socket.broadcast.emit("offline", { userId });
      }
    });
  });
}
