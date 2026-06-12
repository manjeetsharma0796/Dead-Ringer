import type { MarketData } from "../types.js";

/**
 * Swappable price-feed interface.
 * Swap CoinGecko for Bybit (or any other source) by implementing this and
 * passing a different instance to startFeed().
 */
export interface PriceFeed {
  /** Human-readable name, e.g. "CoinGecko" or "Bybit". */
  readonly name: string;

  /**
   * Fetch the latest prices for the given asset IDs.
   * Returns a partial map — assets that fail are simply absent.
   */
  fetchPrices(assetIds: string[]): Promise<Partial<MarketData>>;
}
