import { createServer } from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { registerChatSocket } from "./socket/chatSocket.js";
import { startTrendingRefreshLoop } from "./services/trendingCache.js";

const server = createServer(app);
registerChatSocket(server);
startTrendingRefreshLoop({
  refreshMinutes: env.trendingRefreshMinutes,
  limit: env.trendingLimit,
  windowDays: env.trendingWindowDays
}).catch((error) => {
  console.error("Initial trending refresh failed", error);
});

server.listen(env.port, () => {
  console.log(`Fliktox backend running on http://localhost:${env.port}`);
});
