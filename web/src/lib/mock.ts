import type {
  AgentRow,
  DetectiveRow,
  RoundHistory,
  Suspect,
  Trade,
} from "./types";

/* Seeded PRNG (mulberry32) — deterministic so SSR markup matches hydration. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PAIRS = ["MNT/USDT", "ETH/MNT", "BTC/USDT", "ARB/USDT", "SOL/USDT"];

const CODENAMES = [
  "MIDNIGHT WHALE",
  "PAPER WOLF",
  "STATIC PILGRIM",
  "GLASS JAW",
  "COLD LEDGER",
  "VELVET SCALPEL",
  "PATIENT ZERO",
  "RUST SIGNAL",
  "HOLLOW TICK",
  "QUIET CANDLE",
];

/* 16 qualitative tells — 2 per suspect, never repeated across the round. */
const TELL_POOL: Array<[string, string]> = [
  ["sizes round lots", "Order sizes cluster on round numbers — a human habit."],
  ["chased a green candle", "Bought the top of a 4% pump. Very human."],
  ["sizes to 6 decimals", "Order sizes like 0.142857. Few humans type that."],
  ["identical stop placement", "Every stop-loss sits exactly 1.8% below entry."],
  ["skips weekends", "No fills Saturday–Sunday. Machines don't rest."],
  ["panic-sold a dip", "Closed at a loss within 60s of a 2% drawdown."],
  ["24/7 cadence", "Fills spread evenly across all 168 hours of the week."],
  ["split-second cancels", "Cancels and replaces orders inside 300ms."],
  ["revenge-traded a loss", "Doubled position size immediately after a losing close."],
  ["cools off after wins", "Goes quiet for ~40m after every profitable close."],
  ["fee-sensitive routing", "Routes orders to dodge taker fees. Methodical — or coded."],
  ["front-runs round numbers", "Bids stack just under .00 levels, every time."],
  ["typo-sized an order", "One fill at 10x usual size, closed seconds later."],
  ["never trades news spikes", "Flat through every volatility event this week."],
  ["drifts entry timing", "Entry timing wanders minute to minute, never periodic."],
  ["mirror-trades ETH moves", "Entries lag ETH price moves by a fixed beat."],
];

function makeTrades(
  r: () => number,
  suspectId: number,
  count: number,
): Trade[] {
  const trades: Trade[] = [];
  let h = 23;
  let m = Math.floor(r() * 60);
  for (let i = 0; i < count; i++) {
    m -= Math.floor(1 + r() * 22);
    while (m < 0) {
      m += 60;
      h -= 1;
      if (h < 0) h = 23;
    }
    const s = Math.floor(r() * 60);
    const win = r() > 0.45;
    const closed = r() > 0.4;
    trades.push({
      id: `t${suspectId}-${i}`,
      ts: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      side: r() > 0.5 ? "BUY" : "SELL",
      pair: PAIRS[Math.floor(r() * PAIRS.length)],
      size: Math.round((0.4 + r() * 380) * 100) / 100,
      price: Math.round((0.6 + r() * 4.4) * 10000) / 10000,
      pnl: closed ? Math.round((win ? 1 : -1) * r() * 140 * 100) / 100 : 0,
      suspectId,
    });
  }
  return trades;
}

function makeSeries(r: () => number, drift: number): number[] {
  const out: number[] = [];
  let v = 0;
  for (let i = 0; i < 48; i++) {
    v += (r() - 0.48 + drift) * 4;
    out.push(Math.round(v * 100) / 100);
  }
  return out;
}

function makeActivity(r: () => number, isBot: boolean): number[] {
  return Array.from({ length: 24 }, (_, h) => {
    if (isBot) return Math.round((0.45 + r() * 0.5) * 100) / 100;
    // humans: diurnal curve with noise
    const day = h >= 8 && h <= 22 ? 0.55 : 0.08;
    return Math.round(Math.min(1, day + r() * 0.35) * 100) / 100;
  });
}

function maxDrawdownOf(series: number[]): number {
  let peak = -Infinity;
  let dd = 0;
  for (const v of series) {
    peak = Math.max(peak, v);
    dd = Math.max(dd, peak - v);
  }
  return -Math.round(dd * 10) / 10;
}

function volatilityOf(series: number[]): number {
  const diffs = series.slice(1).map((v, i) => v - series[i]);
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const variance = diffs.reduce((a, b) => a + (b - mean) ** 2, 0) / diffs.length;
  return Math.round(Math.sqrt(variance) * 100) / 100;
}

