/**
 * CoinGecko simple/price feed (no API key required).
 * Rate limit: ~10–50 req/min on the free tier — our 3s polling is well within.
 */

import type { MarketData } from "../types.js";
import type { PriceFeed } from "./types.js";
import { ASSET_TO_PAIR } from "../config.js";

interface CoinGeckoSimpleResponse {
  [coinId: string]: {
    usd?: number;
  };
}

export class CoinGeckoFeed implements PriceFeed {
  readonly name = "CoinGecko";

  async fetchPrices(assetIds: string[]): Promise<Partial<MarketData>> {
    const ids = assetIds.join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

    let raw: CoinGeckoSimpleResponse;
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        console.warn(`[CoinGecko] HTTP ${res.status} — skipping tick`);
        return {};
      }
      raw = (await res.json()) as CoinGeckoSimpleResponse;
    } catch (err) {
      // Network error or timeout — degrade gracefully; stale prices remain.
      console.warn(`[CoinGecko] fetch error: ${(err as Error).message}`);
      return {};
    }

    const now = Date.now();
    const result: Partial<MarketData> = {};

    for (const [coinId, data] of Object.entries(raw)) {
      const price = data?.usd;
      if (typeof price !== "number") continue;
      const pair = ASSET_TO_PAIR[coinId] ?? `${coinId.toUpperCase()}/USD`;
      result[pair] = { pair, price, updatedAt: now };
    }

    return result;
  }
}
