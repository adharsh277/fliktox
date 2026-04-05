import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getTrendingLists, recomputeTrendingLists } from "../services/trendingCache.js";

export const trendingRouter = Router();
trendingRouter.use(requireAuth);

trendingRouter.get("/", async (req, res) => {
  const useCached = String(req.query.cached || "").toLowerCase() === "true";

  if (!useCached) {
    try {
      await recomputeTrendingLists();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to refresh trending lists" });
    }
  }

  const payload = getTrendingLists();

  return res.json({
    updatedAt: payload.updatedAt,
    windowDays: payload.windowDays,
    lists: {
      mostWatched: payload.mostWatched,
      mostVoted: payload.mostVoted,
      mostReviewed: payload.mostReviewed
    }
  });
});
