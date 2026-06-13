/**
 * Shared building blocks for the DR-203 bot personalities.
 *
 * Personalities are deliberately *stateful* — their believability comes from
 * reacting to recent price action and to their own open positions. These two
 * helpers hold that state so each personality file stays focused on its
 * behavioral fingerprint rather than bookkeeping.
 *
 * Both `rng` and `now` are injectable so the personalities are deterministically
 * testable (see `personalities.test.ts`). At runtime they default to
 * `Math.random` / `Date.now`.
 */

import type { MarketData } from "../types.js";

export type Rng = () => number;
export type Clock = () => number;

export const defaultRng: Rng = () => Math.random();
export const defaultClock: Clock = () => Date.now();

/** Pick a random integer in [min, max]. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick a random element of a non-empty array. */
export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

/** Round to 3 decimal places — keeps order sizes tidy in the trade log. */
export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Choose a pair to trade: the personality's preferred pair if the feed has it,
 * otherwise the first available pair. Returns null when the feed is empty.
 */
export function choosePair(market: MarketData, preferred?: string): string | null {
  const pairs = Object.keys(market);
  if (pairs.length === 0) return null;
  if (preferred && market[preferred]) return preferred;
  return pairs[0] as string;
}

/**
 * Rolling per-pair price history, fed one market snapshot per tick. Lets a
 * personality reason about momentum (run length) and per-tick deltas.
 */
export class PriceTracker {
  private hist = new Map<string, number[]>();

  constructor(private readonly cap = 16) {}

  /** Record the latest price for every pair in the snapshot. */
  observe(market: MarketData): void {
    for (const pair of Object.keys(market)) {
      const snap = market[pair];
      if (!snap) continue;
      const arr = this.hist.get(pair) ?? [];
      arr.push(snap.price);
      if (arr.length > this.cap) arr.shift();
      this.hist.set(pair, arr);
    }
  }

  prices(pair: string): number[] {
    return this.hist.get(pair) ?? [];
  }

  /** % change between the two most recent observations (0 if < 2 samples). */
  lastPct(pair: string): number {
    const p = this.prices(pair);
    if (p.length < 2) return 0;
    const a = p[p.length - 2] as number;
    const b = p[p.length - 1] as number;
    return a === 0 ? 0 : ((b - a) / a) * 100;
  }

  /**
   * Signed length of the current consecutive run: positive = up-run,
   * negative = down-run, magnitude = number of same-direction moves.
   */
  runLength(pair: string): number {
    const p = this.prices(pair);
    if (p.length < 2) return 0;
    let dir = 0;
    let run = 0;
    for (let i = p.length - 1; i > 0; i--) {
      const d = Math.sign((p[i] as number) - (p[i - 1] as number));
      if (d === 0) break;
      if (dir === 0) dir = d;
      if (d === dir) run++;
      else break;
    }
    return run * dir;
  }
}

interface Mirror {
  side: "BUY" | "SELL";
  entry: number;
  size: number;
}

/**
 * A personality's private view of its own open positions, mirroring the engine
 * (one position per pair). Entry prices match the engine because both act on
 * the same market snapshot. Used to drive stop-losses and revenge trades — the
 * `Bot.decide` interface only receives market data, not the bot's own PnL, so
 * each personality reconstructs its unrealized PnL locally.
 */
export class PositionMemory {
  private pos = new Map<string, Mirror>();

  /** Record (or overwrite, on a flip) the open position for a pair. */
  open(pair: string, side: "BUY" | "SELL", entry: number, size: number): void {
    this.pos.set(pair, { side, entry, size });
  }

  close(pair: string): void {
    this.pos.delete(pair);
  }

  has(pair: string): boolean {
    return this.pos.has(pair);
  }

  side(pair: string): "BUY" | "SELL" | null {
    return this.pos.get(pair)?.side ?? null;
  }

  /** Unrealized PnL % for the open position on `pair` at the current price. */
  unrealizedPct(pair: string, price: number): number {
    const m = this.pos.get(pair);
    if (!m || m.entry === 0) return 0;
    const raw = ((price - m.entry) / m.entry) * 100;
    return m.side === "BUY" ? raw : -raw;
  }
}