/* Tell assignment is disjoint: suspect i gets pool[2i] and pool[2i+1]. */
export function makeSuspects(seed = 7): Suspect[] {
  const r = rng(seed);
  const bots = new Set<number>();
  while (bots.size < 4) bots.add(Math.floor(r() * 8));
  return Array.from({ length: 8 }, (_, i) => {
    const isBot = bots.has(i);
    const series = makeSeries(r, isBot ? 0.012 : 0);
    const trades = makeTrades(r, i + 1, 18);
    const closed = trades.filter((t) => t.pnl !== 0);
    const wins = closed.filter((t) => t.pnl > 0);
    return {
      id: i + 1,
      codename: `SUSPECT #${String(i + 1).padStart(2, "0")}`,
      alias: CODENAMES[i],
      isBot,
      series,
      returnPct: Math.round(series[series.length - 1] * 10) / 10,
      stats: {
        trades24h: Math.floor(isBot ? 80 + r() * 160 : 12 + r() * 40),
        winRate: Math.round((wins.length / Math.max(1, closed.length)) * 100),
        avgHoldMin: Math.round(isBot ? 3 + r() * 45 : 18 + r() * 260),
        maxDrawdown: maxDrawdownOf(series),
        volatility: volatilityOf(series),
      },
      tells: [TELL_POOL[i * 2], TELL_POOL[i * 2 + 1]].map(([label, hint]) => ({ label, hint })),
      crowdBotPct: Math.round(18 + r() * 64),
      activity: makeActivity(r, isBot),
      trades,
    };
  });
}

/* One live trade, for ticking feeds. Caller supplies its own rng and timestamp. */
export function nextTrade(r: () => number, suspectId: number, n: number, at?: Date): Trade {
  const d = at ?? new Date();
  const win = r() > 0.45;
  return {
    id: `live-${suspectId}-${n}`,
    ts: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`,
    side: r() > 0.5 ? "BUY" : "SELL",
    pair: PAIRS[Math.floor(r() * PAIRS.length)],
    size: Math.round((0.4 + r() * 380) * 100) / 100,
    price: Math.round((0.6 + r() * 4.4) * 10000) / 10000,
    pnl: r() > 0.55 ? Math.round((win ? 1 : -1) * r() * 140 * 100) / 100 : 0,
    suspectId,
  };
}

const DETECTIVE_TITLES = ["Oracle", "Profiler", "Profiler", "Investigator", "Investigator", "Investigator", "Rookie"];
const HANDLES = ["0xKnife", "tape_reader", "lambchop", "NULLREF", "quietfish", "MorseDecoder", "salt_miner", "veritas", "inkblot", "ghostcandle", "fee_goblin", "DELTA-9"];
const AGENT_NAMES = ["LULLABY", "WET PAINT", "BLUE MONDAY", "SLEEPER-6", "CASSANDRA", "DIAL TONE", "MAYFLY", "BAD PENNY"];
const BUILDERS = ["studio/noir", "0xAtelier", "machina.dev", "twohands", "latentlab", "kunst.eth", "soloyolo", "deepfried"];

export function makeDetectives(seed = 11): DetectiveRow[] {
  const r = rng(seed);
  return HANDLES.map((handle, i) => ({
    rank: i + 1,
    handle,
    title: DETECTIVE_TITLES[Math.min(i, DETECTIVE_TITLES.length - 1)],
    accuracy: Math.round((78 - i * 2.4 - r() * 3) * 10) / 10,
    winnings: Math.round(4200 / (i + 1) + r() * 300),
    rounds: Math.floor(8 + r() * 40),
  }));
}

export function makeAgents(seed = 13): AgentRow[] {
  const r = rng(seed);
  return AGENT_NAMES.map((agent, i) => ({
    rank: i + 1,
    agent,
    builder: BUILDERS[i],
    foolRate: Math.round((81 - i * 5.5 - r() * 4) * 10) / 10,
    roundsSurvived: Math.floor(9 - i * 0.8 + r() * 3),
    status: r() > 0.25 ? "active" : "retired",
  }));
}

export function makeHistory(seed = 17): RoundHistory[] {
  const r = rng(seed);
  return Array.from({ length: 7 }, (_, i) => {
    const round = 7 - i;
    const called = Math.floor(4 + r() * 4);
    const correct = Math.max(1, Math.floor(called * (0.4 + r() * 0.5)));
    return {
      round,
      date: `2026-0${round > 4 ? 6 : 5}-${String(3 + round * 3).padStart(2, "0")}`,
      called,
      correct,
      net: Math.round((correct / called - 0.52) * 400),
    };
  });
}

export const ROUND = {
  number: 7,
  pot: 12840,
  detectives: 412,
  closesInSec: 3 * 3600 + 12 * 60 + 44,
};
