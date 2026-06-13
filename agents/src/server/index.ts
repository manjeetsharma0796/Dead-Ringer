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

  // ── Permissive CORS — allow the Next.js frontend on :3100 (and any other
  //    origin) to call REST endpoints and handle OPTIONS preflights.
  app.use((req, res, next) => {
    const origin = req.headers["origin"] ?? "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

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
  // Pass engine.allTrades as the history provider so new WS clients receive
  // up to 80 recent trades (newest-first) on connect.
  const stream = new StreamServer(PORT, () => engine.allTrades());

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
