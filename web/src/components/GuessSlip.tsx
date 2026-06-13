"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { parseEther } from "viem";
import { useWriteContract } from "wagmi";
import { useStore } from "@/lib/store";
import { suspectById } from "@/lib/suspects";
import { fmtMnt, fmtMult } from "@/lib/format";
import { arenaConfigured } from "@/lib/env";
import {
  ARENA_ABI,
  ARENA_CONTRACT,
  ROUND_ID,
  isHumanGuess,
  toBps,
  toContractId,
} from "@/lib/arena";

/*
 * The guess slip. Docked panel bottom-right on desktop,
 * bottom sheet on mobile (opened from the tab bar too).
 */
export function GuessSlip() {
  const {
    slip,
    clearVerdict,
    stake,
    setStake,
    locked,
    lockSlip,
    unlockSlip,
    wallet,
    slipOpen,
    setSlipOpen,
    toast,
  } = useStore();
  const [stakeRaw, setStakeRaw] = useState(String(stake));
  const [submitting, setSubmitting] = useState(false);
  const { writeContractAsync } = useWriteContract();

  const entries = useMemo(() => Object.values(slip), [slip]);
  const count = entries.length;

  const projected = useMemo(() => {
    if (count === 0) return 0;
    const per = stake / count;
    return Math.round(entries.reduce((acc, e) => acc + per * e.multiplier, 0));
  }, [entries, stake, count]);

  const balance = wallet.status === "connected" ? wallet.balance : null;
  const overBalance = balance !== null && stake > balance;
  const stakeInvalid = !Number.isFinite(Number(stakeRaw)) || Number(stakeRaw) <= 0;

  const onStakeChange = (raw: string) => {
    setStakeRaw(raw);
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) setStake(n);
  };

  const onLock = () => {
    if (wallet.status !== "connected") {
      toast("Connect a wallet to lock verdicts", "error");
      return;
    }
    if (overBalance) {
      toast("Stake exceeds wallet balance. Reduce stake or top up.", "error");
      return;
    }

    // Mock mode (no contract configured): keep the optimistic demo behavior.
    if (!arenaConfigured()) {
      lockSlip();
      return;
    }

    // On-chain mode: one tx places every verdict, sharing one MNT stake.
    // Id indexing + confidence conversion are centralized in lib/arena.ts.
    void (async () => {
      setSubmitting(true);
      toast("Submitting verdicts on-chain…", "neutral");
      try {
        const suspectIds = entries.map((e) => toContractId(e.suspectId));
        const humanGuesses = entries.map((e) => isHumanGuess(e.verdict));
        const confidencesBps = entries.map((e) => toBps(e.confidence));

        await writeContractAsync({
          abi: ARENA_ABI,
          address: ARENA_CONTRACT,
          functionName: "placeVerdicts",
          args: [ROUND_ID, suspectIds, humanGuesses, confidencesBps],
          value: parseEther(String(stake)),
        });

        lockSlip();
        toast("Verdicts confirmed on-chain.", "accent");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Transaction failed";
        toast(msg.length > 90 ? "Transaction failed or rejected." : msg, "error");
        // Do NOT lock on failure.
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const panel = (
    <div className="flex max-h-[70vh] flex-col">
      {/* entries */}
      <div className="feed-scroll min-h-0 flex-1 overflow-y-auto">
        {count === 0 ? (
          <p className="px-4 py-8 text-center font-mono text-2xs text-dim">
            No verdicts yet.
          </p>
        ) : (
          <ul className="m-0 list-none p-0">
            {entries.map((e) => {
              const s = suspectById(e.suspectId);
              if (!s) return null;
              return (
                <li
                  key={e.suspectId}
                  className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-2xs text-ink">
                      {s.codename} <span className="text-dim">“{s.alias}”</span>
                    </div>
                    <div className="mt-0.5 font-mono text-2xs">
                      <span className={e.verdict === "bot" ? "text-bot" : "text-human"}>
                        {e.verdict.toUpperCase()}
                      </span>
                      <span className="mx-1.5 text-line">·</span>
                      <span className="text-dim">{Math.round(e.confidence * 100)}% conf</span>
                      <span className="mx-1.5 text-line">·</span>
                      <span className="text-accent">{fmtMult(e.multiplier)}</span>
                    </div>
                  </div>
                  {locked ? (
                    <span className="type-stamp shrink-0 -rotate-6 border border-accent px-1 py-px text-[9px] text-accent">
                      LOCKED
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => clearVerdict(e.suspectId)}
                      aria-label={`Remove ${s.codename} from slip`}
                      className="shrink-0 cursor-pointer rounded-sm border border-line p-1 text-dim transition-colors duration-150 hover:border-loss hover:text-loss"
                    >
                      <X size={12} strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* stake + lock */}
      <div className="border-t border-line bg-raised px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor="stake" className="type-label shrink-0">
            Total stake
          </label>
          <div className="flex items-center gap-1.5">
            <input
              id="stake"
              type="number"
              inputMode="decimal"
              min={1}
              value={stakeRaw}
              onChange={(e) => onStakeChange(e.target.value)}
              disabled={locked}
              className="w-24 rounded-sm border border-line bg-bg px-2 py-1.5 text-right font-mono text-sm tabular-nums text-ink disabled:opacity-50"
              aria-describedby={overBalance ? "stake-error" : undefined}
            />
            <span className="font-mono text-2xs text-dim">MNT</span>
          </div>
        </div>

        {overBalance && (
          <p id="stake-error" role="alert" className="mb-2 font-mono text-2xs text-loss">
            Stake exceeds wallet balance. Reduce stake or top up.
          </p>
        )}

        <div className="mb-3 flex items-center justify-between font-mono text-2xs">
          <span className="text-dim">Projected payout</span>
          <span className="font-bold tabular-nums text-accent">
            {count > 0 ? fmtMnt(projected) : "—"}
          </span>
        </div>

        {locked ? (
          <>
            <button
              type="button"
              onClick={unlockSlip}
              className="w-full cursor-pointer rounded-sm border border-line py-2.5 text-xs font-medium text-dim transition-colors duration-150 hover:border-dim hover:text-ink"
            >
              Unlock to edit
            </button>
            <p className="mt-2 text-center font-mono text-[10px] text-dim">
              Edits until close · 2 MNT fee
            </p>
          </>
        ) : (
          <button
            type="button"
            onClick={onLock}
            disabled={count === 0 || stakeInvalid || submitting}
            className="w-full cursor-pointer bg-accent py-2.5 font-mono text-xs uppercase tracking-widest text-black transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting
              ? "Confirming…"
              : `Lock verdicts${count > 0 ? ` (${count})` : ""}`}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* desktop: docked bottom-right */}
      <div className="fixed bottom-6 right-6 z-30 hidden w-80 md:block">
        <div className="overflow-hidden rounded-md border border-line bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          <button
            type="button"
            onClick={() => setSlipOpen(!slipOpen)}
            aria-expanded={slipOpen}
            className="flex w-full cursor-pointer items-center justify-between border-b border-line bg-raised px-4 py-3 text-left"
          >
            <span className="text-sm font-medium text-ink">
              Guess slip{" "}
              <span className={count > 0 ? "text-ink" : "text-dim"}>({count})</span>
            </span>
            <span className="flex items-center gap-2 font-mono text-2xs text-dim">
              {fmtMnt(stake)}
              {slipOpen ? (
                <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
              ) : (
                <ChevronUp size={14} strokeWidth={2} aria-hidden="true" />
              )}
            </span>
          </button>
          <AnimatePresence initial={false}>
            {slipOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                {panel}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* mobile: bottom sheet */}
      <AnimatePresence>
        {slipOpen && (
          <div className="md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/60"
              onClick={() => setSlipOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Guess slip"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90) setSlipOpen(false);
              }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-md border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
            >
              <div className="flex justify-center py-2" aria-hidden="true">
                <div className="h-1 w-10 rounded-sm bg-line" />
              </div>
              <div className="flex items-center justify-between border-b border-line px-4 pb-3">
                <span className="text-sm font-medium text-ink">
                  Guess slip <span className={count > 0 ? "text-ink" : "text-dim"}>({count})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSlipOpen(false)}
                  aria-label="Close slip"
                  className="cursor-pointer rounded-sm border border-line p-1.5 text-dim"
                >
                  <X size={14} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
              {panel}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
