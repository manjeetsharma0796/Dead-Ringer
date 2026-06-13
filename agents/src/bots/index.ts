/**
 * Bot registry (DR-203).
 *
 * Maps suspect IDs to personalities in order:
 *   suspect 1 → The Quant     (metronomic, round lots, tight stops)
 *   suspect 2 → The Degen      (FOMO, revenge, oversized)
 *   suspect 3 → The Sleeper    (human sleep cycle, bursts, fat-fingers)
 *   suspect 4 → Paper Hands    (buys pumps, sells dips) [Cut #3]
 *
 * To add or reorder personalities, edit PERSONALITIES — everything downstream
 * (the runner, index.ts) goes through `createBots`.
 */

import type { Bot } from "../types.js";
import { QuantBot } from "./quant.js";
import { DegenBot } from "./degen.js";
import { SleeperBot } from "./sleeper.js";
import { PaperHandsBot } from "./paperHands.js";

/** Personality constructors in suspect order. */
const PERSONALITIES: Array<new (id: number) => Bot> = [
  QuantBot,
  DegenBot,
  SleeperBot,
  PaperHandsBot,
];

/**
 * Build one bot per id, assigning personalities in order. Extra ids beyond the
 * personality roster get no bot (they're human slots). `disablePaperHands`
 * implements the pre-agreed Cut #3 (drop the 4th bot when behind).
 */
export function createBots(
  ids: number[],
  opts: { disablePaperHands?: boolean } = {},
): Bot[] {
  const bots: Bot[] = [];
  ids.forEach((id, i) => {
    if (i >= PERSONALITIES.length) return; // no personality for this slot
    if (i === 3 && opts.disablePaperHands) return; // Cut #3
    const Ctor = PERSONALITIES[i] as new (id: number) => Bot;
    bots.push(new Ctor(id));
  });
  return bots;
}

export { QuantBot, DegenBot, SleeperBot, PaperHandsBot };
