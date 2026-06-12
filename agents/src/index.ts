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
import { BaselineBot } from "./bots/baseline.js";
import { startServer } from "./server/index.js";
import { FEED_ASSETS, FEED_POLL_MS, SUSPECT_IDS } from "./config.js";

// ── 1. Price feed ──────────────────────────────────────────────────────────
const feed = new FeedManager(new CoinGeckoFeed(), FEED_ASSETS, FEED_POLL_MS);
feed.start();

// ── 2. Trade engine ─────────────────────────────────────────────────────────
const engine = new TradeEngine();

// ── 3. Bot runner ─────────────────────────────────────────────────────────
//
// DR-202 default: suspects 1–4 are bots; suspects 5–6 are human slots.
// Adjust these IDs once DR-502 locks the final count/split.
//
// DR-203 TODO: replace BaselineBot instances with real personalities:
//   suspect 1 → The Quant
//   suspect 2 → The Degen
//   suspect 3 → The Sleeper
//   suspect 4 → Paper Hands (or drop if cut #3 applies)
const BOT_SUSPECT_IDS = SUSPECT_IDS.slice(0, 4); // first 4 suspects are bots

const runner = new BotRunner(engine);
for (const id of BOT_SUSPECT_IDS) {
  runner.register(new BaselineBot(id));
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
