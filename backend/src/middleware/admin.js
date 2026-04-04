import { env } from "../config/env.js";

export function requireAdmin(req, res, next) {
  const email = String(req.user?.email || "").toLowerCase();
  const isListedAdmin = env.adminEmails.includes(email);

  // Dev fallback: if no allowlist is configured, let user id 1 access admin tools.
  const isDevFallbackAdmin = env.adminEmails.length === 0 && Number(req.user?.id) === 1;

  if (!isListedAdmin && !isDevFallbackAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }

  return next();
}