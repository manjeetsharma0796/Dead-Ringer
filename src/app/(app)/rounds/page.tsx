"use client";

import Link from "next/link";
import { makeHistory, ROUND } from "@/lib/mock";
import { Countdown } from "@/components/ui/Countdown";
import { fmtMnt } from "@/lib/format";

const history = makeHistory();

export default function RoundsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-8">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          Case History
        </span>
        <h1 className="type-display mt-3 text-4xl text-ink md:text-6xl">Rounds</h1>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-md border border-line bg-surface p-4">
        <div>
          <div className="type-label mb-1">Round {ROUND.number} — live</div>
          <Countdown fromSeconds={ROUND.closesInSec} className="text-lg font-bold text-accent" />
        </div>
        <div className="font-mono text-2xs text-dim">
          Pot <span className="text-ink">{fmtMnt(ROUND.pot)}</span> · {ROUND.detectives} detectives
        </div>
        <Link
          href="/arena"
          className="bg-accent px-4 py-2 font-mono text-xs uppercase tracking-widest text-black transition-opacity duration-150 hover:opacity-90"
        >
          Enter
        </Link>
      </div>

      <ol className="m-0 list-none space-y-3 p-0">
        {history.map((h) => (
          <li
            key={h.round}
            className="flex items-center justify-between gap-4 rounded-md border border-line bg-surface px-4 py-3"
          >
            <div>
              <div className="type-stamp text-xs text-ink">Round {h.round}</div>
              <div className="mt-0.5 font-mono text-2xs text-dim">{h.date} · closed</div>
            </div>
            <div className="font-mono text-2xs tabular-nums">
              <span className="text-ink">
                {h.correct}/{h.called}
              </span>
              <span className="mx-2 text-line">·</span>
              <span className={h.net >= 0 ? "text-accent" : "text-loss"}>
                {h.net >= 0 ? "+" : ""}
                {h.net} MNT
              </span>
            </div>
            <Link
              href="/reveal"
              className="rounded-sm border border-line px-3 py-1.5 text-xs font-medium text-dim transition-colors duration-150 hover:border-dim hover:text-ink"
            >
              Reveal
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
