import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "dev_secret",
  tmdbApiKey: process.env.TMDB_API_KEY || "",
  trendingRefreshMinutes: Number(process.env.TRENDING_REFRESH_MINUTES || 10),
  trendingWindowDays: Number(process.env.TRENDING_WINDOW_DAYS || 30),
  trendingLimit: Number(process.env.TRENDING_LIMIT || 10),
  adminEmails: (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
};
