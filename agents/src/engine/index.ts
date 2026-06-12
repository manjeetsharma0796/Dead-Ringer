/**
 * Paper-trade engine.
 *
 * Tracks open positions per suspect and produces Trade objects in the exact
 * frontend shape on every open and close.
 *
 * Position model (simplified):
 *   - Each suspect can hold at most ONE open position per pair.
 *   - Opening when a position exists flips it (close old, open new).
 *   - PnL is realized on close (long: (closePrice - openPrice) × size;
 *     short: (openPrice - closePrice) × size).
 *   - Open trades carry pnl = 0.
 */

import { randomUUID } from "crypto";
import type { Trade, TradeRequest, MarketData } from "../types.js";
import { TradeLog } from "./tradeLog.js";
import { SUSPECT_IDS } from "../config.js";

interface Position {
  side: "BUY" | "SELL";
  pair: string;
  size: number;
  entryPrice: number;
}

export type TradeListener = (trade: Trade) => void;

// Helper — "HH:MM:SS"
function fmtTime(): string {
  const now = new Date();
  return [
    now.getHours().toString().padStart(2, "0"),
    now.getMinutes().toString().padStart(2, "0"),
    now.getSeconds().toString().padStart(2, "0"),
  ].join(":");
}

export class TradeEngine {
  /** Open positions: suspectId → pair → Position */
  private positions: Map<number, Map<string, Position>> = new Map();
  private log = new TradeLog();
  private listeners: TradeListener[] = [];

  constructor() {
    // Pre-initialize position maps for every suspect.
    for (const id of SUSPECT_IDS) {
      this.positions.set(id, new Map());
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────

  onTrade(listener: TradeListener): void {
    this.listeners.push(listener);
  }

  allTrades(): Trade[] {
    return this.log.all();
  }

  tradesFor(suspectId: number): Trade[] {
    return this.log.forSuspect(suspectId);
  }

  /**
   * Execute a paper trade for the given suspect at the current market price.
   * Returns the produced Trade (or throws if the pair has no price yet).
   */
  execute(req: TradeRequest, market: MarketData): Trade {
    const snap = market[req.pair];
    if (!snap) {
      throw new Error(
        `No price available for ${req.pair} — is the feed running?`,
      );
    }
    const price = snap.price;
    const suspectPositions = this.positions.get(req.suspectId);
    if (!suspectPositions) {
      throw new Error(`Unknown suspectId ${req.suspectId}`);
    }

    const existing = suspectPositions.get(req.pair);
    let trade: Trade;

    if (existing && existing.side !== req.side) {
      // Opposite side — close existing position first, then open the new one.
      const closeTradeRaw = this.buildClose(
        req.suspectId,
        existing,
        price,
        req.pair,
      );
      this.emit(closeTradeRaw);
      // Now open fresh.
      trade = this.openPosition(req, price, suspectPositions);
    } else if (existing) {
      // Same side — just add to the position (average in) and emit an open trade.
      existing.size += req.size;
      trade = this.buildOpen(req, price);
      this.emit(trade);
    } else {
      // No position — open fresh.
      trade = this.openPosition(req, price, suspectPositions);
    }

    return trade;
  }

  /**
   * Explicitly close an open position.
   * Returns the close Trade, or null if no position was open.
   */
  closePosition(
    suspectId: number,
    pair: string,
    market: MarketData,
  ): Trade | null {
    const snap = market[pair];
    if (!snap) return null;

    const suspectPositions = this.positions.get(suspectId);
    if (!suspectPositions) return null;

    const existing = suspectPositions.get(pair);
    if (!existing) return null;

    const trade = this.buildClose(suspectId, existing, snap.price, pair);
    suspectPositions.delete(pair);
    this.emit(trade);
    return trade;
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private openPosition(
    req: TradeRequest,
    price: number,
    suspectPositions: Map<string, Position>,
  ): Trade {
    suspectPositions.set(req.pair, {
      side: req.side,
      pair: req.pair,
      size: req.size,
      entryPrice: price,
    });
    const trade = this.buildOpen(req, price);
    this.emit(trade);
    return trade;
  }

  private buildOpen(req: TradeRequest, price: number): Trade {
    return {
      id: randomUUID(),
      ts: fmtTime(),
      side: req.side,
      pair: req.pair,
      size: req.size,
      price,
      pnl: 0,
      suspectId: req.suspectId,
    };
  }

  private buildClose(
    suspectId: number,
    pos: Position,
    closePrice: number,
    pair: string,
  ): Trade {
    const pnl =
      pos.side === "BUY"
        ? (closePrice - pos.entryPrice) * pos.size
        : (pos.entryPrice - closePrice) * pos.size;

    return {
      id: randomUUID(),
      ts: fmtTime(),
      // The closing leg is the opposite side.
      side: pos.side === "BUY" ? "SELL" : "BUY",
      pair,
      size: pos.size,
      price: closePrice,
      pnl: Math.round(pnl * 100) / 100,
      suspectId,
    };
  }

  private emit(trade: Trade): void {
    this.log.append(trade);
    for (const fn of this.listeners) {
      try {
        fn(trade);
      } catch (err) {
        console.error("[TradeEngine] listener error:", err);
      }
    }
  }
}
