/**
 * Paper Hands (suspect 4) — DR-203. [Cut #3 — first to drop if behind.]
 *
 * Fingerprint: the textbook retail loser who buys tops and sells bottoms.
 *   - Tracks price drift from a moving baseline. The instant drift crosses
 *     +1.5% it BUYS the pump; the instant it crosses -1.5% it SELLS the dip;
 *     then it resets the baseline and waits for the next overreaction.
 *
 * Deterministic (no randomness) — its tell is the painfully predictable
 * reactivity, which is exactly what makes it read as a frustrated human.
 */

import type { Bot, MarketData, Order } from "../types.js";
import { PriceTracker, choosePair } from "./support.js";

export class PaperHandsBot implements Bot {
  private readonly tracker = new PriceTracker();
  private readonly base = new Map<string, number>();
  private readonly threshold: number;
  private readonly size: number;

  constructor(
    public readonly id: number,
    opts: { threshold?: number; size?: number } = {},
  ) {
    this.threshold = opts.threshold ?? 1.5;
    this.size = opts.size ?? 0.1;
  }

  decide(market: MarketData): Order | null {
    this.tracker.observe(market);

    const pair = choosePair(market, "BTC/USD");
    if (!pair) return null;
    const price = (market[pair] as { price: number }).price;

    const base = this.base.get(pair);
    if (base === undefined) {
      this.base.set(pair, price); // first sighting — set the baseline, no trade
      return null;
    }

    const drift = ((price - base) / base) * 100;
    if (drift >= this.threshold) {
      this.base.set(pair, price);
      return { side: "BUY", pair, size: this.size, note: "buy the pump" };
    }
    if (drift <= -this.threshold) {
      this.base.set(pair, price);
      return { side: "SELL", pair, size: this.size, note: "sell the dip" };
    }
    return null;
  }
}
