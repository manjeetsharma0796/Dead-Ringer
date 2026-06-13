/**
 * Central configuration constants.
 *
 * SUSPECT_COUNT is the SINGLE authoritative source for how many suspects exist.
 * DR-502 has an open 6-vs-8 decision — change ONE number here, nothing else.
 */

// ── Suspect count ──────────────────────────────────────────────────────────
// DR-502 (locked 2026-06-13): 8 suspects — 4 bots (suspects 1-4) / 4 humans
// (suspects 5-8). Matches the frontend mock; bots come from BOT_COUNT below.
export const SUSPECT_COUNT = 8;

/** Suspect IDs are 1-indexed up to SUSPECT_COUNT. */
export const SUSPECT_IDS: number[] = Array.from(
  { length: SUSPECT_COUNT },
  (_, i) => i + 1,
);

// ── Service ────────────────────────────────────────────────────────────────
export const PORT = Number(process.env["PORT"] ?? 3101);

// ── Price feed ────────────────────────────────────────────────────────────
// Comma-separated CoinGecko asset IDs → pairs:
//   ethereum → ETH/USD,  bitcoin → BTC/USD
const rawAssets = process.env["FEED_ASSETS"] ?? "ethereum,bitcoin";
export const FEED_ASSETS: string[] = rawAssets
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const FEED_POLL_MS = Number(process.env["FEED_POLL_MS"] ?? 3000);

/** Map CoinGecko ID → trading pair label used in Trade objects. */
export const ASSET_TO_PAIR: Record<string, string> = {
  ethereum: "ETH/USD",
  bitcoin: "BTC/USD",
  solana: "SOL/USD",
  mantle: "MNT/USD",
};

// ── Persistence ───────────────────────────────────────────────────────────
export const PERSIST_TRADES = process.env["PERSIST_TRADES"] === "true";
export const TRADES_FILE = "data/trades.json";

// ── Bot runner ────────────────────────────────────────────────────────────
/** How often the bot runner ticks (all bots decide simultaneously). */
export const BOT_TICK_MS = 5000;

/** How many of the leading suspects are bots (rest are human slots). */
export const BOT_COUNT = 4;

/**
 * DR-203 Cut #3 — drop the 4th bot (Paper Hands) when behind schedule.
 * Set DISABLE_PAPER_HANDS=true to fall back to 3 bots.
 */
export const DISABLE_PAPER_HANDS = process.env["DISABLE_PAPER_HANDS"] === "true";
