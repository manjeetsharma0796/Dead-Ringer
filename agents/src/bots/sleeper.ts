/**
 * The Sleeper (suspect 3) — DR-203. The one designed to fool people.
 *
 * Fingerprint: indistinguishable from a tired human.
 *   - Sleep cycle: active on an IST day (09:00–01:00), silent 01:00–09:00 — long
 *     gaps in the feed that read as "this person was asleep".
 *   - Bursty, sloppy timing: trades in clusters of 2-5, then goes quiet; direction
 *     mostly follows gut (momentum) but is wrong ~30% of the time.
 *   - Ragged, human-looking sizes.
 *   - Occasional fat-finger: a ~10× oversized open immediately corrected by a
 *     close on the next tick (~5s later) — the classic "oops, wrong size" tell.
 *
 * IST is computed by offsetting UTC by +5:30 so behavior is identical regardless
 * of the host machine's timezone.
 */

import type { Bot, MarketData, Order } from "../types.js";
import {
  PriceTracker,
  PositionMemory,
  choosePair,
  round3,
  randInt,
  defaultRng,
  defaultClock,
  type Rng,
  type Clock,
} from "./support.js";

const IST_OFFSET_MIN = 330; // +5:30

export class SleeperBot implements Bot {
  private readonly tracker = new PriceTracker();
  private readonly mem = new PositionMemory();
  private readonly rng: Rng;
  private readonly now: Clock;

  private burst = 0;
  private correctPending: string | null = null;

  constructor(
    public readonly id: number,
    opts: { rng?: Rng; now?: Clock } = {},
  ) {
    this.rng = opts.rng ?? defaultRng;
    this.now = opts.now ?? defaultClock;
  }

  /** Awake on an IST day: active 09:00–01:00, asleep 01:00–09:00. */
  private awake(): boolean {
    const d = new Date(this.now());
    const istMin = (d.getUTCHours() * 60 + d.getUTCMinutes() + IST_OFFSET_MIN) % 1440;
    const hour = Math.floor(istMin / 60);
    return hour >= 9 || hour < 1;
  }

  decide(market: MarketData): Order | null {
    this.tracker.observe(market);

    // Fat-finger correction fires first — the "oops" close, seconds later.
    if (this.correctPending) {
      const pair = this.correctPending;
      this.correctPending = null;
      if (this.mem.has(pair)) {
        const closingSide = this.mem.side(pair) === "BUY" ? "SELL" : "BUY";
        this.mem.close(pair);
        return { side: closingSide, pair, size: 0, close: true, note: "fat-finger correction" };
      }
    }

    if (!this.awake()) return null;

    const pair = choosePair(market, "ETH/USD");
    if (!pair) return null;
    const price = (market[pair] as { price: number }).price;

    // Bursty cadence: keep firing inside a burst, else occasionally start one.
    let act = false;
    if (this.burst > 0) {
      this.burst--;
      act = this.rng() < 0.8;
    } else if (this.rng() < 0.06) {
      this.burst = randInt(this.rng, 2, 5);
      act = true;
    }
    if (!act) return null;

    let size = round3(0.05 + this.rng() * 0.45); // ragged 0.05–0.5
    let note: string | undefined;

    // Rare fat-finger — 10× and correct it next tick.
    if (this.rng() < 0.03) {
      size = round3(size * 10);
      this.correctPending = pair;
      note = "fat-finger";
    }

    // Direction follows gut (momentum) but is sloppy ~30% of the time.
    const mom = this.tracker.runLength(pair);
    let side: "BUY" | "SELL" = mom >= 0 ? "BUY" : "SELL";
    if (this.rng() < 0.3) side = side === "BUY" ? "SELL" : "BUY";

    this.mem.open(pair, side, price, size);
    return { side, pair, size, note };
  }
}
