import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { moviesRouter } from "./routes/movies.js";
import { ratingsRouter } from "./routes/ratings.js";
import { friendsRouter } from "./routes/friends.js";
import { feedRouter } from "./routes/feed.js";
import { messagesRouter } from "./routes/messages.js";
import { healthRouter } from "./routes/health.js";

export const app = express();

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/movies", moviesRouter);
app.use("/api/ratings", ratingsRouter);
app.use("/api/friends", friendsRouter);
app.use("/api/feed", feedRouter);
app.use("/api/messages", messagesRouter);

app.use((_, res) => {
  res.status(404).json({ error: "Not found" });
});
