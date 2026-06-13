/**
 * On-chain Arena contract bindings + the SINGLE source of truth for the
 * frontend⇄contract id and confidence conversions.
 *
 * GOTCHAS centralized here (do the math nowhere else):
 *  1. SUSPECT IDS — frontend/backend are 1-indexed (1..8); the contract is
 *     0-indexed (0..7). Use toContractId() / toFrontendId() at every boundary.
 *  2. CONFIDENCE — SlipEntry.confidence is 0..1; the contract wants basis
 *     points 0..10000. Use toBps() / fromBps().
 *  3. VERDICT — isHumanGuess = verdict === "human". Use isHumanGuess().
 */

import type { Abi } from "viem";
import abiJson from "./arena.abi.json";
import { ARENA_ADDRESS, ARENA_ROUND_ID } from "./env";
import type { Verdict } from "./types";

export const ARENA_ABI = abiJson as Abi;

/** May be the empty string in mock mode — guard with arenaConfigured(). */
export const ARENA_CONTRACT = ARENA_ADDRESS as `0x${string}`;

export const ROUND_ID = BigInt(ARENA_ROUND_ID);

/* ── id indexing ───────────────────────────────────────────────────────── */

/** Frontend/backend 1-indexed id → contract 0-indexed id. */
export function toContractId(frontendId: number): bigint {
  return BigInt(frontendId - 1);
}

/** Contract 0-indexed id → frontend/backend 1-indexed id. */
export function toFrontendId(contractId: bigint | number): number {
  return Number(contractId) + 1;
}

/* ── confidence ────────────────────────────────────────────────────────── */

/** 0..1 confidence → 0..10000 basis points. */
export function toBps(confidence: number): bigint {
  return BigInt(Math.min(10000, Math.max(0, Math.round(confidence * 10000))));
}

/** 0..10000 basis points → 0..1 confidence. */
export function fromBps(bps: bigint | number): number {
  return Math.min(1, Math.max(0, Number(bps) / 10000));
}

/* ── verdict ───────────────────────────────────────────────────────────── */

export function isHumanGuess(verdict: Verdict): boolean {
  return verdict === "human";
}

/** Contract truth (isHuman) → frontend Verdict. */
export function verdictFromIsHuman(isHuman: boolean): Verdict {
  return isHuman ? "human" : "bot";
}
