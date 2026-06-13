/**
 * WebSocket broadcast layer (DR-205).
 *
 * Every new Trade produced by the engine (bot or human) is broadcast
 * to all connected /stream clients as a JSON string.
 *
 * Event envelope (live trades):
 *   { type: "trade", payload: Trade }
 *
 * On connect, the last HISTORY_SIZE trades are sent as a single burst
 * (newest-first — matches a prepend-style tape on the frontend):
 *   { type: "history", payload: Trade[] }
 *
 * The Trade shape is never modified — only the wrapper type field differs.
 */

import { WebSocket, WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import type { Trade } from "../types.js";

/** Number of recent trades sent to a newly-connected client. */
const HISTORY_SIZE = 80;

export class StreamServer {
  private wss: WebSocketServer;
  private getHistory: () => Trade[];

  /**
   * @param port          - unused directly (HTTP server handles upgrade), kept
   *                        for interface parity with the original signature.
   * @param getHistory    - callback that returns the current trade log; called
   *                        once per new connection to snapshot recent history.
   */
  constructor(port: number, getHistory: () => Trade[] = () => []) {
    this.getHistory = getHistory;

    // Attach on its own port-share — the HTTP server passes the upgrade manually
    // in index.ts so we don't need noServer: false here.
    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on("connection", (ws: WebSocket) => {
      console.log(`[Stream] client connected (${this.wss.clients.size} total)`);

      // Send recent history immediately so the frontend tape is not empty.
      // Newest-first: slice the last HISTORY_SIZE trades, then reverse.
      const history = this.getHistory();
      const recent = history.slice(-HISTORY_SIZE).reverse();
      const histMsg = JSON.stringify({ type: "history", payload: recent });
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(histMsg, (err) => {
          if (err) console.error("[Stream] history send error:", err.message);
        });
      }

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
