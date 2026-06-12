"use client";

import { useState } from "react";
import { FolderOpen, Pin, X } from "lucide-react";
import type { Suspect } from "@/lib/types";
import { useStore } from "@/lib/store";
import { fmtHold, fmtMult, fmtPct } from "@/lib/format";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { Sparkline } from "@/components/ui/Sparkline";
import { TellChip } from "@/components/ui/TellChip";
import {
  VerdictSlider,
  confidenceFor,
  multiplierFor,
  verdictFor,
} from "@/components/VerdictSlider";

export type Density = "compact" | "comfortable";

export function DossierCard({
  suspect,
  onOpenFile,
  density = "compact",
  highlighted = false,
  pinned = false,
  onTogglePin,
}: {
  suspect: Suspect;
  onOpenFile: (s: Suspect) => void;
  density?: Density;
  highlighted?: boolean;
  pinned?: boolean;
  onTogglePin?: (id: number) => void;
}) {
  const { slip, setVerdict, clearVerdict, locked, toast } = useStore();
  const entry = slip[suspect.id];
  const [value, setValue] = useState(() =>
    entry ? (entry.verdict === "bot" ? 1 : -1) * (15 + entry.confidence * 85) : 0,
  );

  const compact = density === "compact";
  const verdict = verdictFor(value);
  const borderColor = highlighted
    ? "var(--color-ink)"
    : verdict
      ? verdict === "human"
        ? `rgba(249,115,22,${0.35 + confidenceFor(value) * 0.65})`
        : `rgba(217,217,217,${0.35 + confidenceFor(value) * 0.65})`
      : "var(--color-line)";

  const commit = (v: number) => {
    const vd = verdictFor(v);
    if (vd) {
      setVerdict(suspect.id, vd, confidenceFor(v), multiplierFor(v));
    } else if (entry) {
      clearVerdict(suspect.id);
      toast(`${suspect.codename} removed from slip`);
    }
  };

  const s = suspect.stats;
  const stats: Array<[string, string, string]> = [
    ["TRD/24H", String(s.trades24h), "text-ink"],
    ["WIN", `${s.winRate}%`, "text-ink"],
    ["HOLD", fmtHold(s.avgHoldMin), "text-ink"],
    ["MAXDD", `${s.maxDrawdown.toFixed(1)}%`, "text-loss"],
  ];

  return (
    <article
      className={`hud lift relative flex flex-col rounded-md border bg-surface transition-colors duration-150 ${
        compact ? "gap-2 p-2.5" : "gap-4 p-5"
      }`}
      style={{ borderColor }}
      aria-label={`Dossier for ${suspect.codename}, alias ${suspect.alias}`}
    >
      {locked && entry && (
        <div
          aria-hidden="true"
          className="type-stamp pointer-events-none absolute right-2 top-2 z-10 -rotate-12 border-2 border-accent px-1.5 py-px text-2xs text-accent"
        >
          LOCKED
        </div>
      )}

      {/* header */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-mono text-2xs text-dim">
            S#{String(suspect.id).padStart(2, "0")}
          </span>
          <ScrambleText
            as="h3"
            text={suspect.alias}
            duration={600}
            delay={suspect.id * 90}
            rescrambleOnHover
            className={`type-stamp truncate text-ink ${compact ? "text-sm" : "text-lg"}`}
          />
          <span className="redaction shrink-0 px-3 text-2xs" aria-label="identity redacted">
            ID
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          {onTogglePin && (
            <button
              type="button"
              onClick={() => onTogglePin(suspect.id)}
              aria-pressed={pinned}
              aria-label={pinned ? `Unpin ${suspect.codename} from compare` : `Pin ${suspect.codename} to compare`}
              className={`cursor-pointer rounded-sm border p-1.5 transition-colors duration-150 ${
                pinned
                  ? "border-dim text-ink"
                  : "border-line text-dim hover:border-dim hover:text-ink"
              }`}
            >
              <Pin size={12} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenFile(suspect)}
            aria-label={`Open full file for ${suspect.codename}`}
            className="cursor-pointer rounded-sm border border-line p-1.5 text-dim transition-colors duration-150 hover:border-dim hover:text-ink"
          >
            <FolderOpen size={12} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* quantified stats */}
      <dl className={`grid grid-cols-4 gap-x-2 ${compact ? "" : "gap-x-4"}`}>
        {stats.map(([label, val, tone]) => (
          <div key={label} className="min-w-0">
            <dt className="font-mono text-[9px] text-dim">{label}</dt>
            <dd className={`font-mono text-2xs font-bold tabular-nums ${tone}`}>{val}</dd>
          </div>
        ))}
      </dl>

      {/* sparkline */}
      <div className="flex items-end gap-2">
        <Sparkline
          data={suspect.series}
          height={compact ? 30 : 48}
          interactive
          className={`min-w-0 flex-1 ${compact ? "h-8" : "h-12"}`}
        />
        <div className="shrink-0 text-right">
          <div className="font-mono text-[9px] text-dim">24H</div>
          <div
            className={`font-mono text-2xs font-bold tabular-nums ${
              suspect.returnPct >= 0 ? "text-ink" : "text-loss"
            }`}
          >
            {fmtPct(suspect.returnPct)}
          </div>
        </div>
      </div>

      {/* two unique qualitative tells */}
      <div className="flex flex-wrap gap-1.5">
        {suspect.tells.map((t) => (
          <TellChip key={t.label} label={t.label} hint={t.hint} />
        ))}
      </div>

      {/* verdict + crowd */}
      <div className={`border-t border-line ${compact ? "pt-2" : "pt-4"}`}>
        <VerdictSlider
          value={value}
          onChange={setValue}
          onCommit={commit}
          disabled={locked}
          crowdBotPct={suspect.crowdBotPct}
        />
      </div>

      {entry && !locked && (
        <div className="flex items-center justify-between font-mono text-2xs">
          <span className="text-dim">
            On slip:{" "}
            <span className={entry.verdict === "bot" ? "text-bot" : "text-human"}>
              {entry.verdict.toUpperCase()}
            </span>{" "}
            <span className="text-accent">{fmtMult(entry.multiplier)}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              clearVerdict(suspect.id);
              setValue(0);
              toast(`${suspect.codename} removed from slip`);
            }}
            className="flex cursor-pointer items-center gap-1 text-dim transition-colors duration-150 hover:text-loss"
          >
            <X size={11} strokeWidth={2} aria-hidden="true" />
            Remove
          </button>
        </div>
      )}
    </article>
  );
}
