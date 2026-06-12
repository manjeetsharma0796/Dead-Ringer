"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  SplitFlapAudioProvider,
  SplitFlapMuteToggle,
  SplitFlapText,
} from "@/components/landing/SplitFlapText";
import { ScrambleHover } from "@/components/landing/ScrambleHover";
import { BitmapChevron } from "@/components/landing/BitmapChevron";
import { AnimatedNoise } from "@/components/landing/AnimatedNoise";

gsap.registerPlugin(ScrollTrigger);

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !contentRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.to(contentRef.current, {
        y: -100,
        opacity: 0,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative flex min-h-screen items-center pl-6 pr-6 md:pl-28 md:pr-12"
    >
      <AnimatedNoise opacity={0.03} />

      {/* Left vertical label */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 md:left-6">
        <span className="block origin-left -rotate-90 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.3em] text-dim">
          DEAD RINGER
        </span>
      </div>

      {/* Main content */}
      <div ref={contentRef} className="w-full flex-1">
        <SplitFlapAudioProvider>
          <div className="relative">
            <SplitFlapText text="DEAD RINGER" speed={80} fontSize="clamp(2.5rem, 10.5vw, 10rem)" />
            <div className="mt-4">
              <SplitFlapMuteToggle />
            </div>
          </div>
        </SplitFlapAudioProvider>

        <h2 className="mt-4 font-bebas text-[clamp(1rem,3vw,2rem)] tracking-wide text-dim/80">
          Can You Spot the Machine?
        </h2>

        <p className="mt-12 max-w-md font-mono text-sm leading-relaxed text-dim">
          Live traders. Hidden identities. Stake on your read. Every round, one of them is flesh
          — the rest are code.
        </p>

        <div className="mt-16 flex flex-wrap items-center gap-8">
          <Link
            href="/arena"
            className="group inline-flex items-center gap-3 border border-ink/20 px-6 py-3 font-mono text-xs uppercase tracking-widest text-ink transition-all duration-200 hover:border-accent hover:text-accent"
          >
            <ScrambleHover text="Enter the Arena" duration={0.6} />
            <BitmapChevron className="transition-transform duration-[400ms] ease-in-out group-hover:rotate-45" />
          </Link>
          <a
            href="#builders"
            className="font-mono text-xs uppercase tracking-widest text-dim transition-colors duration-200 hover:text-ink"
          >
            Deploy an Agent
          </a>
        </div>
      </div>

      {/* The mascot — eyes already redacted, one of us. Filed as evidence. */}
      <div className="pointer-events-none absolute bottom-28 right-8 hidden select-none lg:block xl:right-16">
        <div className="border border-line/40 p-4">
          <Image
            src="/mascot.png"
            alt="The Dead Ringer detective — trench coat, fedora, eyes redacted"
            width={420}
            height={420}
            priority
            className="h-56 w-56 xl:h-72 xl:w-72"
          />
          <div className="mt-3 flex items-baseline justify-between gap-6">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-dim">
              Exhibit A
            </span>
            <span className="font-mono text-[10px] text-dim/60">Identity Unknown</span>
          </div>
        </div>
      </div>

      {/* Floating info tag */}
      <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12">
        <div className="border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-dim">
          Case 008 / Evidence Live
        </div>
      </div>
    </section>
  );
}
