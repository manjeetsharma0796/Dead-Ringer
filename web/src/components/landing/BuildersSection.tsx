"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HighlightText } from "@/components/landing/HighlightText";
import { ScrambleHover } from "@/components/landing/ScrambleHover";
import { BitmapChevron } from "@/components/landing/BitmapChevron";

gsap.registerPlugin(ScrollTrigger);

const AGENT_SNIPPET = `# dead-ringer agent spec — v0.4
agent:
  name: LULLABY
  objective: believability   # not pnl

humanize:
  sleep_window: "01:30-07:10"
  reaction_ms: [1800, 9400]
  round_lots: 0.7
  tilt:
    after_loss: 1.35
    cooloff_min: 22

submit:
  round: 8
  stake: 100 MNT
  reveal: onchain`;

export function BuildersSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.from(headerRef.current, {
          x: -60,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        });
      }

      if (copyRef.current) {
        gsap.from(copyRef.current, {
          x: -80,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: copyRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        });
      }

      if (panelRef.current) {
        gsap.from(panelRef.current, {
          x: 80,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: panelRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="builders" ref={sectionRef} className="relative py-32 pl-6 pr-6 md:pl-28 md:pr-12">
      {/* Section header */}
      <div ref={headerRef} className="mb-24">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          03 / For Builders
        </span>
        <h2 className="mt-4 font-bebas text-5xl tracking-tight md:text-7xl">THE OTHER SIDE</h2>
      </div>

      <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <div ref={copyRef}>
          <h3 className="font-bebas text-4xl leading-none tracking-tight md:text-6xl lg:text-7xl">
            BUILD A BOT
            <br />
            THAT <HighlightText parallaxSpeed={0.6}>PASSES</HighlightText>
          </h3>

          <p className="mt-8 max-w-md font-mono text-sm leading-relaxed text-dim">
            Your agent wins by being believably human, not profitable. Slow it down. Make it
            sloppy. Teach it to tilt.
          </p>

          <a
            href="#"
            className="group mt-12 inline-flex items-center gap-3 border border-ink/20 px-6 py-3 font-mono text-xs uppercase tracking-widest text-ink transition-all duration-200 hover:border-accent hover:text-accent"
          >
            <ScrambleHover text="Read the Agent Spec" duration={0.6} />
            <BitmapChevron className="transition-transform duration-[400ms] ease-in-out group-hover:rotate-45" />
          </a>
        </div>

        <div ref={panelRef} className="border border-line/50 bg-surface">
          <div className="flex items-baseline justify-between border-b border-line/50 px-5 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-dim">
              agent.yaml
            </span>
            <span className="font-mono text-[10px] text-dim/60">objective: believability</span>
          </div>
          <pre className="overflow-x-auto p-6 font-mono text-xs leading-relaxed text-dim">
            <code>{AGENT_SNIPPET}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
