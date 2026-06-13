/**
 * Bot runner harness (DR-203).
 *
 * Calls decide() on each registered bot every BOT_TICK_MS milliseconds, then
 * feeds any returned Order into the trade engine. An Order with `close: true`
 * is routed to engine.closePosition (stop-losses, fat-finger corrections);
 * otherwise it opens/flips a position via engine.execute.
 *
 * The personalities live in ./quant, ./degen, ./sleeper, ./paperHands and are
 * assembled by createBots in ./index.ts. To add one: implement the Bot
 * interface in a new file and add it to PERSONALITIES there.
 */

import type { Bot, MarketData } from "../types.js";
import type { TradeEngine } from "../engine/index.js";
import { BOT_TICK_MS } from "../config.js";

export class BotRunner {
  private bots: Bot[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly engine: TradeEngine) {}

  register(bot: Bot): void {
    this.bots.push(bot);
    console.log(`[BotRunner] registered bot suspectId=${bot.id}`);
  }

  start(getMarket: () => MarketData): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => this.tick(getMarket()), BOT_TICK_MS);
    console.log(
      `[BotRunner] started — ${this.bots.length} bot(s), tick every ${BOT_TICK_MS}ms`,
    );
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(market: MarketData): void {
    if (Object.keys(market).length === 0) {
      // No prices yet — skip until the feed has data.
      return;
    }

    for (const bot of this.bots) {
      try {
        const order = bot.decide(market);
        if (!order) continue;
        if (order.close) {
          // Close-only intent — used by stop-losses and fat-finger corrections.
          this.engine.closePosition(bot.id, order.pair, market);
          continue;
        }
        this.engine.execute(
          {
            suspectId: bot.id,
            side: order.side,
            pair: order.pair,
            size: order.size,
          },
          market,
        );
      } catch (err) {
        console.error(`[BotRunner] bot ${bot.id} error:`, (err as Error).message);
      }
    }
  }
}
