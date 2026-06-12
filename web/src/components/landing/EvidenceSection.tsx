"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/ui/CountUp";

gsap.registerPlugin(ScrollTrigger);

const stats = [
  {
    label: "Total Staked",
    value: 412300,
    suffix: " MNT",
    note: "Wagered on reads across every round to date.",
    span: "col-span-2 row-span-2",
  },
  {
    label: "Detectives",
    value: 2184,
    suffix: "",
    note: "Active readers working the floor.",
    span: "col-span-1 row-span-1",
  },
  {
    label: "Best Fool-Rate",
    value: 73,
    suffix: "%",
    note: "The most convincing machine yet fielded.",
    span: "col-span-1 row-span-2",
  },
  {
    label: "Avg Detection Accuracy",
    value: 54,
    suffix: "%",
    note: "Barely better than a coin flip.",
    span: "col-span-2 row-span-1",
  },
];

export function EvidenceSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !gridRef.current) return;
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
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        },
      );

      const cards = gridRef.current?.querySelectorAll("article");
      if (cards && cards.length > 0) {
        gsap.set(cards, { y: 60, opacity: 0 });
        gsap.to(cards, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="evidence" className="relative py-32 pl-6 pr-6 md:pl-28 md:pr-12">
      {/* Section header */}
      <div ref={headerRef} className="mb-16 flex items-end justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
            04 / Evidence
          </span>
          <h2 className="mt-4 font-bebas text-5xl tracking-tight md:text-7xl">THE NUMBERS</h2>
        </div>
        <p className="hidden max-w-xs text-right font-mono text-xs leading-relaxed text-dim md:block">
          54% average accuracy. The machines are already passing — the question is whether you can
          tell.
        </p>
      </div>

      {/* Asymmetric grid */}
      <div
        ref={gridRef}
        className="grid auto-rows-[180px] grid-cols-2 gap-4 md:auto-rows-[200px] md:grid-cols-4 md:gap-6"
      >
        {stats.map((stat, index) => (
          <StatCard key={stat.label} stat={stat} index={index} persistHover={index === 0} />
        ))}
      </div>
    </section>
  );
}

function StatCard({
  stat,
  index,
  persistHover = false,
}: {
  stat: { label: string; value: number; suffix: string; note: string; span: string };
  index: number;
  persistHover?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const [isScrollActive, setIsScrollActive] = useState(false);

  useEffect(() => {
    if (!persistHover || !cardRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: cardRef.current,
        start: "top 80%",
        onEnter: () => setIsScrollActive(true),
      });
    }, cardRef);

    return () => ctx.revert();
  }, [persistHover]);

  const isActive = isHovered || isScrollActive;

  return (
    <article
      ref={cardRef}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden border border-line/40 p-5 transition-all duration-500",
        stat.span,
        isActive && "border-accent/60",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background layer */}
      <div
        className={cn(
          "absolute inset-0 bg-accent/5 transition-opacity duration-500",
          isActive ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Content */}
      <div className="relative z-10">
        <span className="font-mono text-[10px] uppercase tracking-widest text-dim">
          {stat.label}
        </span>
        <div
          className={cn(
            "mt-3 font-bebas text-4xl tracking-tight transition-colors duration-300 md:text-6xl",
            isActive ? "text-accent" : "text-ink",
          )}
        >
          <CountUp value={stat.value} suffix={stat.suffix} />
        </div>
      </div>

      {/* Note — reveals on hover */}
      <div className="relative z-10">
        <p
          className={cn(
            "max-w-[280px] font-mono text-xs leading-relaxed text-dim transition-all duration-500",
            isActive ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
          )}
        >
          {stat.note}
        </p>
      </div>

      {/* Index marker */}
      <span
        className={cn(
          "absolute bottom-4 right-4 font-mono text-[10px] transition-colors duration-300",
          isActive ? "text-accent" : "text-dim/40",
        )}
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Corner line */}
      <div
        className={cn(
          "absolute right-0 top-0 h-12 w-12 transition-all duration-500",
          isActive ? "opacity-100" : "opacity-0",
        )}
        aria-hidden="true"
      >
        <div className="absolute right-0 top-0 h-[1px] w-full bg-accent" />
        <div className="absolute right-0 top-0 h-full w-[1px] bg-accent" />
      </div>
    </article>
  );
}
