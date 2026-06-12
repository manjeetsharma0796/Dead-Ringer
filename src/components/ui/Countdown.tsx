"use client";

import { useEffect, useState } from "react";
import { fmtCountdown } from "@/lib/format";
import { useMounted } from "@/lib/useMounted";

export function Countdown({
  fromSeconds,
  className = "",
}: {
  fromSeconds: number;
  className?: string;
}) {
  const mounted = useMounted();
  const [left, setLeft] = useState(fromSeconds);

  useEffect(() => {
    const t = setInterval(() => setLeft((s) => (s <= 0 ? fromSeconds : s - 1)), 1000);
    return () => clearInterval(t);
  }, [fromSeconds]);

  return (
    <span className={`font-mono tabular-nums ${className}`} suppressHydrationWarning>
      {mounted ? fmtCountdown(left) : fmtCountdown(fromSeconds)}
    </span>
  );
}
