"use client";

import { useId, useState } from "react";
import type { Verdict } from "@/lib/types";
import { fmtMult } from "@/lib/format";

/*
 * The verdict control. -100 = certain HUMAN, +100 = certain BOT, 0 = no call.
 * Distance past the neutral zone sets confidence and payout multiplier.
 * Native range input underneath = full keyboard + screen reader support.
 */

const NEUTRAL = 15;

export function multiplierFor(v: number): number {
  const conf = Math.max(0, Math.abs(v) - NEUTRAL) / (100 - NEUTRAL);
  return 1.2 + conf * 1.3;
}

export function verdictFor(v: number): Verdict | null {
  if (v <= -NEUTRAL) return "human";
  if (v >= NEUTRAL) return "bot";
  return null;
}

export function confidenceFor(v: number): number {
  return Math.max(0, Math.abs(v) - NEUTRAL) / (100 - NEUTRAL);
}

/* Magnetic zones: dead-center, half-conviction, full-conviction. */
function snap(v: number): number {
  if (Math.abs(v) < NEUTRAL) return 0;
  if (Math.abs(v) > 92) return Math.sign(v) * 100;
  if (Math.abs(Math.abs(v) - 55) < 7) return Math.sign(v) * 55;
  return v;
}

export function VerdictSlider({
  value,
  onChange,
  onCommit,
  disabled = false,
  crowdBotPct,
}: {
  value: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  disabled?: boolean;
  crowdBotPct?: number;
}) {
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const verdict = verdictFor(value);
  const conf = confidenceFor(value);
  const mult = multiplierFor(value);

  const fillColor =
    verdict === "human" ? "var(--color-human)" : verdict === "bot" ? "var(--color-bot)" : "var(--color-line)";
  const half = Math.abs(value) / 2; // % width from center

  const commit = () => {
    setDragging(false);
    const snapped = snap(value);
    if (snapped !== value) onChange(snapped);
    onCommit(snapped);
  };

  return (
    <div className={disabled ? "opacity-50" : ""}>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="type-stamp text-2xs text-human">
          HUMAN
        </label>
        <span className="type-stamp text-2xs text-bot">BOT</span>
      </div>

      <div className="relative h-9 rounded-sm border border-line bg-bg">
        {/* center neutral zone */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-1/2 w-[15%] -translate-x-1/2 border-x border-dashed border-line"
        />
        {/* center tick */}
        <div aria-hidden="true" className="absolute inset-y-2 left-1/2 w-px bg-line" />
        {/* fill from center toward verdict */}
        <div
          aria-hidden="true"
          className="absolute inset-y-1 transition-[width] duration-100"
          style={{
            width: `${half}%`,
            ...(value >= 0 ? { left: "50%" } : { right: "50%" }),
            background: fillColor,
            opacity: verdict ? 0.28 + conf * 0.35 : 0.25,
          }}
        />
        <input
          id={id}
          type="range"
          min={-100}
          max={100}
          step={1}
          value={value}
          disabled={disabled}
          className="verdict-input absolute inset-0"
          aria-label="Verdict: slide left for human, right for bot. Further means more confident."
          aria-valuetext={
            verdict
              ? `${verdict === "bot" ? "Bot" : "Human"}, ${Math.round(conf * 100)} percent conviction, ${fmtMult(mult)} multiplier`
              : "No call"
          }
          onChange={(e) => {
            setDragging(true);
            onChange(Number(e.target.value));
          }}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={() => dragging && commit()}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between font-mono text-2xs tabular-nums">
        {verdict ? (
          <span style={{ color: fillColor }} className="type-stamp text-2xs">
            {verdict.toUpperCase()} · {Math.round(conf * 100)}%
          </span>
        ) : (
          <span className="text-dim">no call</span>
        )}
        <span className={verdict ? "text-accent" : "text-dim"}>{fmtMult(verdict ? mult : 1)}</span>
      </div>

      {typeof crowdBotPct === "number" && (
        <div className="mt-1.5 flex items-center gap-2">
          <div
            className="flex h-1 flex-1 overflow-hidden rounded-sm"
            role="img"
            aria-label={`Crowd split: ${100 - crowdBotPct} percent say human, ${crowdBotPct} percent say bot`}
          >
            <div className="bg-human/70" style={{ width: `${100 - crowdBotPct}%` }} />
            <div className="bg-bot/70" style={{ width: `${crowdBotPct}%` }} />
          </div>
          <span className="font-mono text-[10px] tabular-nums text-dim">
            {crowdBotPct >= 50 ? `${crowdBotPct}% say BOT` : `${100 - crowdBotPct}% say HUMAN`}
          </span>
        </div>
      )}
    </div>
  );
}
