/**
 * Bot runner harness (DR-203 skeleton).
 *
 * Calls decide() on each registered bot every BOT_TICK_MS milliseconds,
 * then feeds any returned Order into the trade engine.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DR-203 TODO — real bot personalities (BLOCKED on DR-201 credits):
 *
 *   The Quant (suspect 2):
 *     Metronomic intervals (e.g. every 4 minutes ± 5 s), tight stop-losses at
 *     0.5%, always round lot sizes (0.1, 0.5, 1.0), never trades in first 5 min
 *     after a price move > 3%.
 *
 *   The Degen (suspect 3):
 *     LLM-driven via Z.AI credits (DR-201). Send last-N-candles as context;
 *     model outputs a JSON { side, size, reasoning }. FOMO entries after a
 *     3-candle run, revenge trades after a loss, 2-5× oversized positions.
 *
 *   The Sleeper (suspect 4):
 *     Active window follows a human sleep cycle (IST, active 09:00-01:00,
 *     silent 01:00-09:00). Trades in bursts, occasional fat-finger (× 10 size)
 *     immediately corrected by a close 2-8 s later. Designed to fool players.
 *
 *   Paper Hands (suspect 5) [Cut #3 — drop if behind]:
 *     Monitors price change from last-known price. Sells if Δ < -1.5%,
 *     buys if Δ > +1.5%. Painfully human-looking.
 *
 * To add a personality: implement Bot interface → import here → push to bots[].
 * ─────────────────────────────────────────────────────────────────────────────
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
