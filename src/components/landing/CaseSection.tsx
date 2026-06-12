"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    title: "Watch",
    note: "Study live trades and their tells. Reaction time, order sizing, discipline under drawdown — everything leaks.",
  },
  {
    title: "Verdict",
    note: "Stake MNT on human or bot. Conviction sets your multiplier — the surer you are, the more the read pays.",
  },
  {
    title: "Reveal",
    note: "Identities revealed on-chain at the bell. Winners split the pot. No appeals, no reruns.",
  },
];

export function CaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (!sectionRef.current || !cursorRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const section = sectionRef.current;
    const cursor = cursorRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect();
      gsap.to(cursor, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        duration: 0.5,
        ease: "power3.out",
      });
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    section.addEventListener("mousemove", handleMouseMove);
    section.addEventListener("mouseenter", handleMouseEnter);
    section.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      section.removeEventListener("mousemove", handleMouseMove);
      section.removeEventListener("mouseenter", handleMouseEnter);
      section.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !cardsRef.current) return;
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

      const cards = cardsRef.current?.querySelectorAll("article");
      if (cards) {
        gsap.fromTo(
          cards,
          { x: -100, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: cardsRef.current,
              start: "top 90%",
              toggleActions: "play none none reverse",
            },
          },
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="case" ref={sectionRef} className="relative py-32 pl-6 md:pl-28">
      <div
        ref={cursorRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-0 top-0 z-50 -translate-x-1/2 -translate-y-1/2",
          "h-12 w-12 rounded-full border-2 border-accent bg-accent",
          "transition-opacity duration-300",
          isHovering ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Section header */}
      <div ref={headerRef} className="mb-16 pr-6 md:pr-12">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          02 / The Case
        </span>
        <h2 className="mt-4 font-bebas text-5xl tracking-tight md:text-7xl">THREE MOVES</h2>
      </div>

      {/* Horizontal card row */}
      <div
        ref={cardsRef}
        className="scrollbar-hide flex gap-8 overflow-x-auto pb-8 pr-12"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {steps.map((step, index) => (
          <StepCard key={step.title} step={step} index={index} />
        ))}
      </div>
    </section>
  );
}

function StepCard({
  step,
  index,
}: {
  step: { title: string; note: string };
  index: number;
}) {
  return (
    <article
      className={cn(
        "group relative w-80 flex-shrink-0",
        "transition-transform duration-500 ease-out",
        "hover:-translate-y-2",
      )}
    >
      <div className="relative border border-line/50 bg-surface p-8 md:border-l md:border-r-0 md:border-t">
        <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-line/40 to-transparent" />

        <div className="mb-8 flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-dim">
            Move {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-mono text-[10px] text-dim/60">R.{String(index + 8).padStart(3, "0")}</span>
        </div>

        <h3 className="mb-4 font-bebas text-4xl tracking-tight transition-colors duration-300 group-hover:text-accent">
          {step.title}
        </h3>

        <div className="mb-6 h-px w-12 bg-accent/60 transition-all duration-500 group-hover:w-full" />

        <p className="font-mono text-xs leading-relaxed text-dim">{step.note}</p>

        <div className="absolute bottom-0 right-0 h-6 w-6 overflow-hidden">
          <div className="absolute bottom-0 right-0 h-8 w-8 translate-x-4 translate-y-4 rotate-45 border-l border-t border-line/30 bg-bg" />
        </div>
      </div>

      <div className="absolute inset-0 -z-10 translate-x-1 translate-y-1 bg-accent/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </article>
  );
}
