"use client";

import { useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { arenaConfigured } from "./env";
import {
  ARENA_ABI,
  ARENA_CONTRACT,
  ROUND_ID,
  toContractId,
  verdictFromIsHuman,
} from "./arena";
import type { Suspect, Verdict } from "./types";

export interface RevealRow {
  suspectId: number; // frontend 1-indexed
  revealed: boolean;
  /** On-chain ground truth — only meaningful when revealed. */
  isHuman: boolean;
}

export interface RevealData {
  /** True when reads are backed by a real contract (vs mock fallback). */
  onChain: boolean;
  loading: boolean;
  error: boolean;
  /** Per-suspect on-chain truth, keyed by frontend id. */
  truth: Record<number, RevealRow>;
  /** The player's submitted verdicts, keyed by frontend id. */
  slipVerdicts: Record<number, Verdict>;
  /** previewPayout result in wei (bigint). */
  payoutWei: bigint;
  /** True if the player has a slip on this round. */
  hasSlip: boolean;
}

const EMPTY: RevealData = {
  onChain: false,
  loading: false,
  error: false,
  truth: {},
  slipVerdicts: {},
  payoutWei: BigInt(0),
  hasSlip: false,
};

/**
 * Reads on-chain reveal truth, the player's slip, and the previewed payout.
 *
 * IMPORTANT: the reveal TRUTH (suspectRevealed) is public, so it is read
 * whenever a contract is configured — NO wallet required. Only the
 * personalized slip + payout need a connected address. This is what keeps the
 * answers sealed for everyone until the chain reveals: when `onChain` is true
 * the reveal page must trust `truth[].revealed`, never the mock `isBot`.
 *
 * When no contract is configured it returns `onChain: false` so the reveal
 * page falls back to mock SUSPECTS.isBot (pure-demo mode only).
 */
export function useReveal(suspects: Suspect[]): RevealData {
  const { address } = useAccount();
  const configured = arenaConfigured();

  const contracts = useMemo(() => {
    if (!configured) return [];
    const revealedCalls = suspects.map((s) => ({
      abi: ARENA_ABI,
      address: ARENA_CONTRACT,
      functionName: "suspectRevealed" as const,
      args: [ROUND_ID, toContractId(s.id)],
    }));
    if (!address) return revealedCalls;
    return [
      ...revealedCalls,
      {
        abi: ARENA_ABI,
        address: ARENA_CONTRACT,
        functionName: "getSlip" as const,
        args: [address, ROUND_ID],
      },
      {
        abi: ARENA_ABI,
        address: ARENA_CONTRACT,
        functionName: "previewPayout" as const,
        args: [address, ROUND_ID],
      },
    ];
  }, [configured, suspects, address]);

  const { data, isLoading, isError } = useReadContracts({
    contracts,
    query: { enabled: configured, refetchInterval: 8_000 },
  });

  return useMemo<RevealData>(() => {
    if (!configured) return EMPTY;
    if (!data) {
      return { ...EMPTY, onChain: true, loading: isLoading, error: isError };
    }

    const n = suspects.length;
    const truth: Record<number, RevealRow> = {};
    suspects.forEach((s, i) => {
      const res = data[i]?.result as [boolean, boolean] | undefined;
      truth[s.id] = {
        suspectId: s.id,
        revealed: res ? res[0] : false,
        isHuman: res ? res[1] : false,
      };
    });

    // getSlip / previewPayout are only present when a wallet is connected.
    let slipVerdicts: Record<number, Verdict> = {};
    let hasSlip = false;
    let payoutWei = BigInt(0);
    if (address) {
      const slipRes = data[n]?.result as
        | [readonly bigint[], readonly boolean[], readonly bigint[], bigint, boolean]
        | undefined;
      if (slipRes && slipRes[4]) {
        hasSlip = true;
        const ids = slipRes[0];
        const guesses = slipRes[1];
        ids.forEach((cid, i) => {
          slipVerdicts[Number(cid) + 1] = verdictFromIsHuman(Boolean(guesses[i]));
        });
      }
      payoutWei = (data[n + 1]?.result as bigint | undefined) ?? BigInt(0);
    }

    return {
      onChain: true,
      loading: isLoading,
      error: isError,
      truth,
      slipVerdicts,
      payoutWei,
      hasSlip,
    };
  }, [configured, data, isLoading, isError, suspects, address]);
}
