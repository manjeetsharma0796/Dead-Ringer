"use client";

import Link from "next/link";
import { makeHistory } from "@/lib/mock";
import { fmtMnt } from "@/lib/format";
import { useStore } from "@/lib/store";
import { truncAddr } from "@/lib/format";
import { Stamp } from "@/components/ui/Stamp";

const history = makeHistory();
const accuracySeries = history.map((h) => (h.correct / h.called) * 100).reverse();

const MY_AGENTS = [
  { name: "LULLABY", foolRate: 73.4, rounds: 6, status: "active" as const },
  { name: "WET PAINT", foolRate: 48.1, rounds: 2, status: "retired" as const },
];

export default function ProfilePage() {
  const { wallet } = useStore();
  const totalNet = history.reduce((a, h) => a + h.net, 0);
  const totalCalled = history.reduce((a, h) => a + h.called, 0);
  const totalCorrect = history.reduce((a, h) => a + h.correct, 0);
  const acc = Math.round((totalCorrect / totalCalled) * 1000) / 10;
  const rankProgress = 62; // toward Profiler

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
            My Desk
          </span>
          <h1 className="type-display mt-3 text-4xl text-ink md:text-6xl">
            {wallet.status === "connected" ? truncAddr(wallet.address) : "Detective"}
          </h1>
        </div>
        <Stamp tone="dim">Investigator</Stamp>
      </header>

      {/* stat strip */}
      <dl className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-4">
        {(
          [
            ["Lifetime accuracy", `${acc}%`, "text-ink"],
            ["Net earnings", `${totalNet >= 0 ? "+" : ""}${fmtMnt(totalNet)}`, totalNet >= 0 ? "text-accent" : "text-loss"],
            ["Verdicts placed", String(totalCalled), "text-ink"],
            ["Rounds played", String(history.length), "text-ink"],
          ] as const
        ).map(([label, value, tone]) => (
          <div key={label} className="bg-surface px-4 py-4">
            <dt className="type-label">{label}</dt>
            <dd className={`mt-1 font-mono text-lg font-bold tabular-nums ${tone}`}>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* accuracy over time */}
        <section className="rounded-md border border-line bg-surface p-4">
          <h2 className="type-label mb-3">Accuracy by round</h2>
          <svg viewBox="0 0 300 110" className="block w-full" role="img" aria-label={`Accuracy over the last ${accuracySeries.length} rounds`}>
            <line x1="0" y1="55" x2="300" y2="55" stroke="var(--color-line)" strokeWidth="1" strokeDasharray="3 4" />
            <text x="4" y="50" fill="var(--color-dim)" fontSize="8" fontFamily="var(--font-mono)">
              coin flip — 50%
            </text>
            <polyline
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              points={accuracySeries
                .map((v, i) => `${(i / (accuracySeries.length - 1)) * 290 + 5},${105 - v}`)
                .join(" ")}
            />
            {accuracySeries.map((v, i) => (
              <circle
                key={i}
                cx={(i / (accuracySeries.length - 1)) * 290 + 5}
                cy={105 - v}
                r="2.5"
                fill="var(--color-bg)"
                stroke="var(--color-ink)"
                strokeWidth="1.5"
              />
            ))}
          </svg>
        </section>

        {/* rank progress */}
        <section className="rounded-md border border-line bg-surface p-4">
          <h2 className="type-label mb-3">Rank progress</h2>
          <div className="mb-2 flex items-center justify-between font-mono text-2xs">
            <span className="text-ink">INVESTIGATOR</span>
            <span className="text-dim">PROFILER</span>
          </div>
          <div
            className="h-2.5 rounded-sm border border-line bg-bg"
            role="progressbar"
            aria-valuenow={rankProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress toward Profiler rank"
          >
            <div className="h-full bg-ink" style={{ width: `${rankProgress}%` }} />
          </div>
          <p className="mt-3 font-mono text-2xs leading-relaxed text-dim">
            {rankProgress}% there. Profiler unlocks crowd-read history and a second agent slot.
          </p>
          <div className="mt-4 flex gap-1.5" aria-hidden="true">
            {["ROOKIE", "INVESTIGATOR", "PROFILER", "ORACLE"].map((r, i) => (
              <span
                key={r}
                className={`type-stamp border px-1.5 py-px text-[9px] ${
                  i <= 1 ? "border-dim text-ink" : "border-line text-dim"
                }`}
              >
                {r}
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* verdict history */}
      <section className="mt-6">
        <h2 className="type-label mb-3">Verdict history</h2>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full border-collapse font-mono text-xs tabular-nums">
            <thead>
              <tr className="border-b border-line bg-raised text-left">
                <th scope="col" className="px-4 py-2.5 text-2xs font-medium text-dim">Round</th>
                <th scope="col" className="px-4 py-2.5 text-2xs font-medium text-dim">Date</th>
                <th scope="col" className="px-4 py-2.5 text-right text-2xs font-medium text-dim">Called</th>
                <th scope="col" className="px-4 py-2.5 text-right text-2xs font-medium text-dim">Correct</th>
                <th scope="col" className="px-4 py-2.5 text-right text-2xs font-medium text-dim">Net</th>
                <th scope="col" className="px-4 py-2.5 text-right text-2xs font-medium text-dim"></th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.round} className="border-b border-line/50 last:border-0">
                  <td className="px-4 py-2.5 text-ink">R{h.round}</td>
                  <td className="px-4 py-2.5 text-dim">{h.date}</td>
                  <td className="px-4 py-2.5 text-right text-ink">{h.called}</td>
                  <td className="px-4 py-2.5 text-right text-ink">
                    {h.correct}/{h.called}
                  </td>
                  <td className={`px-4 py-2.5 text-right ${h.net >= 0 ? "text-accent" : "text-loss"}`}>
                    {h.net >= 0 ? "+" : ""}
                    {h.net} MNT
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href="/reveal" className="text-dim underline-offset-2 hover:text-ink hover:underline">
                      replay
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* deployed agents */}
      <section className="mt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="type-label">My agents</h2>
          <span className="font-mono text-2xs text-dim">1 slot free at Profiler</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {MY_AGENTS.map((a) => (
            <div key={a.name} className="rounded-md border border-line bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="type-stamp text-sm text-ink">{a.name}</span>
                <span className={`text-xs font-medium ${a.status === "active" ? "text-ink" : "text-dim"}`}>
                  {a.status}
                </span>
              </div>
              <dl className="mt-3 space-y-1.5 font-mono text-2xs">
                <div className="flex justify-between">
                  <dt className="text-dim">Fool rate</dt>
                  <dd className="text-ink">fooled {a.foolRate}% of detectives</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-dim">Rounds survived</dt>
                  <dd className="text-ink">{a.rounds}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
