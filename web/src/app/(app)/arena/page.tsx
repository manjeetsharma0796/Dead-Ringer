"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Suspect } from "@/lib/types";
import { SUSPECTS } from "@/lib/suspects";
import { ROUND } from "@/lib/mock";
import { fmtHold, fmtMnt, fmtPct } from "@/lib/format";
import { Countdown } from "@/components/ui/Countdown";
import { Skeleton } from "@/components/ui/Skeleton";
import { DossierCard, type Density } from "@/components/DossierCard";
import { SuspectDrawer } from "@/components/SuspectDrawer";
import { TradeTape } from "@/components/TradeTape";
import { useSuspectsWithStats } from "@/lib/useSuspectStats";
import { useRound } from "@/lib/useRound";
import { ROUND_ID } from "@/lib/arena";

type SortKey = "pnl" | "vol" | "uncertain";

const SORTS: Array<[SortKey, string, string]> = [
  ["pnl", "P&L", "Sort by 24h return, best first"],
  ["vol", "Volatility", "Sort by price-path volatility, wildest first"],
  ["uncertain", "Hardest", "Crowd closest to 50/50 first — the hardest cases"],
];

export default function ArenaPage() {
  const [open, setOpen] = useState<Suspect | null>(null);
  const [loading, setLoading] = useState(true);
  const [density, setDensity] = useState<Density>("compact");
  const [sort, setSort] = useState<SortKey>("pnl");
  const [pins, setPins] = useState<number[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [tapeFilter, setTapeFilter] = useState<number | null>(null);

  // Overlay real backend stats onto the presentational suspects (DR-313:
  // keeps mock stats on fetch failure). Cosmetic fields stay deterministic.
  const { suspects, status: statsStatus } = useSuspectsWithStats(SUSPECTS);

  // Live round header straight from the Arena contract (falls back to mock).
  const round = useRound();

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  // Show the loading grid until the min-delay elapses AND stats resolve.
  const showLoading = loading || statsStatus === "loading";

  const sorted = useMemo(() => {
    const arr = [...suspects];
    if (sort === "pnl") arr.sort((a, b) => b.returnPct - a.returnPct);
    if (sort === "vol") arr.sort((a, b) => b.stats.volatility - a.stats.volatility);
    if (sort === "uncertain")
      arr.sort((a, b) => Math.abs(a.crowdBotPct - 50) - Math.abs(b.crowdBotPct - 50));
    return arr;
  }, [sort, suspects]);

  const togglePin = (id: number) => {
    setPins((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (p.length < 2) return [...p, id];
      return [p[1], id]; // replace oldest pin
    });
  };

  const pinned = pins
    .map((id) => suspects.find((s) => s.id === id))
    .filter(Boolean) as Suspect[];

  return (
    <div>
      {/* slim round strip — pins under the nav */}
      <div className="sticky top-14 z-20 -mx-4 mb-3 border-b border-line bg-bg px-4 py-2 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-2xs tabular-nums">
          <span className="type-stamp text-2xs text-ink">
            Round {round.onChain ? Number(ROUND_ID) : ROUND.number}
          </span>
          {round.onChain ? (
            <span className="text-dim">
              status <span className="font-bold text-accent">{round.state ?? "—"}</span>
            </span>
          ) : (
            <span className="text-dim">
              closes <Countdown fromSeconds={ROUND.closesInSec} className="font-bold text-accent" />
            </span>
          )}
          <span className="text-dim">
            pot <span className="font-bold text-ink">{fmtMnt(round.onChain ? round.potMnt : ROUND.pot)}</span>
          </span>
          <span className="text-dim">
            detectives <span className="font-bold text-ink">{round.onChain ? round.detectives : ROUND.detectives}</span>
          </span>
          <span className="text-dim">
            suspects <span className="font-bold text-ink">{round.onChain && round.suspectCount ? round.suspectCount : suspects.length}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_27.5rem]">
        {/* lineup */}
        <section aria-label="Suspects">
          {/* toolbar */}
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1" role="group" aria-label="Sort suspects">
              <span className="mr-1 font-mono text-[9px] text-dim">Sort</span>
              {SORTS.map(([key, label, title]) => (
                <button
                  key={key}
                  type="button"
                  title={title}
                  aria-pressed={sort === key}
                  onClick={() => setSort(key)}
                  className={`cursor-pointer rounded-sm border px-2 py-1 text-xs font-medium transition-colors duration-150 ${
                    sort === key
                      ? "border-dim bg-raised text-ink"
                      : "border-line text-dim hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {pins.length === 1 && (
                <span className="font-mono text-[10px] text-dim">pin one more to compare</span>
              )}
              <div className="flex items-center gap-1" role="group" aria-label="Density">
                {(["compact", "comfortable"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={density === d}
                    onClick={() => setDensity(d)}
                    className={`cursor-pointer rounded-sm border px-2 py-1 text-xs font-medium transition-colors duration-150 ${
                      density === d
                        ? "border-dim bg-raised text-ink"
                        : "border-line text-dim hover:text-ink"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* compare panel */}
          {pinned.length === 2 && (
            <ComparePanel a={pinned[0]} b={pinned[1]} onClear={() => setPins([])} />
          )}

          {showLoading ? (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2" aria-label="Loading suspects">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="space-y-2 rounded-md border border-line bg-surface p-2.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 ${density === "compact" ? "gap-2.5" : "gap-5"}`}>
              {sorted.map((s) => (
                <DossierCard
                  key={s.id}
                  suspect={s}
                  onOpenFile={setOpen}
                  density={density}
                  highlighted={hovered === s.id}
                  pinned={pins.includes(s.id)}
                  onTogglePin={togglePin}
                />
              ))}
            </div>
          )}
        </section>

        {/* live tape rail */}
        <aside aria-label="Live trade tape" className="hidden xl:block xl:sticky xl:top-[6.5rem] xl:self-start">
          <div className="rounded-md border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-2.5 py-1.5">
              <span className="flex items-center gap-2 text-xs font-medium text-dim">
                <span aria-hidden="true" className="h-1.5 w-1.5 animate-blink bg-accent" />
                Live tape
              </span>
              {tapeFilter !== null && (
                <button
                  type="button"
                  onClick={() => setTapeFilter(null)}
                  className="flex cursor-pointer items-center gap-1 rounded-sm border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink"
                  aria-label="Clear tape filter"
                >
                  S#{String(tapeFilter).padStart(2, "0")}
                  <X size={10} strokeWidth={2.5} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="px-2.5 pb-1.5 pt-1">
              <TradeTape
                suspects={suspects}
                rows={32}
                filterSuspect={tapeFilter}
                onHoverSuspect={setHovered}
                onSelectSuspect={(id) => setTapeFilter((f) => (f === id ? null : id))}
              />
            </div>
          </div>
        </aside>
      </div>

      <SuspectDrawer suspect={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/* Two pinned suspects, overlaid sparklines on a shared scale + stat columns. */
function ComparePanel({ a, b, onClear }: { a: Suspect; b: Suspect; onClear: () => void }) {
  const all = [...a.series, ...b.series, 0];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const W = 600;
  const H = 90;
  const toPoints = (data: number[]) =>
    data
      .map(
        (v, i) =>
          `${((i / (data.length - 1)) * W).toFixed(1)},${(H - 3 - ((v - min) / span) * (H - 6)).toFixed(1)}`,
      )
      .join(" ");
  const zeroY = H - 3 - ((0 - min) / span) * (H - 6);

  const rows: Array<[string, string, string]> = [
    ["TRD/24H", String(a.stats.trades24h), String(b.stats.trades24h)],
    ["WIN", `${a.stats.winRate}%`, `${b.stats.winRate}%`],
    ["HOLD", fmtHold(a.stats.avgHoldMin), fmtHold(b.stats.avgHoldMin)],
    ["MAXDD", `${a.stats.maxDrawdown.toFixed(1)}%`, `${b.stats.maxDrawdown.toFixed(1)}%`],
    ["24H P&L", fmtPct(a.returnPct), fmtPct(b.returnPct)],
    ["CROWD: BOT", `${a.crowdBotPct}%`, `${b.crowdBotPct}%`],
  ];

  return (
    <section
      aria-label={`Comparing ${a.alias} and ${b.alias}`}
      className="mb-2.5 rounded-md border border-line bg-surface p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-4 font-mono text-2xs">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 bg-ink" />
            <span className="type-stamp text-2xs text-ink">{a.alias}</span>
          </span>
          <span className="text-dim">vs</span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 bg-dim" />
            <span className="type-stamp text-2xs text-ink">{b.alias}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex cursor-pointer items-center gap-1 rounded-sm border border-line px-2 py-1 text-xs font-medium text-dim transition-colors duration-150 hover:border-dim hover:text-ink"
        >
          <X size={10} strokeWidth={2.5} aria-hidden="true" />
          Clear
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_15rem]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-24 w-full"
          role="img"
          aria-label={`Overlaid 24-hour P&L: ${a.alias} ended at ${fmtPct(a.returnPct)}, ${b.alias} at ${fmtPct(b.returnPct)}`}
        >
          <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="var(--color-line)" strokeWidth="1" strokeDasharray="3 4" />
          <polyline points={toPoints(a.series)} fill="none" stroke="var(--color-ink)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <polyline points={toPoints(b.series)} fill="none" stroke="var(--color-dim)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <table className="w-full border-collapse font-mono text-2xs tabular-nums">
          <tbody>
            {rows.map(([label, va, vb]) => (
              <tr key={label} className="border-b border-line/50 last:border-0">
                <td className="py-1 pr-2 font-mono text-[9px] text-dim">{label}</td>
                <td className="py-1 pr-3 text-right text-ink">{va}</td>
                <td className="py-1 text-right text-dim">{vb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
