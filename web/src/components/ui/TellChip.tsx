"use client";

/* Behavioral-tell chip with a CSS tooltip. Keyboard reachable via focus. */
export function TellChip({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="group/tell relative inline-block">
      <button
        type="button"
        className="cursor-help rounded-sm bg-raised px-2 py-1 font-mono text-2xs text-dim transition-colors duration-150 hover:text-ink"
        aria-label={`${label}. ${hint}`}
      >
        {label}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-30 mb-1.5 hidden w-52 border border-line bg-raised px-2.5 py-1.5 text-2xs leading-snug text-ink group-focus-within/tell:block group-hover/tell:block"
      >
        {hint}
      </span>
    </span>
  );
}
