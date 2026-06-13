/**
 * Unit tests for the DR-203 bot personalities.
 * Uses Node's built-in test runner (node:test) — zero extra dependencies.
 * Run: `npm test` (compiles, then `node --test dist/`).
 *
 * Personalities take injectable `rng`/`now`, so every behavioral branch here is
 * deterministic despite the production bots being stochastic.
 */

import test from "node:test";
import assert from "node:assert/strict";
import type { MarketData } from "../types.js";
import { PriceTracker } from "./support.js";
import { QuantBot } from "./quant.js";
import { DegenBot } from "./degen.js";
import { SleeperBot } from "./sleeper.js";
import { PaperHandsBot } from "./paperHands.js";
import { createBots } from "./index.js";

/** Build a MarketData snapshot from { pair: price }. */
function mkt(prices: Record<string, number>): MarketData {
  const m: MarketData = {};
  for (const [pair, price] of Object.entries(prices)) {
    m[pair] = { pair, price, updatedAt: 0 };
  }
  return m;
}

// ── PriceTracker ────────────────────────────────────────────────────────────

test("PriceTracker.runLength is signed run length; lastPct is the last delta", () => {
  const t = new PriceTracker();
  t.observe(mkt({ "ETH/USD": 100 }));
  t.observe(mkt({ "ETH/USD": 101 }));
  t.observe(mkt({ "ETH/USD": 102 }));
  assert.equal(t.runLength("ETH/USD"), 2); // two consecutive up-moves
  assert.ok(Math.abs(t.lastPct("ETH/USD") - (1 / 101) * 100) < 1e-9);

  t.observe(mkt({ "ETH/USD": 101 })); // a down-move breaks the up-run
  assert.equal(t.runLength("ETH/USD"), -1);
});

// ── Paper Hands (deterministic) ─────────────────────────────────────────────

test("PaperHands buys the pump, sells the dip, ignores small moves", () => {
  const ph = new PaperHandsBot(4, { threshold: 1.5, size: 0.1 });
  assert.equal(ph.decide(mkt({ "BTC/USD": 100 })), null); // first sighting → baseline

  const pump = ph.decide(mkt({ "BTC/USD": 102 })); // +2% > +1.5%
  assert.equal(pump?.side, "BUY");

  const dip = ph.decide(mkt({ "BTC/USD": 99 })); // from new base 102 → ~-2.9%
  assert.equal(dip?.side, "SELL");

  const calm = ph.decide(mkt({ "BTC/USD": 99.5 })); // from base 99 → +0.5%
  assert.equal(calm, null);
});

// ── The Quant ───────────────────────────────────────────────────────────────

test("Quant trades round lots on cadence, then stop-losses a losing position", () => {
  const q = new QuantBot(1, { rng: () => 0, cadenceTicks: 1 });

  const open = q.decide(mkt({ "ETH/USD": 100 }));
  assert.equal(open?.side, "BUY"); // flat lastPct → fade buys
  assert.equal(open?.close, undefined);
  assert.ok([0.1, 0.5, 1.0].includes(open?.size as number)); // round lot only

  const stop = q.decide(mkt({ "ETH/USD": 99 })); // BUY now -1% → past the 0.5% stop
  assert.equal(stop?.close, true);
  assert.equal(stop?.note, "stop-loss 0.5%");
});

// ── The Sleeper ─────────────────────────────────────────────────────────────

test("Sleeper is silent during the IST night", () => {
  // UTC 21:30 → IST 03:00 → asleep.
  const nightMs = Date.UTC(2026, 0, 1, 21, 30, 0);
  const s = new SleeperBot(3, { rng: () => 0, now: () => nightMs });
  for (let i = 0; i < 10; i++) {
    assert.equal(s.decide(mkt({ "ETH/USD": 100 })), null);
  }
});

test("Sleeper trades when awake and corrects a fat-finger on the next tick", () => {
  // UTC 06:30 → IST 12:00 → awake. rng()=0 makes every gate fire → fat-finger.
  const dayMs = Date.UTC(2026, 0, 1, 6, 30, 0);
  const s = new SleeperBot(3, { rng: () => 0, now: () => dayMs });

  const open = s.decide(mkt({ "ETH/USD": 100 }));
  assert.equal(open?.note, "fat-finger");
  assert.equal(open?.close, undefined);

  const correction = s.decide(mkt({ "ETH/USD": 100 }));
  assert.equal(correction?.close, true);
  assert.equal(correction?.note, "fat-finger correction");
});

// ── The Degen ───────────────────────────────────────────────────────────────

test("Degen stands down when every impulse gate fails", () => {
  const d = new DegenBot(2, { rng: () => 0.99 });
  assert.equal(d.decide(mkt({ "BTC/USD": 100 })), null);
});

test("Degen takes an impulse trade when the gate passes", () => {
  const d = new DegenBot(2, { rng: () => 0 });
  const order = d.decide(mkt({ "BTC/USD": 100 }));
  assert.ok(order, "expected an impulse order");
  assert.equal(order?.pair, "BTC/USD");
});

// ── Registry ────────────────────────────────────────────────────────────────

test("createBots assigns personalities in order; Cut #3 drops Paper Hands", () => {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8];
  const bots = createBots(ids);
  assert.deepEqual(bots.map((b) => b.id), [1, 2, 3, 4]); // 4 bots, rest human

  const cut = createBots(ids, { disablePaperHands: true });
  assert.equal(cut.length, 3);
});
