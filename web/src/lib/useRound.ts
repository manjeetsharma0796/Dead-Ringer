"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { formatEther } from "viem";
import { arenaConfigured } from "./env";
import { ARENA_ABI, ARENA_CONTRACT, ROUND_ID } from "./arena";

const STATE_LABELS = ["Open", "Locked", "Revealed", "Settled"] as const;
export type RoundState = (typeof STATE_LABELS)[number];

export interface RoundData {
  /** True when these numbers are real on-chain reads (vs mock fallback). */
  onChain: boolean;
  loading: boolean;
  error: boolean;
  /** Lifecycle state, or null if the round read failed / isn't configured. */
  state: RoundState | null;
  /** Suspect count for the round (0 when unknown). */
  suspectCount: number;
  revealedCount: number;
  /** Total escrowed pot, in MNT (float, for display). */
  potMnt: number;
  /** Unique players who have bet — the "detectives" count. */
  detectives: number;
}

const EMPTY: RoundData = {
  onChain: false,
  loading: false,
  error: false,
  state: null,
  suspectCount: 0,
  revealedCount: 0,
  potMnt: 0,
  detectives: 0,
};

/**
 * Reads the live round header straight from the Arena contract — state, suspect
 * count, escrowed pot, and the unique-player ("detectives") count — via the
 * public RPC, so it works on the deployed site with no backend.
 *
 * When no contract address is configured (NEXT_PUBLIC_ARENA_ADDRESS empty) it
 * returns `onChain: false` so the arena falls back to the mock ROUND header
 * (DR-313 — never white-screen).
 */
export function useRound(): RoundData {
  const enabled = arenaConfigured();

  const { data, isLoading, isError } = useReadContracts({
    contracts: enabled
      ? [
          {
            abi: ARENA_ABI,
            address: ARENA_CONTRACT,
            functionName: "getRound",
            args: [ROUND_ID],
          },
          {
            abi: ARENA_ABI,
            address: ARENA_CONTRACT,
            functionName: "getPlayers",
            args: [ROUND_ID],
          },
        ]
      : [],
    query: { enabled, refetchInterval: 8_000 },
  });

  return useMemo<RoundData>(() => {
    if (!enabled) return EMPTY;

    const rv = data?.[0]?.result as
      | { state: number; suspectCount: bigint; revealedCount: bigint; totalPot: bigint }
      | undefined;
    const players = data?.[1]?.result as readonly string[] | undefined;

    return {
      onChain: true,
      loading: isLoading,
      error: isError,
      state: rv ? STATE_LABELS[rv.state] ?? null : null,
      suspectCount: rv ? Number(rv.suspectCount) : 0,
      revealedCount: rv ? Number(rv.revealedCount) : 0,
      potMnt: rv ? Number(formatEther(rv.totalPot)) : 0,
      detectives: players ? players.length : 0,
    };
  }, [enabled, data, isLoading, isError]);
}
