"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SlipEntry, Verdict, WalletState } from "./types";

interface Toast {
  id: number;
  message: string;
  tone: "neutral" | "accent" | "error";
}

interface Store {
  wallet: WalletState;
  connect: () => void;
  disconnect: () => void;

  slip: Record<number, SlipEntry>;
  setVerdict: (suspectId: number, verdict: Verdict, confidence: number, multiplier: number) => void;
  clearVerdict: (suspectId: number) => void;
  stake: number;
  setStake: (n: number) => void;
  locked: boolean;
  lockSlip: () => void;
  unlockSlip: () => void;

  slipOpen: boolean;
  setSlipOpen: (open: boolean) => void;

  toasts: Toast[];
  toast: (message: string, tone?: Toast["tone"]) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({ status: "disconnected" });
  const [slip, setSlip] = useState<Record<number, SlipEntry>>({});
  const [stake, setStake] = useState(50);
  const [locked, setLocked] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((message: string, tone: Toast["tone"] = "neutral") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const connect = useCallback(() => {
    setWallet({ status: "connecting" });
    setTimeout(() => {
      setWallet({
        status: "connected",
        address: "0x7f3Bd41c09A2e5cD8f6b1E2a9c04D7e8F19aabcd",
        balance: 1250,
      });
      toast("Wallet connected", "accent");
    }, 900);
  }, [toast]);

  const disconnect = useCallback(() => {
    setWallet({ status: "disconnected" });
  }, []);

  const setVerdict = useCallback(
    (suspectId: number, verdict: Verdict, confidence: number, multiplier: number) => {
      setSlip((s) => ({ ...s, [suspectId]: { suspectId, verdict, confidence, multiplier } }));
    },
    [],
  );

  const clearVerdict = useCallback((suspectId: number) => {
    setSlip((s) => {
      const next = { ...s };
      delete next[suspectId];
      return next;
    });
  }, []);

  const lockSlip = useCallback(() => {
    setLocked(true);
    toast("Verdicts locked.", "accent");
  }, [toast]);

  const unlockSlip = useCallback(() => {
    setLocked(false);
    toast("Slip unlocked.");
  }, [toast]);

  const value = useMemo<Store>(
    () => ({
      wallet,
      connect,
      disconnect,
      slip,
      setVerdict,
      clearVerdict,
      stake,
      setStake,
      locked,
      lockSlip,
      unlockSlip,
      slipOpen,
      setSlipOpen,
      toasts,
      toast,
    }),
    [wallet, connect, disconnect, slip, setVerdict, clearVerdict, stake, locked, lockSlip, unlockSlip, slipOpen, toasts, toast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
