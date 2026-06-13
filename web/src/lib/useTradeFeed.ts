"use client";

import { useEffect, useRef, useState } from "react";
import { AGENTS_WS } from "./env";
import { nextTrade } from "./mock";
import type { Suspect, Trade } from "./types";

const BUFFER = 80;

export type FeedStatus = "connecting" | "live" | "mock";

export interface TradeFeed {
  /** Newest-first rolling buffer of every suspect's trades. */
  trades: Trade[];
  /** Connection state — drives DR-313 indicators + error toasts. */
  status: FeedStatus;
  /** True once at least one trade (history or live) has arrived. */
  hasData: boolean;
}

interface WsMessage {
  type: "history" | "trade";
  payload: Trade | Trade[];
}

/**
 * Live trade feed. Opens the agents WS, applies the one-shot history burst
 * (newest-first), then appends each live trade to a rolling buffer.
 *
 * If the WS cannot connect or errors, it transparently falls back to the
 * existing deterministic mock generator so the tape keeps moving — the app
 * NEVER white-screens or freezes (DR-313).
 *
 * `suspects` is only used to drive the mock fallback; live trades come from
 * the backend regardless.
 */
export function useTradeFeed(suspects: Suspect[]): TradeFeed {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [status, setStatus] = useState<FeedStatus>("connecting");

  // Keep latest suspects without re-running the effect (mock fallback only).
  const suspectsRef = useRef(suspects);
  useEffect(() => {
    suspectsRef.current = suspects;
  }, [suspects]);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let mockTimer: ReturnType<typeof setTimeout> | null = null;
    let connectTimer: ReturnType<typeof setTimeout> | null = null;
    let isLive = false;
    const counter = { n: 0 };

    const push = (t: Trade | Trade[]) => {
      if (cancelled) return;
      setTrades((prev) => {
        const incoming = Array.isArray(t) ? t : [t];
        // history arrives newest-first; live trades are single + newest.
        return [...incoming, ...prev].slice(0, BUFFER);
      });
    };

    /* ── mock fallback: mirrors the old TradeTape setTimeout cadence ─────── */
    const startMock = () => {
      if (cancelled || mockTimer || isLive) return;
      setStatus("mock");
      const list = suspectsRef.current;
      if (list.length === 0) return;

      // Seed with backdated, jittered timestamps — no same-second pileups.
      let at = Date.now();
      const seed: Trade[] = Array.from({ length: 14 }, (_, i) => {
        counter.n += 1;
        at -= 1200 + Math.random() * 12000;
        return nextTrade(
          Math.random,
          list[i % list.length].id,
          counter.n,
          new Date(at),
        );
      });
      setTrades(seed);

      const tick = () => {
        if (cancelled) return;
        const s = list[Math.floor(Math.random() * list.length)];
        counter.n += 1;
        push(nextTrade(Math.random, s.id, counter.n));
        mockTimer = setTimeout(tick, 1000 + Math.random() * 3000);
      };
      mockTimer = setTimeout(tick, 900);
    };

    /* ── live WS ─────────────────────────────────────────────────────────── */
    try {
      ws = new WebSocket(AGENTS_WS);

      // If the socket doesn't open promptly, fall back to mock.
      connectTimer = setTimeout(() => {
        if (!cancelled && !isLive) startMock();
      }, 2500);

      ws.onopen = () => {
        if (cancelled) return;
        if (connectTimer) clearTimeout(connectTimer);
        isLive = true;
        setStatus("live");
      };

      ws.onmessage = (ev) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(ev.data as string) as WsMessage;
          if (msg.type === "history" && Array.isArray(msg.payload)) {
            isLive = true;
            setStatus("live");
            push(msg.payload);
          } else if (msg.type === "trade" && !Array.isArray(msg.payload)) {
            isLive = true;
            setStatus("live");
            push(msg.payload);
          }
        } catch {
          // Ignore malformed frames.
        }
      };

      ws.onerror = () => {
        if (cancelled) return;
        isLive = false;
        startMock();
      };

      ws.onclose = () => {
        if (cancelled) return;
        // Connection dropped — keep the tape alive with mock data.
        isLive = false;
        startMock();
      };
    } catch {
      startMock();
    }

    return () => {
      cancelled = true;
      if (connectTimer) clearTimeout(connectTimer);
      if (mockTimer) clearTimeout(mockTimer);
      if (ws) {
        ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { trades, status, hasData: trades.length > 0 };
}
