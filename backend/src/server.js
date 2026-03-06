import { createServer } from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { registerChatSocket } from "./socket/chatSocket.js";

const server = createServer(app);
registerChatSocket(server);

server.listen(env.port, () => {
  console.log(`Fliktox backend running on http://localhost:${env.port}`);
});
