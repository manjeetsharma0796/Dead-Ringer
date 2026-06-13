/**
 * The Degen (suspect 2) — DR-203.
 *
 * Fingerprint: emotional, greedy, undisciplined.
 *   - FOMO entries: chases a 3+ candle run in the direction it's already going.
 *   - Revenge trades: when deeply underwater (< -2%) it doubles down on the SAME
 *     side at 3-5× size instead of cutting — the opposite of the Quant.
 *   - Oversized, ragged positions (non-round sizes), irregular timing.
 *
 * Z.AI / LLM hook (DR-201, pending credits): the spec calls for an LLM-driven
 * brain — feed it the last-N candles, let it emit { side, size, reasoning }.
 * That path is BLOCKED on DR-201 (computing credits), so this ships a heuristic
 * that reproduces the same behavioral fingerprint deterministically. When a
 * `ZAI_API_KEY` lands, swap the body of `decide` for an async LLM call behind
 * the same interface — the personality (FOMO/revenge/oversize) stays identical.
 */

import type { Bot, MarketData, Order } from "../types.js";
import {
  PriceTracker,
  PositionMemory,
  choosePair,
  round3,
  defaultRng,
  type Rng,
} from "./support.js";

export class DegenBot implements Bot {
  private readonly tracker = new PriceTracker();
  private readonly mem = new PositionMemory();
  private readonly rng: Rng;
  private readonly baseSize = 0.3;

  constructor(public readonly id: number, opts: { rng?: Rng } = {}) {
    this.rng = opts.rng ?? defaultRng;
  }

  decide(market: MarketData): Order | null {
    this.tracker.observe(market);

    const pair = choosePair(market, "BTC/USD");
    if (!pair) return null;
    const price = (market[pair] as { price: number }).price;

    // 1. Revenge — losing position, double down bigger on the SAME side.
    if (this.mem.has(pair)) {
      const up = this.mem.unrealizedPct(pair, price);
      if (up < -2 && this.rng() < 0.5) {
        const side = this.mem.side(pair) as "BUY" | "SELL";
        const size = round3(this.baseSize * (3 + this.rng() * 2)); // 3-5×
        this.mem.open(pair, side, price, size);
        return { side, pair, size, note: "revenge" };
      }
    }

    // 2. FOMO — chase a 3+ run in the run's direction, oversized.
    const run = this.tracker.runLength(pair);
    if (Math.abs(run) >= 3 && this.rng() < 0.6) {
      const side: "BUY" | "SELL" = run > 0 ? "BUY" : "SELL";
      const size = round3(this.baseSize * (2 + this.rng() * 2)); // 2-4×
      this.mem.open(pair, side, price, size);
      return { side, pair, size, note: "fomo" };
    }

    // 3. Otherwise erratic — ~25% chance of a random-ish punt.
    if (this.rng() < 0.25) {
      const side: "BUY" | "SELL" = this.rng() < 0.5 ? "BUY" : "SELL";
      const size = round3(this.baseSize * (1 + this.rng() * 2)); // 1-3×, ragged
      this.mem.open(pair, side, price, size);
      return { side, pair, size, note: "impulse" };
    }

    return null;
  }
}
