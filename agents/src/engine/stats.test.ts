/**
 * Unit tests for the DR-207 behavioral-stats functions.
 * Uses Node's built-in test runner (node:test) — zero extra dependencies.
 * Run: `npm test` (compiles, then `node --test dist/`).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { computeSuspectStats } from "./stats.js";
import type { Trade } from "../types.js";

/** Build a Trade with sane defaults; override only what a test cares about. */
function tr(p: Partial<Trade>): Trade {
  return {
    id: "t",
    ts: "00:00:00",
    side: "BUY",
    pair: "ETH/USD",
    size: 1,
    price: 100,
    pnl: 0,
    suspectId: 1,
    ...p,
  };
}

test("empty trade list → all zeros", () => {
  const s = computeSuspectStats([]);
  assert.equal(s.trades24h, 0);
  assert.equal(s.winRate, 0);
  assert.equal(s.avgHoldMin, 0);
  assert.equal(s.maxDrawdown, 0);
  assert.equal(s.volatility, 0);
  assert.equal(s.activeHours, 0);
  assert.equal(s.panicSellCount, 0);
});

test("winRate is share of closed trades in profit", () => {
  const s = computeSuspectStats([
    tr({ pnl: 0 }), // open (ignored)
    tr({ side: "SELL", pnl: 10 }), // win
    tr({ pnl: 0 }),
    tr({ side: "SELL", pnl: -5 }), // loss
  ]);
  assert.equal(s.winRate, 50);
});

test("avgHoldMin pairs the open with its close", () => {
  const s = computeSuspectStats([
    tr({ ts: "00:00:00", pnl: 0 }), // open
    tr({ ts: "00:10:00", side: "SELL", pnl: 5 }), // close 10 min later
  ]);
  assert.equal(s.avgHoldMin, 10);
});

test("avgHoldMin handles a midnight-crossing hold", () => {
  const s = computeSuspectStats([
    tr({ ts: "23:55:00", pnl: 0 }),
    tr({ ts: "00:05:00", side: "SELL", pnl: 1 }), // 10 min across midnight
  ]);
  assert.equal(s.avgHoldMin, 10);
});

test("panicSellCount counts losing sells only", () => {
  const s = computeSuspectStats([
    tr({ pnl: 0 }),
    tr({ side: "SELL", pnl: -3 }), // panic sell
    tr({ pnl: 0 }),
    tr({ side: "SELL", pnl: 4 }), // winning sell — not panic
    tr({ side: "BUY", pnl: -2 }), // losing buy-to-close — not a sell
  ]);
  assert.equal(s.panicSellCount, 1);
});

test("activeHours counts distinct clock-hours", () => {
  const s = computeSuspectStats([
    tr({ ts: "09:00:00", pnl: 0 }),
    tr({ ts: "09:30:00", side: "SELL", pnl: 1 }),
    tr({ ts: "14:00:00", pnl: 0 }),
  ]);
  assert.equal(s.activeHours, 2); // hours 9 and 14
});
