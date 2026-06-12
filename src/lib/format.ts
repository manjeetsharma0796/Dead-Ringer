export function fmtMnt(n: number): string {
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} MNT`;
}

export function fmtPct(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function fmtPnl(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

export function fmtCountdown(totalSec: number): string {
  const s = Math.max(0, totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return [h, m, sec].map((x) => String(x).padStart(2, "0")).join(":");
}

export function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function fmtMult(m: number): string {
  return `${m.toFixed(1)}x`;
}

/* Tape formats — fixed decimals, never truncated. */
export function fmtSize(n: number): string {
  return n.toFixed(2);
}

export function fmtPrice(n: number): string {
  return n.toFixed(4);
}

export function fmtHold(min: number): string {
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h${String(m).padStart(2, "0")}`;
}
