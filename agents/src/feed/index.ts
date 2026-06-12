/**
 * Price feed manager.
 *
 * Polls the configured PriceFeed on an interval and keeps an in-memory
 * MarketData snapshot that the trade engine and bots can read at any time.
 *
 * Usage:
 *   const feed = new FeedManager(new CoinGeckoFeed(), FEED_ASSETS, FEED_POLL_MS);
 *   feed.start();
 *   const market = feed.latest();  // always safe to read
 */

import type { MarketData } from "../types.js";
import type { PriceFeed } from "./types.js";

export class FeedManager {
  private market: MarketData = {};
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly feed: PriceFeed,
    private readonly assetIds: string[],
    private readonly pollMs: number,
  ) {}

  /** Current market snapshot. Safe to call before the first tick (returns {}). */
  latest(): MarketData {
    return this.market;
  }

  /** Start polling. Idempotent — safe to call multiple times. */
  start(): void {
    if (this.timer !== null) return;
    // Fire immediately, then on interval.
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.pollMs);
    console.log(
      `[Feed] ${this.feed.name} polling ${this.assetIds.join(",")} every ${this.pollMs}ms`,
    );
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    const partial = await this.feed.fetchPrices(this.assetIds);
    // Merge into existing snapshot — stale prices for failing assets survive.
    // Cast is safe: fetchPrices only returns defined MarketSnapshot values.
    this.market = { ...this.market, ...(partial as MarketData) };
    const entries = Object.values(partial).filter(
      (snap): snap is NonNullable<typeof snap> => snap !== undefined,
    );
    if (entries.length > 0) {
      const summary = entries
        .map((snap) => `${snap.pair}=$${snap.price.toLocaleString()}`)
        .join(" | ");
      console.log(`[Feed] ${summary}`);
    }
  }
}

export { CoinGeckoFeed } from "./coingecko.js";
export type { PriceFeed } from "./types.js";
