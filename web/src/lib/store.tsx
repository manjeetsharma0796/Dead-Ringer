"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { mantleSepoliaTestnet } from "./wagmi";
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

/** Converts a raw bigint balance (18-decimal MNT) to a human-readable number. */
function formatMntBalance(raw: bigint, decimals: number): number {
  // Divide by 10^decimals and keep 4 significant figures worth of precision.
  const divisor = BigInt(10 ** decimals);
  const whole = Number(raw / divisor);
  const frac = Number(raw % divisor) / 10 ** decimals;
  return Math.round((whole + frac) * 100) / 100;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  /* ── wagmi hooks ─────────────────────────────────────────────────────── */
  const { address, isConnected, isConnecting, chainId } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const { data: balanceData } = useBalance({
    address,
    chainId: mantleSepoliaTestnet.id,
    // Re-fetch every 15 s while connected.
    query: { enabled: isConnected, refetchInterval: 15_000 },
  });

  /* ── derived WalletState (preserves the exact shape components expect) ─ */
  const wallet = useMemo<WalletState>(() => {
    if (isConnecting) return { status: "connecting" };
    if (isConnected && address) {
      const balance = balanceData
        ? formatMntBalance(balanceData.value, balanceData.decimals)
        : 0;
      return { status: "connected", address, balance };
    }
    return { status: "disconnected" };
  }, [isConnecting, isConnected, address, balanceData]);

  /* ── toast ────────────────────────────────────────────────────────────── */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((message: string, tone: Toast["tone"] = "neutral") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  /* ── connect / disconnect ─────────────────────────────────────────────── */
  /** Fires the injected connector, then switches chain if needed. Returns void. */
  const connect = useCallback((): void => {
    void (async () => {
      try {
        await connectAsync({ connector: injected() });
        // After connecting, if the user is on the wrong chain, switch to Mantle Sepolia.
        if (chainId !== mantleSepoliaTestnet.id) {
          try {
            await switchChainAsync({ chainId: mantleSepoliaTestnet.id });
          } catch {
            toast("Please switch to Mantle Sepolia (chain 5003).", "error");
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Connection failed";
        toast(msg, "error");
      }
    })();
  }, [connectAsync, switchChainAsync, chainId, toast]);

  const disconnect = useCallback((): void => {
    void disconnectAsync().catch(() => {
      // Ignore disconnect errors; wagmi state still updates.
    });
  }, [disconnectAsync]);

  /* ── fire toast when wallet state changes ─────────────────────────────── */
  const prevStatus = useRef<WalletState["status"]>("disconnected");
  useEffect(() => {
    if (wallet.status === prevStatus.current) return;
    if (wallet.status === "connected") toast("Wallet connected", "accent");
    prevStatus.current = wallet.status;
  }, [wallet.status, toast]);

  /* ── wrong-chain detection ────────────────────────────────────────────── */
  // Only WARN here — do NOT auto-switch. The actual switch happens once, at the
  // moment the user signs (see GuessSlip). Firing switchChain from an effect
  // races the write's own switch and trips MetaMask's -32002
  // ("request already pending" / "requested resource not available").
  const warnedWrongChain = useRef(false);
  useEffect(() => {
    if (!isConnected || chainId === undefined) return;
    if (chainId !== mantleSepoliaTestnet.id) {
      if (!warnedWrongChain.current) {
        toast("Wrong network — you'll be asked to switch to Mantle Sepolia when you bet.", "neutral");
        warnedWrongChain.current = true;
      }
    } else {
      warnedWrongChain.current = false;
    }
  }, [isConnected, chainId, toast]);

  /* ── slip, stake, lock ───────────────────────────────────────────────── */
  const [slip, setSlip] = useState<Record<number, SlipEntry>>({});
  const [stake, setStake] = useState(50);
  const [locked, setLocked] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);

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

  /* ── context value ───────────────────────────────────────────────────── */
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
    [
      wallet,
      connect,
      disconnect,
      slip,
      setVerdict,
      clearVerdict,
      stake,
      locked,
      lockSlip,
      unlockSlip,
      slipOpen,
      toasts,
      toast,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
