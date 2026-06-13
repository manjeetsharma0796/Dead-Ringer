/**
 * Runtime configuration for the agents backend feed and the on-chain Arena.
 *
 * Everything is read from NEXT_PUBLIC_* vars so it is available in the browser.
 * Sensible localhost defaults keep the app running on pure mock data when no
 * env is provided (the default for the demo). Setting ARENA_ADDRESS to a real
 * 0x… contract switches the verdict/reveal flow to the live chain.
 */

export const AGENTS_HTTP =
  process.env.NEXT_PUBLIC_AGENTS_HTTP?.trim() || "http://localhost:3101";

export const AGENTS_WS =
  process.env.NEXT_PUBLIC_AGENTS_WS?.trim() || "ws://localhost:3101/stream";

/** Empty string => "mock mode" (no contract configured). */
export const ARENA_ADDRESS = (process.env.NEXT_PUBLIC_ARENA_ADDRESS?.trim() ||
  "") as string;

export const ARENA_ROUND_ID = (() => {
  const raw = process.env.NEXT_PUBLIC_ARENA_ROUND_ID?.trim();
  const n = raw ? Number(raw) : 1;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
})();

/** True when a real Arena contract address is configured. */
export function arenaConfigured(): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(ARENA_ADDRESS);
}
