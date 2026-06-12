/**
 * WebSocket broadcast layer (DR-205).
 *
 * Every new Trade produced by the engine (bot or human) is broadcast
 * to all connected /stream clients as a JSON string.
 *
 * Event envelope:
 *   { type: "trade", payload: Trade }
 */

import { WebSocket, WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import type { Trade } from "../types.js";

export class StreamServer {
  private wss: WebSocketServer;

  constructor(port: number) {
    // Attach on its own port-share — the HTTP server passes the upgrade manually
    // in index.ts so we don't need noServer: false here.
    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on("connection", (ws: WebSocket) => {
      console.log(`[Stream] client connected (${this.wss.clients.size} total)`);

      ws.on("close", () => {
        console.log(
          `[Stream] client disconnected (${this.wss.clients.size} remaining)`,
        );
      });

      ws.on("error", (err) => {
        console.error("[Stream] ws error:", err.message);
      });
    });

    // Suppress unused parameter warning
    void port;
  }

  /** Called by the HTTP server to hand off an upgrade request to /stream. */
  handleUpgrade(
    req: IncomingMessage,
    socket: import("net").Socket,
    head: Buffer,
  ): void {
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss.emit("connection", ws, req);
    });
  }

  /** Broadcast a new trade to every connected client. */
  broadcast(trade: Trade): void {
    const msg = JSON.stringify({ type: "trade", payload: trade });
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg, (err) => {
          if (err) console.error("[Stream] send error:", err.message);
        });
      }
    }
  }

  get clientCount(): number {
    return this.wss.clients.size;
  }
}
