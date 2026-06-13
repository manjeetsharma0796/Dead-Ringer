"use client";

import { useEffect, useMemo, useState } from "react";
import { AGENTS_HTTP } from "./env";
import type { Suspect, SuspectStats } from "./types";

/** Raw shape returned by GET /suspects on the agents backend. */
interface BackendSuspect {
  suspectId: number; // 1-indexed, matches frontend ids
  trades24h: number;
  winRate: number;
  avgHoldMin: number;
  maxDrawdown: number;
  volatility: number;
  activeHours?: number;
  panicSellCount?: number;
}

export type StatsStatus = "loading" | "live" | "mock";

export interface SuspectStatsFeed {
  /** Real stats keyed by frontend (1-indexed) suspect id, when available. */
  stats: Record<number, SuspectStats>;
  status: StatsStatus;
}

function mapStats(s: BackendSuspect): SuspectStats {
  return {
    trades24h: Math.round(s.trades24h),
    winRate: Math.round(s.winRate),
    avgHoldMin: Math.round(s.avgHoldMin),
    maxDrawdown: Math.round(s.maxDrawdown * 10) / 10,
    volatility: Math.round(s.volatility * 100) / 100,
  };
}

/**
 * Fetches GET /suspects and maps the quantified fields the UI reads. On any
 * failure it returns an empty map + "mock" status so callers keep their
 * deterministic mock stats (DR-313 — never white-screen).
 */
export function useSuspectStats(): SuspectStatsFeed {
  const [stats, setStats] = useState<Record<number, SuspectStats>>({});
  const [status, setStatus] = useState<StatsStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${AGENTS_HTTP}/suspects`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as BackendSuspect[];
        if (cancelled) return;
        const map: Record<number, SuspectStats> = {};
        for (const s of data) {
          if (typeof s.suspectId === "number") map[s.suspectId] = mapStats(s);
        }
        setStats(map);
        setStatus(Object.keys(map).length > 0 ? "live" : "mock");
      } catch {
        if (!cancelled) {
          setStats({});
          setStatus("mock");
        }
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, []);

  return { stats, status };
}

/**
 * Overlays real stats onto the presentational mock suspects. Cosmetic fields
 * (codename, alias, tells, series, activity) stay deterministic by id; only the
 * quantified `stats` are replaced when a live value exists for that id.
 */
export function useSuspectsWithStats(base: Suspect[]): {
  suspects: Suspect[];
  status: StatsStatus;
} {
  const { stats, status } = useSuspectStats();
  const suspects = useMemo(
    () =>
      base.map((s) => (stats[s.id] ? { ...s, stats: stats[s.id] } : s)),
    [base, stats],
  );
  return { suspects, status };
}
