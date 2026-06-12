"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Download, X } from "lucide-react";
import { SUSPECTS } from "@/lib/suspects";
import { useStore } from "@/lib/store";
import { fmtMnt } from "@/lib/format";
import { useMounted } from "@/lib/useMounted";

const STAGGER = 0.6;

export default function RevealPage() {
  const mounted = useMounted();
  const reduce = useReducedMotion();
  const { slip, stake, toast } = useStore();
  const [flash, setFlash] = useState(false);

  const results = useMemo(
    () =>
      SUSPECTS.map((s) => {
        const entry = slip[s.id];
        const correct = entry ? (entry.verdict === "bot") === s.isBot : null;
        return { suspect: s, entry, correct };
      }),
    [slip],
  );

  const called = results.filter((r) => r.entry);
  const correct = called.filter((r) => r.correct);
  const perfect = called.length > 0 && correct.length === called.length;
  const per = called.length > 0 ? stake / called.length : 0;
  const winnings = Math.round(
    correct.reduce((a, r) => a + per * (r.entry?.multiplier ?? 1), 0) - stake * (called.length > 0 ? 1 : 0),
  );
  const accuracy = called.length > 0 ? correct.length / called.length : 0;
  const percentile = Math.min(97, Math.max(3, Math.round(100 - accuracy * 92)));

  const totalDelay = SUSPECTS.length * STAGGER + 0.6;

  useEffect(() => {
    if (!mounted || !perfect || reduce) return;
    const t = setTimeout(() => {
      setFlash(true);
      setTimeout(() => setFlash(false), 360);
    }, totalDelay * 1000);
    return () => clearTimeout(t);
  }, [mounted, perfect, reduce, totalDelay]);

  return (
    <div className="mx-auto max-w-5xl">
      {/* perfect-score flash — one frame of accent, no confetti */}
      {flash && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] animate-[blink_360ms_ease-out_1] bg-accent" />
      )}

      <header className="mb-8">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          Round 7 / Closed
        </span>
        <h1 className="type-display mt-3 text-4xl text-ink md:text-6xl">Declassifying…</h1>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {results.map(({ suspect, entry, correct }, i) => (
          <motion.div
            key={suspect.id}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: reduce ? 0 : i * STAGGER, ease: "easeOut" }}
            className="relative rounded-md border border-line bg-surface p-3"
          >
            <div className="type-stamp mb-3 text-2xs text-dim">{suspect.codename}</div>
            <div className="mb-1 font-mono text-2xs text-dim">“{suspect.alias}”</div>

            {/* redaction bar tears away, identity stamp beneath */}
            <div className="relative mt-2 h-10">
              <div
                className={`font-display absolute inset-0 flex items-center justify-center border-2 text-2xl ${
                  suspect.isBot ? "border-bot text-bot" : "border-human text-human"
                } ${reduce ? "" : "-rotate-2"}`}
              >
                {suspect.isBot ? "BOT" : "HUMAN"}
              </div>
              <motion.div
                aria-hidden="true"
                className="redaction absolute inset-0"
                initial={reduce ? { scaleX: 0 } : { scaleX: 1 }}
                animate={{ scaleX: 0 }}
                style={{ originX: 1 }}
                transition={{ duration: 0.35, delay: reduce ? 0 : i * STAGGER + 0.2, ease: "easeOut" }}
              />
            </div>

            {/* your call */}
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: reduce ? 0 : i * STAGGER + 0.5 }}
              className="mt-3 flex items-center gap-1.5 border-t border-line pt-2 font-mono text-2xs"
            >
              {entry ? (
                <>
                  {correct ? (
                    <Check size={12} strokeWidth={3} className="text-accent" aria-hidden="true" />
                  ) : (
                    <X size={12} strokeWidth={3} className="text-loss" aria-hidden="true" />
                  )}
                  <span className={correct ? "text-accent" : "text-loss"}>
                    you said {entry.verdict.toUpperCase()}
                  </span>
                </>
              ) : (
                <span className="text-dim">no call</span>
              )}
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* score card */}
      <motion.section
        aria-label="Your score"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: reduce ? 0 : totalDelay, ease: "easeOut" }}
        className="mt-10 rounded-md border border-line bg-surface p-6 md:p-8"
      >
        {called.length === 0 ? (
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="type-display text-2xl text-ink">You sat this one out.</h2>
              <p className="mt-2 font-mono text-2xs text-dim">
                No verdicts this round.
              </p>
            </div>
            <Link
              href="/arena"
              className="bg-accent px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-black transition-opacity duration-150 hover:opacity-90"
            >
              Enter the arena
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="type-display text-3xl text-ink">
                {correct.length}/{called.length} correct
              </h2>
              <p className="mt-2 font-mono text-xs text-dim">
                Top {percentile}% of detectives ·{" "}
                <span className={winnings >= 0 ? "text-accent" : "text-loss"}>
                  {winnings >= 0 ? "+" : ""}
                  {fmtMnt(winnings)}
                </span>
                {perfect && <span className="ml-2 text-ink">— a perfect read.</span>}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  downloadShareCard({
                    score: `${correct.length}/${called.length}`,
                    percentile,
                    net: winnings,
                    rows: results.map((r) => ({
                      code: r.suspect.codename.replace("SUSPECT ", ""),
                      truth: r.suspect.isBot ? "BOT" : "HUMAN",
                      hit: r.correct,
                    })),
                  });
                  toast("Share card saved", "accent");
                }}
                className="flex cursor-pointer items-center gap-2 bg-accent px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-black transition-opacity duration-150 hover:opacity-90"
              >
                <Download size={14} strokeWidth={2.5} aria-hidden="true" />
                Share result
              </button>
              <Link
                href="/arena"
                className="rounded-sm border border-line px-5 py-2.5 text-sm font-medium text-dim transition-colors duration-150 hover:border-dim hover:text-ink"
              >
                Next round
              </Link>
            </div>
          </div>
        )}
      </motion.section>
    </div>
  );
}

