import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

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

    socket.on("register", (registeredUserId) => {
      if (Number(registeredUserId) !== userId) {
        return;
      }

      socket.join(`user:${userId}`);
      socket.join(String(userId));
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
