/**
 * Express + WebSocket HTTP server on port 3101.
 *
 * Upgrade path for /stream is intercepted before Express sees it so the WS
 * handshake and REST endpoints share one port cleanly.
 */

import http from "http";
import express from "express";
import path from "path";
import type { TradeEngine } from "../engine/index.js";
import type { FeedManager } from "../feed/index.js";
import { StreamServer } from "./stream.js";
import { buildRouter } from "./routes.js";
import { PORT } from "../config.js";

export function startServer(engine: TradeEngine, feed: FeedManager): http.Server {
  const app = express();
  app.use(express.json());

  // Static admin page (DR-204 skeleton)
  app.use(
    "/admin",
    express.static(path.resolve(__dirname, "..", "..", "public")),
  );

  // API routes
  app.use("/", buildRouter(engine, feed));

  // 404 catch-all
  app.use((_req, res) => {
    res.status(404).json({ error: "not found" });
  });

  const httpServer = http.createServer(app);
  const stream = new StreamServer(PORT);

  // Wire new trades → WS broadcast
  engine.onTrade((trade) => stream.broadcast(trade));

  // Intercept WebSocket upgrades to /stream
  httpServer.on("upgrade", (req, socket, head) => {
    if (req.url === "/stream") {
      stream.handleUpgrade(req, socket as import("net").Socket, head);
    } else {
      socket.destroy();
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`[Server] listening on http://localhost:${PORT}`);
    console.log(`[Server]   GET  /health`);
    console.log(`[Server]   GET  /trades?suspectId=<n>`);
    console.log(`[Server]   GET  /suspects`);
    console.log(`[Server]   POST /admin/trade`);
    console.log(`[Server]   WS   ws://localhost:${PORT}/stream`);
    console.log(`[Server]   HTML http://localhost:${PORT}/admin/admin.html`);
  });

  return httpServer;
}
