"use client";

import { useRef, useState } from "react";

/*
 * SVG sparkline: 0% baseline, optional hover tooltip with time offset + value.
 * Series is assumed to span 24h at 30-minute resolution (48 points).
 */
export function Sparkline({
  data,
  width = 220,
  height = 44,
  interactive = false,
  className = "",
}: {
  data: number[];
  width?: number;
  height?: number;
  interactive?: boolean;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const min = Math.min(...data, 0);
  const max = Math.max(...data, 0);
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const yOf = (v: number) => height - 3 - ((v - min) / span) * (height - 6);
  const points = data.map((v, i) => `${(i * step).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");
  const up = data[data.length - 1] >= data[0];
  const zeroY = yOf(0);

  const onMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHover(Math.round(ratio * (data.length - 1)));
  };

  const hoursAgo = hover !== null ? (data.length - 1 - hover) * 0.5 : 0;
  const hoverVal = hover !== null ? data[hover] : 0;

  return (
    <div
      ref={wrapRef}
      className={`relative ${className}`}
      onMouseMove={interactive ? onMove : undefined}
      onMouseLeave={interactive ? () => setHover(null) : undefined}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block h-full w-full"
        role="img"
        aria-label={`24-hour P&L trend, ${up ? "up" : "down"} overall, ending at ${data[data.length - 1].toFixed(1)} percent`}
      >
        <line
          x1="0"
          y1={zeroY}
          x2={width}
          y2={zeroY}
          stroke="var(--color-line)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <polyline
          points={points}
          fill="none"
          stroke={up ? "var(--color-ink)" : "var(--color-loss)"}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {interactive && hover !== null && (
          <>
            <line
              x1={hover * step}
              y1="0"
              x2={hover * step}
              y2={height}
              stroke="var(--color-dim)"
              strokeWidth="1"
            />
            <circle cx={hover * step} cy={yOf(data[hover])} r="2.5" fill="var(--color-ink)" />
          </>
        )}
      </svg>
      {interactive && hover !== null && (
        <div
          className="pointer-events-none absolute -top-7 z-20 -translate-x-1/2 whitespace-nowrap border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-ink"
          style={{ left: `${(hover / (data.length - 1)) * 100}%` }}
          role="status"
        >
          {hoursAgo === 0 ? "now" : `t−${hoursAgo.toFixed(1)}h`} ·{" "}
          <span className={hoverVal >= 0 ? "text-ink" : "text-loss"}>
            {hoverVal >= 0 ? "+" : ""}
            {hoverVal.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}
