/**
 * Per-suspect behavioral stats (DR-207).
 *
 * Pure, read-only functions over the trade log — no engine state, no I/O.
 * Everything is derived from the canonical Trade shape, so the numbers are
 * STABLE regardless of how bots are tuned or how the economic model lands:
 * a "tell" is a measurement, not a game rule. That is why this is safe to ship
 * ahead of the spec — it can't be invalidated by it.
 *
 * Fills the frontend SuspectStats contract exactly, plus two extra tells
 * (activeHours, panicSellCount) the dossier UI can surface.
 */

import type { Trade } from "../types.js";

/** Mirrors web/src/lib/types.ts SuspectStats, plus two extra behavioral tells. */
export interface SuspectStats {
  trades24h: number; // total trades on record for this suspect
  winRate: number; // % of closed trades with positive PnL (0 if none closed)
  avgHoldMin: number; // avg minutes a position stays open (0 if none closed)
  maxDrawdown: number; // worst peak-to-trough on the realized-PnL curve, as a negative % (0 if flat)
  volatility: number; // stdev of per-close return %, a spread-of-outcomes tell (0 if <2 closes)
  activeHours: number; // distinct clock-hours the suspect traded in (cadence tell)
  panicSellCount: number; // losing sells — closed a long at a loss (capitulation tell)
}

const SECONDS_PER_DAY = 86400;

/** "HH:MM:SS" → seconds since midnight. Returns 0 on a malformed string. */
function toSeconds(ts: string): number {
  const parts = ts.split(":");
  if (parts.length !== 3) return 0;
  const [h, m, s] = parts.map((p) => Number(p));
  if (![h, m, s].every((n) => Number.isFinite(n))) return 0;
  return h * 3600 + m * 60 + s;
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/**
 * Compute behavioral stats for one suspect from its trades, assumed to be in
 * chronological (append) order — which is how the trade log stores them.
 */
export function computeSuspectStats(trades: Trade[]): SuspectStats {
  const closed = trades.filter((t) => t.pnl !== 0);

  // winRate ─ share of closed trades that realized a profit.
  const wins = closed.filter((t) => t.pnl > 0).length;
  const winRate = closed.length > 0 ? round((wins / closed.length) * 100) : 0;

  // avgHoldMin ─ pair the first open of a position with its close, per pair.
  // pnl === 0 is an open/add; pnl !== 0 is a close. The engine holds at most one
  // position per (suspect, pair), so the cycle is: entry set → close → flat.
  const entryByPair = new Map<string, number>();
  const holdsSec: number[] = [];
  for (const t of trades) {
    const secs = toSeconds(t.ts);
    if (t.pnl === 0) {
      if (!entryByPair.has(t.pair)) entryByPair.set(t.pair, secs); // first open
    } else {
      const entry = entryByPair.get(t.pair);
      if (entry !== undefined) {
        let hold = secs - entry;
        if (hold < 0) hold += SECONDS_PER_DAY; // crossed midnight
        holdsSec.push(hold);
        entryByPair.delete(t.pair);
      }
    }
  }
  const avgHoldMin =
    holdsSec.length > 0
      ? round(holdsSec.reduce((a, b) => a + b, 0) / holdsSec.length / 60)
      : 0;

  // maxDrawdown ─ worst peak-to-trough on the cumulative realized-PnL curve, %.
  let equity = 0;
  let peak = 0;
  let maxDd = 0;
  for (const t of closed) {
    equity += t.pnl;
    if (equity > peak) peak = equity;
    if (peak > 0) {
      const dd = ((equity - peak) / peak) * 100;
      if (dd < maxDd) maxDd = dd;
    }
  }
  const maxDrawdown = round(maxDd);

  // volatility ─ stdev of per-close return % (pnl over the close notional).
  const returns = closed.map((t) => {
    const notional = t.price * t.size;
    return notional > 0 ? (t.pnl / notional) * 100 : 0;
  });
  const volatility = round(stdev(returns));

  // activeHours ─ distinct clock-hours the suspect traded in.
  const hours = new Set<number>();
  for (const t of trades) hours.add(Math.floor(toSeconds(t.ts) / 3600));
  const activeHours = hours.size;

  // panicSellCount ─ closed a long at a loss (emitted side SELL, pnl < 0).
  const panicSellCount = closed.filter(
    (t) => t.side === "SELL" && t.pnl < 0,
  ).length;

  return {
    trades24h: trades.length,
    winRate,
    avgHoldMin,
    maxDrawdown,
    volatility,
    activeHours,
    panicSellCount,
  };
}
