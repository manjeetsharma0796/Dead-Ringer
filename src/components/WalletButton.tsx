"use client";

import { useStore } from "@/lib/store";
import { fmtMnt, truncAddr } from "@/lib/format";

export function WalletButton({ className = "" }: { className?: string }) {
  const { wallet, connect, disconnect } = useStore();

  if (wallet.status === "connected") {
    return (
      <button
        type="button"
        onClick={disconnect}
        title="Disconnect wallet"
        className={`group cursor-pointer rounded-sm border border-line bg-surface px-3 py-1.5 font-mono text-2xs text-ink transition-colors duration-150 hover:border-dim ${className}`}
      >
        <span className="text-ink">{fmtMnt(wallet.balance)}</span>
        <span className="mx-2 text-line">|</span>
        <span className="text-dim group-hover:hidden">{truncAddr(wallet.address)}</span>
        <span className="hidden text-loss group-hover:inline">disconnect</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={connect}
      disabled={wallet.status === "connecting"}
      className={`cursor-pointer bg-accent px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-black transition-opacity duration-150 hover:opacity-90 disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      {wallet.status === "connecting" ? (
        <span className="animate-blink">Connecting…</span>
      ) : (
        "Connect wallet"
      )}
    </button>
  );
}
