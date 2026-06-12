/**
 * Canonical Trade shape — MUST match the frontend interface exactly.
 *
 * interface Trade {
 *   id: string;
 *   ts: string;           // "HH:MM:SS"
 *   side: "BUY" | "SELL";
 *   pair: string;         // e.g. "ETH/USD"
 *   size: number;         // quantity of base asset
 *   price: number;        // execution price in USD
 *   pnl: number;          // realized PnL on close; 0 while position is open
 *   suspectId: number;    // 1-indexed, matches SUSPECT_IDS constant
 * }
 */
export interface Trade {
  id: string;
  ts: string;
  side: "BUY" | "SELL";
  pair: string;
  size: number;
  price: number;
  pnl: number;
  suspectId: number;
}

/** A request to open or close a position (used internally and by admin POST). */
export interface TradeRequest {
  suspectId: number;
  side: "BUY" | "SELL";
  pair: string;
  size: number;
}

/** Current best-bid/ask snapshot from the price feed. */
export interface MarketSnapshot {
  pair: string;       // e.g. "ETH/USD"
  price: number;      // latest mid-price in USD
  updatedAt: number;  // unix ms
}

/** Map of pair → latest snapshot; fed to bots and the trade engine. */
export type MarketData = Record<string, MarketSnapshot>;

/** An order a bot wants to place; null means "do nothing this tick". */
export interface Order {
  side: "BUY" | "SELL";
  pair: string;
  size: number;
}

/** Bot interface — each personality implements this. */
export interface Bot {
  id: number;
  decide(market: MarketData): Order | null;
}
