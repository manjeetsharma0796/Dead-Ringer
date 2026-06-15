"use client";

import { ROUND_ID } from "@/lib/arena";
import { fmtMnt } from "@/lib/format";
import type { RoundData, RoundState } from "@/lib/useRound";

const PHASE_META: Record<RoundState, { label: string; tone: string; blurb: string }> = {
  Open: {
    label: "BETTING OPEN",
    tone: "border-accent text-accent",
    blurb: "Read the feeds and call HUMAN/BOT on each suspect before the round locks.",
  },
  Locked: {
    label: "BETTING CLOSED",
    tone: "border-dim text-dim",
    blurb: "The case is sealed. Identities are revealed on-chain shortly — no more calls.",
  },
  Revealed: {
    label: "DECLASSIFIED",
    tone: "border-human text-human",
    blurb: "Identities are open on-chain. See how you read the room on the Reveal page.",
  },
  Settled: {
    label: "SETTLED",
    tone: "border-accent text-accent",
    blurb: "Payouts are scored. Winners can claim their share of the pot.",
  },
};

export function RoundStatusBar({ round }: { round: RoundData }) {
  if (!round.onChain) return null;

  const meta = round.state ? PHASE_META[round.state] : null;

  return (
    <div className="mb-3 rounded-md border border-line bg-surface px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-2xs tabular-nums">
        <span className="type-stamp text-2xs text-ink">
          Round {ROUND_ID.toString()}
        </span>
        {meta ? (
          <span className={`type-stamp -rotate-1 border px-1.5 py-px text-[10px] ${meta.tone}`}>
            {round.loading ? "SYNCING…" : meta.label}
          </span>
        ) : (
          <span className="text-dim">{round.loading ? "syncing…" : "no round"}</span>
        )}
        <span className="text-dim">
          pot <span className="font-bold text-ink">{fmtMnt(round.potMnt)}</span>
        </span>
        <span className="text-dim">
          suspects <span className="font-bold text-ink">{round.suspectCount}</span>
        </span>
        {round.revealedCount > 0 && (
          <span className="text-dim">
            revealed{" "}
            <span className="font-bold text-ink">
              {round.revealedCount}/{round.suspectCount}
            </span>
          </span>
        )}
      </div>
      {meta && (
        <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-dim">
          {meta.blurb}
        </p>
      )}
    </div>
  );
}
