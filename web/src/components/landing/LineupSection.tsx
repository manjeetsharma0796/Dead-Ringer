"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SUSPECTS } from "@/lib/suspects";
import { ROUND_ID } from "@/lib/arena";
import { TradeTape } from "@/components/TradeTape";
import { useStore } from "@/lib/store";

gsap.registerPlugin(ScrollTrigger);

const FEED_A = [SUSPECTS[0]];
const FEED_B = [SUSPECTS[3]];

export function LineupSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !boardRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { x: -60, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        },
      );

      gsap.fromTo(
        boardRef.current,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: boardRef.current,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="lineup" ref={sectionRef} className="relative py-32 pl-6 pr-6 md:pl-28 md:pr-12">
      {/* Section header */}
      <div ref={headerRef} className="mb-16">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          01 / The Lineup
        </span>
        <h2 className="mt-4 font-bebas text-5xl tracking-tight md:text-7xl">TWO FEEDS. ONE HUMAN.</h2>
        <p className="mt-6 max-w-md font-mono text-xs leading-relaxed text-dim">
          Both tapes are live right now. Study the tells — reaction time, round lots, tilt after a
          loss — then call it.
        </p>
      </div>

      <div ref={boardRef}>
        <LineupBoard />
      </div>
    </section>
  );
}

function LineupBoard() {
  const { toast } = useStore();
  const [picked, setPicked] = useState<"A" | "B" | null>(null);

  return (
    <div aria-label="Live teaser" className="border border-line/50 bg-surface">
      <div className="grid grid-cols-1 md:grid-cols-2">
        {(
          [
            ["A", FEED_A],
            ["B", FEED_B],
          ] as const
        ).map(([label, feed], i) => (
          <div key={label} className={i === 1 ? "border-t border-line/50 md:border-l md:border-t-0" : ""}>
            <div className="flex items-baseline justify-between px-6 pb-2 pt-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-dim">
                Suspect {label} / No. {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-dim">
                <span aria-hidden="true" className="h-1.5 w-1.5 animate-blink bg-accent" />
                Live
              </span>
            </div>
            <div className="px-6 pb-5">
              <TradeTape suspects={feed} rows={6} compact />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-line/50 px-6 py-5">
        {picked === null ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="font-mono text-xs uppercase tracking-widest text-ink">
              Which one&apos;s human?
            </span>
            <div className="flex gap-3">
              {(["A", "B"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setPicked(l);
                    toast("Read registered.", "neutral");
                  }}
                  className="cursor-pointer border border-line px-6 py-2.5 font-mono text-xs uppercase tracking-widest text-ink transition-colors duration-200 hover:border-accent hover:text-accent"
                >
                  Suspect {l}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-accent">
              Read registered.
            </p>
            <p className="mt-3 max-w-md font-mono text-2xs leading-relaxed text-dim">
              No fabricated crowd here — every verdict is staked on-chain, and the
              real split is revealed when round {Number(ROUND_ID)} settles on Mantle.
              Enter the arena to place yours for real.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
