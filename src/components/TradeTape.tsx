"use client";

import { useEffect, useRef, useState } from "react";
import type { Suspect, Trade } from "@/lib/types";
import { nextTrade } from "@/lib/mock";
import { fmtPnl, fmtPrice, fmtSize } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMounted } from "@/lib/useMounted";

/*
 * Live trade tape. Fixed column header, right-aligned numerics, fixed
 * decimal formats (size .2f, price .4f, pnl .2f) — never truncated.
 * Hover a row to flag that suspect's card; click the suspect ID to filter.
 */

const FULL_COLS = "grid-cols-[3.5rem_2.4rem_2.5rem_4.5rem_1fr_4.2rem_3.7rem]";
const COMPACT_COLS = "grid-cols-[3.5rem_2.5rem_4.5rem_1fr_4.2rem_3.7rem]";

export function TradeTape({
  suspects,
  rows = 18,
  compact = false,
  className = "",
  filterSuspect = null,
  onHoverSuspect,
  onSelectSuspect,
}: {
  suspects: Suspect[];
  rows?: number;
  compact?: boolean;
  className?: string;
  filterSuspect?: number | null;
  onHoverSuspect?: (id: number | null) => void;
  onSelectSuspect?: (id: number) => void;
}) {
  const mounted = useMounted();
  const [trades, setTrades] = useState<Trade[]>([]);
  const paused = useRef(false);
  const counter = useRef(0);
  const filterRef = useRef<number | null>(filterSuspect);

  useEffect(() => {
    filterRef.current = filterSuspect;
  }, [filterSuspect]);

  useEffect(() => {
    if (!mounted) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!paused.current) {
        // bias generation toward the filtered suspect so its tape stays live
        const f = filterRef.current;
        const s =
          f !== null && counter.current % 2 === 0
            ? (suspects.find((x) => x.id === f) ?? suspects[0])
            : suspects[Math.floor(Math.random() * suspects.length)];
        counter.current += 1;
        const t = nextTrade(Math.random, s.id, counter.current);
        setTrades((prev) => [t, ...prev].slice(0, 80));
      }
      timer = setTimeout(tick, 1000 + Math.random() * 3000);
    };
    // seed with backdated, jittered timestamps — no same-second pileups
    let at = Date.now();
    const seed: Trade[] = Array.from({ length: Math.min(rows, 14) }, (_, i) => {
      counter.current += 1;
      at -= 1200 + Math.random() * 12000;
      return nextTrade(Math.random, suspects[i % suspects.length].id, counter.current, new Date(at));
    });
    setTrades(seed);
    timer = setTimeout(tick, 900);
    return () => clearTimeout(timer);
  }, [mounted, suspects, rows]);

  const cols = compact ? COMPACT_COLS : FULL_COLS;
  const visible = (filterSuspect !== null ? trades.filter((t) => t.suspectId === filterSuspect) : trades).slice(0, rows);

  return (
    <div
      className={`overflow-hidden ${className}`}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      aria-label="Live trade tape. Hover to pause."
    >
      {/* fixed column header */}
      <div
        className={`grid ${cols} gap-x-2 border-b border-line pb-1 pt-0.5 font-mono text-[9px] text-dim`}
        aria-hidden="true"
      >
        <span>Time</span>
        {!compact && <span>Susp</span>}
        <span>Side</span>
        <span>Pair</span>
        <span className="text-right">Size</span>
        <span className="text-right">Price</span>
        <span className="text-right">PnL/USDT</span>
      </div>

      {!mounted ? (
        <div className="space-y-1.5 pt-2" aria-hidden="true">
          {Array.from({ length: compact ? 5 : 12 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ) : (
        <ol className="m-0 list-none p-0">
          {visible.map((t, i) => (
            <li
              key={t.id}
              onMouseEnter={() => onHoverSuspect?.(t.suspectId)}
              onMouseLeave={() => onHoverSuspect?.(null)}
              className={`grid ${cols} items-baseline gap-x-2 border-b border-line/60 py-[3px] font-mono text-2xs tabular-nums transition-colors duration-150 hover:bg-raised ${
                i === 0 ? "animate-tick-in row-flash" : ""
              }`}
            >
              <span className="text-dim">{t.ts}</span>
              {!compact &&
                (onSelectSuspect ? (
                  <button
                    type="button"
                    onClick={() => onSelectSuspect(t.suspectId)}
                    className="cursor-pointer text-left text-dim underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline"
                    aria-label={`Filter tape to suspect ${t.suspectId}`}
                  >
                    S#{String(t.suspectId).padStart(2, "0")}
                  </button>
                ) : (
                  <span className="text-dim">S#{String(t.suspectId).padStart(2, "0")}</span>
                ))}
              <span className={t.side === "BUY" ? "text-ink" : "text-dim"}>{t.side}</span>
              <span className="text-dim">{t.pair}</span>
              <span className="text-right text-ink">{fmtSize(t.size)}</span>
              <span className="text-right text-dim">{fmtPrice(t.price)}</span>
              <span className={`text-right ${t.pnl === 0 ? "text-dim" : t.pnl > 0 ? "text-ink" : "text-loss"}`}>
                {t.pnl === 0 ? "—" : fmtPnl(t.pnl)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
