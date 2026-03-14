"use client";

import { io } from "socket.io-client";

let socket;

function resolveSocketUrl() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }

  if (process.env.NEXT_PUBLIC_API_BASE_URL?.startsWith("http")) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api\/?$/, "");
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const previewMatch = hostname.match(/^(.*)-3000\.(app\.github\.dev|githubpreview\.dev)$/);
    if (previewMatch) {
      return `${protocol}//${previewMatch[1]}-4000.${previewMatch[2]}`;
    }
    return `${protocol}//${hostname}:4000`;
  }

  return "http://localhost:4000";
}

export function getSocket() {
  if (typeof window === "undefined") {
    return null;
  }

  const token = localStorage.getItem("fliktox_token");
  const userRaw = localStorage.getItem("fliktox_user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  if (!token || !user?.id) {
    return null;
  }

  if (!socket) {
    socket = io(resolveSocketUrl(), {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000
    });

    socket.on("connect", () => {
      socket.emit("register", user.id);
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = undefined;
  }
}
