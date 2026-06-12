/**
 * Baseline bot — "The Clockwork" (suspect id configurable).
 *
 * Strategy: fires a small random trade every ~N ticks.
 * It alternates BUY / SELL on whichever pair has a live price.
 * This is intentionally trivial — it exists to prove the harness works
 * and to generate trade history from the moment the server starts.
 *
 * DR-203 TODO: replace / supplement with real personalities:
 *   - The Quant    — metronomic intervals, tight stop-losses, round-number sizes
 *   - The Degen    — LLM-driven (Z.AI) FOMO entries, revenge trades, oversized
 *   - The Sleeper  — mimics human sleep cycle, sloppy timing, fat-finger corrections
 *   - Paper Hands  — sells every dip, buys every pump (cut #3 — lowest priority)
 */

import type { Bot, MarketData, Order } from "../types.js";

export class BaselineBot implements Bot {
  private tick = 0;
  private lastSide: "BUY" | "SELL" = "BUY";

  constructor(
    public readonly id: number,
    /** Fire a trade every this many ticks (default 3 = every ~15 s at 5 s/tick). */
    private readonly tradeEveryNTicks = 3,
    /** Base order size for the baseline strategy. */
    private readonly baseSize = 0.05,
  ) {}

  decide(market: MarketData): Order | null {
    this.tick++;
    if (this.tick % this.tradeEveryNTicks !== 0) return null;

    const pairs = Object.keys(market);
    if (pairs.length === 0) return null;

    // Round-robin through available pairs.
    const pair = pairs[this.tick % pairs.length] as string;

    // Alternate BUY/SELL so we don't accumulate a one-sided book.
    this.lastSide = this.lastSide === "BUY" ? "SELL" : "BUY";

    // Tiny random jitter so consecutive trades are not identical.
    const size = Math.round((this.baseSize + Math.random() * 0.05) * 1000) / 1000;

    return { side: this.lastSide, pair, size };
  }
}
