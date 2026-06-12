"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Suspect } from "@/lib/types";
import { useStore } from "@/lib/store";
import { fmtPnl, fmtPct } from "@/lib/format";
import { Sparkline } from "@/components/ui/Sparkline";
import { TellChip } from "@/components/ui/TellChip";
import {
  VerdictSlider,
  confidenceFor,
  multiplierFor,
  verdictFor,
} from "@/components/VerdictSlider";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function SuspectDrawer({
  suspect,
  onClose,
}: {
  suspect: Suspect | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {suspect && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Full file: ${suspect.codename}`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col overflow-y-auto border-l border-line bg-surface"
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-surface px-6 py-5">
              <div>
                <h2 className="type-stamp text-lg text-ink">
                  {suspect.codename} — “{suspect.alias}”
                </h2>
                <p className="mt-2 flex items-center gap-2 font-mono text-2xs text-dim">
                  IDENTITY:
                  <span className="redaction px-10 py-0.5" aria-label="redacted">
                    WITHHELD
                  </span>
                  
                </p>
              </div>
              <button
                ref={(el) => el?.focus()}
                type="button"
                onClick={onClose}
                aria-label="Close file"
                className="cursor-pointer rounded-sm border border-line p-2 text-dim transition-colors duration-150 hover:border-dim hover:text-ink"
              >
                <X size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </header>

            <div className="flex flex-col gap-8 px-6 py-6">
              {/* P&L */}
              <section>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="type-label">P&L · 24h</h3>
                  <span
                    className={`font-mono text-sm font-bold tabular-nums ${
                      suspect.returnPct >= 0 ? "text-ink" : "text-loss"
                    }`}
                  >
                    {fmtPct(suspect.returnPct)}
                  </span>
                </div>
                <div className="rounded-sm border border-line bg-bg p-3">
                  <Sparkline data={suspect.series} height={72} interactive className="h-20" />
                </div>
              </section>

              {/* tells */}
              <section>
                <h3 className="type-label mb-2">Tells</h3>
                <div className="flex flex-wrap gap-1.5">
                  {suspect.tells.map((t) => (
                    <TellChip key={t.label} label={t.label} hint={t.hint} />
                  ))}
                </div>
              </section>

              {/* hourly activity heatmap */}
              <section>
                <h3 className="type-label mb-2">Activity (UTC)</h3>
                <div className="grid grid-cols-12 gap-1" role="img" aria-label="Hourly trading activity heatmap">
                  {HOURS.map((h) => (
                    <div key={h} className="flex flex-col items-center gap-1">
                      <div
                        className="h-7 w-full rounded-[2px]"
                        style={{
                          background: "var(--color-dim)",
                          opacity: 0.08 + suspect.activity[h] * 0.8,
                        }}
                        title={`${String(h).padStart(2, "0")}:00 — ${Math.round(suspect.activity[h] * 100)}% active`}
                      />
                      {h % 4 === 0 && <span className="font-mono text-[9px] text-dim">{String(h).padStart(2, "0")}</span>}
                    </div>
                  ))}
                </div>
              </section>

              {/* crowd sentiment */}
              <section>
                <h3 className="type-label mb-2">Crowd read</h3>
                <div
                  className="flex h-8 overflow-hidden rounded-sm border border-line"
                  role="img"
                  aria-label={`${suspect.crowdBotPct} percent of detectives say bot, ${100 - suspect.crowdBotPct} percent say human`}
                >
                  <div
                    className="flex items-center bg-human/25 px-2 font-mono text-2xs font-bold text-human"
                    style={{ width: `${100 - suspect.crowdBotPct}%` }}
                  >
                    {100 - suspect.crowdBotPct}% HUMAN
                  </div>
                  <div
                    className="flex items-center justify-end bg-bot/25 px-2 font-mono text-2xs font-bold text-bot"
                    style={{ width: `${suspect.crowdBotPct}%` }}
                  >
                    {suspect.crowdBotPct}% BOT
                  </div>
                </div>
              </section>

              {/* your verdict — keyed so the slider resets per suspect */}
              <VerdictSection key={suspect.id} suspect={suspect} />

              {/* trade history */}
              <section>
                <h3 className="type-label mb-2">Trades</h3>
                <div className="overflow-x-auto rounded-sm border border-line">
                  <table className="w-full border-collapse font-mono text-2xs tabular-nums">
                    <thead>
                      <tr className="border-b border-line bg-raised text-left">
                        <th scope="col" className="px-3 py-2 font-medium text-dim">Time</th>
                        <th scope="col" className="px-3 py-2 font-medium text-dim">Side</th>
                        <th scope="col" className="px-3 py-2 font-medium text-dim">Pair</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium text-dim">Size</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium text-dim">Price</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium text-dim">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suspect.trades.map((t) => (
                        <tr key={t.id} className="border-b border-line/50 last:border-0">
                          <td className="px-3 py-1.5 text-dim">{t.ts}</td>
                          <td className={`px-3 py-1.5 ${t.side === "BUY" ? "text-ink" : "text-dim"}`}>{t.side}</td>
                          <td className="px-3 py-1.5 text-dim">{t.pair}</td>
                          <td className="px-3 py-1.5 text-right text-ink">{t.size}</td>
                          <td className="px-3 py-1.5 text-right text-dim">{t.price}</td>
                          <td
                            className={`px-3 py-1.5 text-right ${
                              t.pnl === 0 ? "text-dim" : t.pnl > 0 ? "text-ink" : "text-loss"
                            }`}
                          >
                            {t.pnl === 0 ? "—" : fmtPnl(t.pnl)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function VerdictSection({ suspect }: { suspect: Suspect }) {
  const { slip, setVerdict, clearVerdict, locked } = useStore();
  const entry = slip[suspect.id];
  const [value, setValue] = useState(() =>
    entry ? (entry.verdict === "bot" ? 1 : -1) * (15 + entry.confidence * 85) : 0,
  );

  const commit = (v: number) => {
    const vd = verdictFor(v);
    if (vd) setVerdict(suspect.id, vd, confidenceFor(v), multiplierFor(v));
    else if (entry) clearVerdict(suspect.id);
  };

  return (
    <section className="rounded-md border border-line bg-bg p-4">
      <h3 className="type-label mb-3">Verdict</h3>
      <VerdictSlider value={value} onChange={setValue} onCommit={commit} disabled={locked} />
    </section>
  );
}
