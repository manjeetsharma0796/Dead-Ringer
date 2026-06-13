/**
 * Dead Ringer — agents service entry point.
 *
 * Boot order:
 *   1. FeedManager (CoinGeckoFeed) — start polling price data
 *   2. TradeEngine — in-memory paper-trade ledger
 *   3. BotRunner   — registers baseline bots, starts the tick loop
 *   4. HTTP server  — Express + WebSocket on PORT (default 3101)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config();
import { FeedManager, CoinGeckoFeed } from "./feed/index.js";
import { TradeEngine } from "./engine/index.js";
import { BotRunner } from "./bots/runner.js";
import { createBots } from "./bots/index.js";
import { startServer } from "./server/index.js";
import {
  FEED_ASSETS,
  FEED_POLL_MS,
  SUSPECT_IDS,
  BOT_COUNT,
  DISABLE_PAPER_HANDS,
} from "./config.js";

// ── 1. Price feed ──────────────────────────────────────────────────────────
const feed = new FeedManager(new CoinGeckoFeed(), FEED_ASSETS, FEED_POLL_MS);
feed.start();

// ── 2. Trade engine ─────────────────────────────────────────────────────────
const engine = new TradeEngine();

// ── 3. Bot runner ─────────────────────────────────────────────────────────
//
// DR-502 (8 suspects, 4 bots / 4 humans): the leading BOT_COUNT suspects are
// bots; the rest are human slots. DR-203: each bot is a distinct personality
// (The Quant / The Degen / The Sleeper / Paper Hands) — see ./bots/index.ts.
const BOT_SUSPECT_IDS = SUSPECT_IDS.slice(0, BOT_COUNT);

const runner = new BotRunner(engine);
for (const bot of createBots(BOT_SUSPECT_IDS, {
  disablePaperHands: DISABLE_PAPER_HANDS,
})) {
  runner.register(bot);
}
runner.start(() => feed.latest());

// ── 4. HTTP + WebSocket server ────────────────────────────────────────────
startServer(engine, feed);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Main] SIGTERM — shutting down");
  runner.stop();
  feed.stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[Main] SIGINT — shutting down");
  runner.stop();
  feed.stop();
  process.exit(0);
});
