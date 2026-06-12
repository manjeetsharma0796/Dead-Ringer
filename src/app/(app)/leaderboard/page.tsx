"use client";

import { useState } from "react";
import { makeAgents, makeDetectives } from "@/lib/mock";
import { fmtMnt } from "@/lib/format";

const detectives = makeDetectives();
const agents = makeAgents();

type Tab = "detectives" | "agents";

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("detectives");

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          Standings
        </span>
        <h1 className="type-display mt-3 text-4xl text-ink md:text-6xl">Leaderboard</h1>
      </header>

      <div role="tablist" aria-label="Leaderboard tabs" className="mb-5 flex border-b border-line">
        {(
          [
            ["detectives", "Detectives"],
            ["agents", "Dead Ringers"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px cursor-pointer border-b-2 px-4 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors duration-150 ${
              tab === key
                ? "border-accent text-accent"
                : "border-transparent text-dim hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "detectives" ? (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full border-collapse font-mono text-xs tabular-nums">
            <thead>
              <tr className="border-b border-line bg-raised text-left">
                <th scope="col" className="px-4 py-2.5 text-2xs font-medium text-dim">#</th>
                <th scope="col" className="px-4 py-2.5 text-2xs font-medium text-dim">Detective</th>
                <th scope="col" className="px-4 py-2.5 text-2xs font-medium text-dim">Title</th>
                <th scope="col" className="px-4 py-2.5 text-right text-2xs font-medium text-dim">Accuracy</th>
                <th scope="col" className="px-4 py-2.5 text-right text-2xs font-medium text-dim">Winnings</th>
                <th scope="col" className="px-4 py-2.5 text-right text-2xs font-medium text-dim">Rounds</th>
              </tr>
            </thead>
            <tbody>
              {detectives.map((d) => (
                <tr key={d.handle} className="border-b border-line/50 last:border-0">
                  <td className="px-4 py-2.5 text-dim">{String(d.rank).padStart(2, "0")}</td>
                  <td className="px-4 py-2.5 text-ink">{d.handle}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`type-stamp border px-1.5 py-px text-[9px] ${
                        d.title === "Oracle"
                          ? "border-ink text-ink"
                          : d.title === "Profiler"
                            ? "border-line text-dim"
                            : "border-line text-dim"
                      }`}
                    >
                      {d.title}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-ink">{d.accuracy}%</td>
                  <td className="px-4 py-2.5 text-right text-accent">{fmtMnt(d.winnings)}</td>
                  <td className="px-4 py-2.5 text-right text-dim">{d.rounds}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full border-collapse font-mono text-xs tabular-nums">
            <thead>
              <tr className="border-b border-line bg-raised text-left">
                <th scope="col" className="px-4 py-2.5 text-2xs font-medium text-dim">#</th>
                <th scope="col" className="px-4 py-2.5 text-2xs font-medium text-dim">Agent</th>
                <th scope="col" className="px-4 py-2.5 text-2xs font-medium text-dim">Builder</th>
                <th scope="col" className="px-4 py-2.5 text-right text-2xs font-medium text-dim">Fool rate</th>
                <th scope="col" className="px-4 py-2.5 text-right text-2xs font-medium text-dim">Survived</th>
                <th scope="col" className="px-4 py-2.5 text-right text-2xs font-medium text-dim">Status</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.agent} className="border-b border-line/50 last:border-0">
                  <td className="px-4 py-2.5 text-dim">{String(a.rank).padStart(2, "0")}</td>
                  <td className="px-4 py-2.5">
                    <span className="type-stamp text-2xs text-ink">{a.agent}</span>
                  </td>
                  <td className="px-4 py-2.5 text-dim">{a.builder}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-ink">fooled {a.foolRate}%</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-ink">{a.roundsSurvived} rounds</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={a.status === "active" ? "text-ink" : "text-dim"}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