/* Canvas share card: dark, codename grid, score. 1200×630. */
function downloadShareCard(data: {
  score: string;
  percentile: number;
  net: number;
  rows: { code: string; truth: string; hit: boolean | null }[];
}) {
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 630;
  const ctx = c.getContext("2d");
  if (!ctx) return;

  // next/font hashes family names — read the real ones off the CSS vars
  const rootStyle = getComputedStyle(document.documentElement);
  const bebas = rootStyle.getPropertyValue("--font-bebas-neue").trim() || "sans-serif";
  const mono = rootStyle.getPropertyValue("--font-plex").trim() || "monospace";

  const INK = "#F2F2F2";
  const DIM = "#8A8A8A";
  const LINE = "#3F3F3F";
  const ACCENT = "#F97316";
  const BOT = "#D9D9D9";
  const LOSS = "#DC2626";

  ctx.fillStyle = "#141414";
  ctx.fillRect(0, 0, 1200, 630);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 1152, 582);

  ctx.fillStyle = ACCENT;
  ctx.fillRect(64, 64, 22, 22);
  ctx.fillStyle = INK;
  ctx.font = `400 38px ${bebas}`;
  ctx.fillText("DEAD RINGER", 102, 86);
  ctx.fillStyle = DIM;
  ctx.font = `500 22px ${mono}`;
  ctx.fillText("ROUND 7 — CASE CLOSED", 64, 140);

  ctx.fillStyle = INK;
  ctx.font = `400 110px ${bebas}`;
  ctx.fillText(`${data.score} CORRECT`, 64, 270);

  ctx.fillStyle = ACCENT;
  ctx.font = `500 30px ${mono}`;
  ctx.fillText(
    `TOP ${data.percentile}% OF DETECTIVES · ${data.net >= 0 ? "+" : ""}${data.net} MNT`,
    64,
    330,
  );

  ctx.font = `500 20px ${mono}`;
  data.rows.forEach((r, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 64 + col * 275;
    const y = 420 + row * 70;
    ctx.fillStyle = DIM;
    ctx.fillText(r.code, x, y);
    ctx.fillStyle = r.truth === "BOT" ? BOT : ACCENT;
    ctx.fillText(r.truth, x, y + 28);
    if (r.hit !== null) {
      ctx.fillStyle = r.hit ? ACCENT : LOSS;
      ctx.fillText(r.hit ? "[HIT]" : "[MISS]", x + 110, y + 28);
    }
  });

  ctx.fillStyle = DIM;
  ctx.font = `500 18px ${mono}`;
  ctx.fillText("CAN YOU SPOT THE MACHINE? · BUILT ON MANTLE", 64, 580);

  const a = document.createElement("a");
  a.download = "dead-ringer-round-7.png";
  a.href = c.toDataURL("image/png");
  a.click();
}
