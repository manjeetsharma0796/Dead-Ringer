/**
 * In-memory trade log with optional JSON persistence.
 *
 * Persistence writes the full log to agents/data/trades.json on every append.
 * It's fire-and-forget; a failed write is logged but never crashes the process.
 */

import fs from "fs";
import path from "path";
import type { Trade } from "../types.js";
import { PERSIST_TRADES, TRADES_FILE } from "../config.js";

export class TradeLog {
  private trades: Trade[] = [];
  private readonly filePath: string;

  constructor() {
    // Resolve relative to the package root (one level up from src/).
    this.filePath = path.resolve(__dirname, "..", TRADES_FILE);
    this.ensureDir();
  }

  append(trade: Trade): void {
    this.trades.push(trade);
    if (PERSIST_TRADES) {
      this.persist();
    }
  }

  all(): Trade[] {
    return [...this.trades];
  }

  forSuspect(suspectId: number): Trade[] {
    return this.trades.filter((t) => t.suspectId === suspectId);
  }

  private ensureDir(): void {
    if (!PERSIST_TRADES) return;
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    } catch {
      // Directory already exists.
    }
  }

  private persist(): void {
    const json = JSON.stringify(this.trades, null, 2);
    fs.writeFile(this.filePath, json, "utf8", (err) => {
      if (err) console.error("[TradeLog] persist error:", err.message);
    });
  }
}
