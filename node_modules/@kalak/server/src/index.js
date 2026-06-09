import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import { config } from "./config.js";
import { QuestionStore } from "./store.js";
import { createApiRouter } from "./routes.js";
import { KalakGameEngine } from "./gameEngine.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.clientOrigin,
    methods: ["GET", "POST"]
  }
});

const store = new QuestionStore();
const game = new KalakGameEngine(io, store, config);
const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDist = join(__dirname, "../../client/dist");

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use("/api", createApiRouter({ store, game, config }));

io.on("connection", (socket) => {
  game.bindSocket(socket);
});

if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res) => {
    res.sendFile(join(clientDist, "index.html"));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "خطأ داخلي في الخادم." });
});

httpServer.listen(config.port, () => {
  console.log(`فلتة تعمل على http://localhost:${config.port}`);
});
