/**
 * Express HTTP routes for the Dead Ringer simulator API.
 *
 * GET  /health           — liveness check
 * GET  /trades           — full trade log, optionally filtered by ?suspectId=
 * GET  /suspects         — per-suspect summary stats
 * POST /admin/trade      — inject a manual human trade (DR-204 skeleton)
 */

import { Router, Request, Response } from "express";
import type { TradeEngine } from "../engine/index.js";
import type { FeedManager } from "../feed/index.js";
import { SUSPECT_IDS } from "../config.js";
import type { TradeRequest } from "../types.js";
import { computeSuspectStats } from "../engine/stats.js";

export function buildRouter(engine: TradeEngine, feed: FeedManager): Router {
  const router = Router();

  // ── GET /health ──────────────────────────────────────────────────────────
  router.get("/health", (_req: Request, res: Response) => {
    const market = feed.latest();
    res.json({
      ok: true,
      ts: new Date().toISOString(),
      pairs: Object.fromEntries(
        Object.entries(market).map(([pair, snap]) => [pair, snap.price]),
      ),
    });
  });

  // ── GET /trades ──────────────────────────────────────────────────────────
  router.get("/trades", (req: Request, res: Response) => {
    const raw = req.query["suspectId"];
    if (raw !== undefined) {
      const id = Number(raw);
      if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: "suspectId must be a positive integer" });
        return;
      }
      res.json(engine.tradesFor(id));
      return;
    }
    res.json(engine.allTrades());
  });

  // ── GET /suspects ─────────────────────────────────────────────────────────
  // Per-suspect behavioral tells (DR-207), computed in engine/stats.ts as pure
  // functions over the trade log. Stable regardless of bot tuning or the
  // economic model — a tell is a measurement. Fills the frontend SuspectStats.
  router.get("/suspects", (_req: Request, res: Response) => {
    const suspects = SUSPECT_IDS.map((id) => ({
      suspectId: id,
      ...computeSuspectStats(engine.tradesFor(id)),
    }));
    res.json(suspects);
  });

  // ── POST /admin/trade ─────────────────────────────────────────────────────
  //
  // DR-204 skeleton — human paper trade injector.
  // Accepts the same Trade shape the frontend understands, minus server-filled
  // fields (id, ts). The resulting Trade enters the SAME log + stream as bots
  // so human and bot trades are indistinguishable (parity is the whole game).
  //
  // Body: { suspectId: number, side: "BUY"|"SELL", pair: string, size: number }
  //
  // DR-204 TODO:
  //   - Add simple auth (shared secret header) so only the admin page can POST.
  //   - Validate suspectId is designated as a human slot (after DR-502 locks count).
  //   - Rate-limit per suspectId to prevent accidental spam.
  router.post("/admin/trade", (req: Request, res: Response) => {
    const body = req.body as Partial<TradeRequest>;

    // Input validation
    const { suspectId, side, pair, size } = body;
    if (
      typeof suspectId !== "number" ||
      (side !== "BUY" && side !== "SELL") ||
      typeof pair !== "string" ||
      typeof size !== "number" ||
      size <= 0
    ) {
      res.status(400).json({
        error: "Required: suspectId (number), side ('BUY'|'SELL'), pair (string), size (number > 0)",
      });
      return;
    }

    const market = feed.latest();
    try {
      const trade = engine.execute({ suspectId, side, pair, size }, market);
      res.status(201).json(trade);
    } catch (err) {
      res.status(422).json({ error: (err as Error).message });
    }
  });

  return router;
}
