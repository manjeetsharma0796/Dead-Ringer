"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Download, Lock, X } from "lucide-react";
import { formatEther } from "viem";
import { useWriteContract } from "wagmi";
import { SUSPECTS } from "@/lib/suspects";
import { useStore } from "@/lib/store";
import { fmtMnt } from "@/lib/format";
import { useMounted } from "@/lib/useMounted";
import { useReveal } from "@/lib/useReveal";
import { useRound } from "@/lib/useRound";
import { Skeleton } from "@/components/ui/Skeleton";
import { ARENA_ABI, ARENA_CONTRACT, ROUND_ID } from "@/lib/arena";

const STAGGER = 0.6;

/** Header sub-label per phase. */
const PHASE_LABEL: Record<string, string> = {
  Open: "Live",
  Locked: "Sealed",
  Revealed: "Declassified",
  Settled: "Closed",
};

export default function RevealPage() {
  const mounted = useMounted();
  const reduce = useReducedMotion();
  const { slip, stake, toast } = useStore();
  const [flash, setFlash] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // On-chain round phase + reveal truth + slip + payout. Falls back to mock
  // ONLY when no contract is configured.
  const round = useRound();
  const reveal = useReveal(SUSPECTS);
  const { writeContractAsync } = useWriteContract();
  const onChain = reveal.onChain;
  const onChainLoading = onChain && (reveal.loading || round.loading);

  // THE GATE: on a live round, identities stay sealed until the chain reveals.
  // In pure-mock mode (no contract) we keep the original demo ceremony.
  const identitiesVisible = round.state === "Revealed" || round.state === "Settled";
  const sealed = onChain ? !identitiesVisible : false;
  const settled = round.state === "Settled";

  const results = useMemo(
    () =>
      SUSPECTS.map((s) => {
        const truthRow = reveal.truth[s.id];
        // Ground truth is only known once revealed. `null` => still sealed.
        const isBot: boolean | null = onChain
          ? identitiesVisible && truthRow?.revealed
            ? !truthRow.isHuman
            : null
          : s.isBot;

        // Player's verdict: on-chain slip when connected, else local store slip.
        const verdict = onChain ? reveal.slipVerdicts[s.id] : slip[s.id]?.verdict;
        const entry = onChain
          ? verdict
            ? slip[s.id] ?? { suspectId: s.id, verdict, confidence: 0, multiplier: 1 }
            : undefined
          : slip[s.id];

        const correct =
          verdict && isBot !== null ? (verdict === "bot") === isBot : null;
        return { suspect: s, entry, correct, isBot };
      }),
    [slip, reveal.truth, reveal.slipVerdicts, onChain, round.state],
  );

  const called = results.filter((r) => r.entry);
  const correct = called.filter((r) => r.correct);
  const perfect = !sealed && called.length > 0 && correct.length === called.length;
  const per = called.length > 0 ? stake / called.length : 0;
  // Winnings: on-chain previewPayout (wei → MNT) when configured, else mock math.
  const mockWinnings = Math.round(
    correct.reduce((a, r) => a + per * (r.entry?.multiplier ?? 1), 0) - stake * (called.length > 0 ? 1 : 0),
  );
  const winnings = onChain
    ? Math.round(Number(formatEther(reveal.payoutWei)) - (reveal.hasSlip ? stake : 0))
    : mockWinnings;
  const accuracy = called.length > 0 ? correct.length / called.length : 0;
  const percentile = Math.min(97, Math.max(3, Math.round(100 - accuracy * 92)));

  const onClaim = () => {
    void (async () => {
      setClaiming(true);
      toast("Claiming winnings…", "neutral");
      try {
        await writeContractAsync({
          abi: ARENA_ABI,
          address: ARENA_CONTRACT,
          functionName: "claim",
          args: [ROUND_ID],
        });
        setClaimed(true);
        toast("Winnings claimed.", "accent");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Claim failed";
        toast(msg.length > 90 ? "Claim failed or rejected." : msg, "error");
      } finally {
        setClaiming(false);
      }
    })();
  };

  const totalDelay = SUSPECTS.length * STAGGER + 0.6;

  useEffect(() => {
    if (!mounted || !perfect || reduce) return;
    const t = setTimeout(() => {
      setFlash(true);
      setTimeout(() => setFlash(false), 360);
    }, totalDelay * 1000);
    return () => clearTimeout(t);
  }, [mounted, perfect, reduce, totalDelay]);

  const phaseLabel = onChain ? PHASE_LABEL[round.state ?? ""] ?? "Closed" : "Closed";

  return (
    <div className="mx-auto max-w-5xl">
      {/* perfect-score flash — one frame of accent, no confetti */}
      {flash && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] animate-[blink_360ms_ease-out_1] bg-accent" />
      )}

      <header className="mb-8">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          Round {ROUND_ID.toString()} / {phaseLabel}
        </span>
        <h1 className="type-display mt-3 text-4xl text-ink md:text-6xl">
          {sealed ? "Sealed." : "Declassifying…"}
        </h1>
        {sealed && (
          <p className="mt-3 max-w-xl font-mono text-xs leading-relaxed text-dim">
            Identities are committed on-chain and stay sealed until betting closes
            and the operator reveals. No peeking — that&apos;s the whole point.
          </p>
        )}
      </header>

      {onChainLoading && (
        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4" aria-label="Reading on-chain reveal…">
          {Array.from({ length: SUSPECTS.length }, (_, i) => (
            <div key={i} className="space-y-3 rounded-md border border-line bg-surface p-3">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}

      <div className={`grid grid-cols-2 gap-4 md:grid-cols-4 ${onChainLoading ? "hidden" : ""}`}>
        {results.map(({ suspect, entry, correct, isBot }, i) => (
          <motion.div
            key={suspect.id}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: reduce ? 0 : (sealed ? 0 : i * STAGGER), ease: "easeOut" }}
            className="relative rounded-md border border-line bg-surface p-3"
          >
            <div className="type-stamp mb-3 text-2xs text-dim">{suspect.codename}</div>
            <div className="mb-1 font-mono text-2xs text-dim">“{suspect.alias}”</div>

            {/* identity slot — sealed bar stays put until the chain reveals */}
            <div className="relative mt-2 h-10">
              {sealed ? (
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 border-2 border-line bg-raised font-mono text-2xs uppercase tracking-widest text-dim">
                  <Lock size={12} strokeWidth={2.5} aria-hidden="true" />
                  Sealed
                </div>
              ) : isBot === null ? (
                // Revealed globally, but this suspect's truth hasn't loaded yet —
                // show a pending state rather than mislabeling it.
                <div className="absolute inset-0 flex animate-pulse items-center justify-center border-2 border-line bg-raised font-mono text-2xs uppercase tracking-widest text-dim">
                  reading…
                </div>
              ) : (
                <>
                  <div
                    className={`font-display absolute inset-0 flex items-center justify-center border-2 text-2xl ${
                      isBot ? "border-bot text-bot" : "border-human text-human"
                    } ${reduce ? "" : "-rotate-2"}`}
                  >
                    {isBot ? "BOT" : "HUMAN"}
                  </div>
                  <motion.div
                    aria-hidden="true"
                    className="redaction absolute inset-0"
                    initial={reduce ? { scaleX: 0 } : { scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    style={{ originX: 1 }}
                    transition={{ duration: 0.35, delay: reduce ? 0 : i * STAGGER + 0.2, ease: "easeOut" }}
                  />
                </>
              )}
            </div>

            {/* your call */}
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: reduce ? 0 : (sealed ? 0.1 : i * STAGGER + 0.5) }}
              className="mt-3 flex items-center gap-1.5 border-t border-line pt-2 font-mono text-2xs"
            >
              {entry ? (
                sealed ? (
                  <span className="text-dim">
                    you called <span className="text-ink">{entry.verdict.toUpperCase()}</span>
                  </span>
                ) : (
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
                )
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
        transition={{ duration: 0.3, delay: reduce ? 0 : (sealed ? 0.2 : totalDelay), ease: "easeOut" }}
        className="mt-10 rounded-md border border-line bg-surface p-6 md:p-8"
      >
        {sealed ? (
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="type-display text-2xl text-ink">
                {round.state === "Locked" ? "Betting closed — awaiting reveal." : "Round still live."}
              </h2>
              <p className="mt-2 font-mono text-2xs text-dim">
                {called.length > 0
                  ? `${called.length} call${called.length === 1 ? "" : "s"} locked. Results appear here the moment the case is declassified.`
                  : "Make your calls in the arena before betting closes."}
              </p>
            </div>
            <Link
              href="/arena"
              className="bg-accent px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-black transition-opacity duration-150 hover:opacity-90"
            >
              {round.state === "Open" ? "Enter the arena" : "Back to arena"}
            </Link>
          </div>
        ) : called.length === 0 ? (
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="type-display text-2xl text-ink">You sat this one out.</h2>
              <p className="mt-2 font-mono text-2xs text-dim">No verdicts this round.</p>
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
            <div className="flex flex-wrap gap-3">
              {onChain && settled && (
                <button
                  type="button"
                  onClick={onClaim}
                  disabled={claiming || claimed || reveal.payoutWei === BigInt(0)}
                  className="flex cursor-pointer items-center gap-2 border border-accent bg-transparent px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-accent transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {claimed
                    ? "Claimed"
                    : claiming
                      ? "Claiming…"
                      : reveal.payoutWei === BigInt(0)
                        ? "Nothing to claim"
                        : "Claim winnings"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  downloadShareCard({
                    round: Number(ROUND_ID),
                    score: `${correct.length}/${called.length}`,
                    percentile,
                    net: winnings,
                    rows: results.map((r) => ({
                      code: r.suspect.codename.replace("SUSPECT ", ""),
                      truth: r.isBot ? "BOT" : "HUMAN",
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
  round: number;
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
  ctx.fillText(`ROUND ${data.round} — CASE CLOSED`, 64, 140);

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
  a.download = `dead-ringer-round-${data.round}.png`;
  a.href = c.toDataURL("image/png");
  a.click();
}
