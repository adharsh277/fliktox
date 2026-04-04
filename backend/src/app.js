import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { moviesRouter } from "./routes/movies.js";
import { ratingsRouter } from "./routes/ratings.js";
import { friendsRouter } from "./routes/friends.js";
import { feedRouter } from "./routes/feed.js";
import { messagesRouter } from "./routes/messages.js";
import { healthRouter } from "./routes/health.js";
import { listsRouter } from "./routes/lists.js";
import { statsRouter } from "./routes/stats.js";
import { recommendationsRouter } from "./routes/recommendations.js";
import { profileRouter } from "./routes/profile.js";
import { usersRouter } from "./routes/users.js";
import { adminRouter } from "./routes/admin.js";

export const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");

const configuredOrigins = (env.clientOrigin || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (configuredOrigins.includes(origin)) {
    return true;
  }

  if (/^http:\/\/localhost:\d+$/.test(origin)) {
    return true;
  }

  if (/^https:\/\/.*\.(app\.github\.dev|githubpreview\.dev)$/.test(origin)) {
    return true;
  }

  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadsDir));

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/movies", moviesRouter);
app.use("/api/ratings", ratingsRouter);
app.use("/api/friends", friendsRouter);
app.use("/api/feed", feedRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/lists", listsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/recommendations", recommendationsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/users", usersRouter);
app.use("/api/admin", adminRouter);

app.use((_, res) => {
  res.status(404).json({ error: "Not found" });
});
