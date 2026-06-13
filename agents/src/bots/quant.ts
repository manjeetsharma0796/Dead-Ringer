/**
 * The Quant (suspect 1) — DR-203.
 *
 * Fingerprint: a machine that never gets bored or scared.
 *   - Metronomic cadence: opens on a fixed schedule (~every 4 min) ± a hair of
 *     jitter — the most obvious tell is how *regular* it is.
 *   - Round lot sizes only: 0.1, 0.5, 1.0 — never a ragged 0.37.
 *   - Tight, unemotional stop-loss at 0.5% — exits the instant a position turns,
 *     every time, with no hesitation.
 *   - Volatility guard: after any move > 3% it stands down for ~5 min rather than
 *     trading the chaos.
 *   - Entry is a simple mean-reversion fade (sell strength, buy weakness).
 *
 * The give-away for a human player: clockwork timing + round numbers + perfectly
 * disciplined exits. No human is this consistent.
 */

import type { Bot, MarketData, Order } from "../types.js";
import {
  PriceTracker,
  PositionMemory,
  choosePair,
  pick,
  randInt,
  defaultRng,
  type Rng,
} from "./support.js";

const ROUND_LOTS = [0.1, 0.5, 1.0] as const;

export class QuantBot implements Bot {
  private readonly tracker = new PriceTracker();
  private readonly mem = new PositionMemory();
  private readonly rng: Rng;
  private readonly cadenceTicks: number;
  private readonly stopLossPct = 0.5;

  private tick = 0;
  private nextTradeTick = 0;
  private cooldownUntil = 0;

  constructor(
    public readonly id: number,
    opts: { rng?: Rng; cadenceTicks?: number } = {},
  ) {
    this.rng = opts.rng ?? defaultRng;
    // ~4 minutes at the 5s bot tick (48 ticks). Overridable for tests.
    this.cadenceTicks = opts.cadenceTicks ?? 48;
  }

  decide(market: MarketData): Order | null {
    this.tracker.observe(market);
    this.tick++;

    const pair = choosePair(market, "ETH/USD");
    if (!pair) return null;
    const price = (market[pair] as { price: number }).price;

    // 1. Stop-loss runs EVERY tick, independent of cadence — disciplined exits.
    if (this.mem.has(pair)) {
      const up = this.mem.unrealizedPct(pair, price);
      if (up <= -this.stopLossPct) {
        const closingSide = this.mem.side(pair) === "BUY" ? "SELL" : "BUY";
        this.mem.close(pair);
        return { side: closingSide, pair, size: 0, close: true, note: "stop-loss 0.5%" };
      }
    }

    // 2. Volatility guard — stand down for ~5 min after a sharp move.
    if (Math.abs(this.tracker.lastPct(pair)) > 3) {
      this.cooldownUntil = this.tick + 60;
    }
    if (this.tick < this.cooldownUntil) return null;

    // 3. Metronomic cadence.
    if (this.tick < this.nextTradeTick) return null;
    this.nextTradeTick = this.tick + this.cadenceTicks + randInt(this.rng, -2, 2);

    const side: "BUY" | "SELL" = this.tracker.lastPct(pair) > 0 ? "SELL" : "BUY";
    const size = pick(this.rng, ROUND_LOTS);
    this.mem.open(pair, side, price, size);
    return { side, pair, size, note: "scheduled fade" };
  }
}
