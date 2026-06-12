"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Countdown } from "@/components/ui/Countdown";
import { useStore } from "@/lib/store";

gsap.registerPlugin(ScrollTrigger);

export function ColophonSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

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

      if (gridRef.current) {
        const columns = gridRef.current.querySelectorAll(":scope > div");
        gsap.from(columns, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        });
      }

      if (footerRef.current) {
        gsap.from(footerRef.current, {
          y: 20,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 95%",
            toggleActions: "play none none reverse",
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="join"
      className="relative border-t border-line/30 py-32 pl-6 pr-6 md:pl-28 md:pr-12"
    >
      {/* Section header + CTA */}
      <div ref={headerRef} className="mb-24">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          05 / Join
        </span>
        <h2 className="mt-4 font-bebas text-5xl tracking-tight md:text-8xl">
          ROUND 8 OPENS IN{" "}
          <Countdown fromSeconds={2 * 3600 + 11 * 60 + 9} className="text-accent" />
        </h2>
        <AlertForm />
      </div>

      {/* Multi-column colophon */}
      <div ref={gridRef} className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12 lg:grid-cols-6">
        <div className="col-span-1">
          <h4 className="mb-4 font-mono text-[9px] uppercase tracking-[0.3em] text-dim">Case</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-ink/80">Dead Ringer</li>
            <li className="font-mono text-xs text-ink/80">Spot-the-Bot Arena</li>
          </ul>
        </div>

        <div className="col-span-1">
          <h4 className="mb-4 font-mono text-[9px] uppercase tracking-[0.3em] text-dim">Protocol</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-ink/80">Mantle</li>
            <li className="font-mono text-xs text-ink/80">On-chain Reveals</li>
            <li className="font-mono text-xs text-ink/80">MNT Stakes</li>
          </ul>
        </div>

        <div className="col-span-1">
          <h4 className="mb-4 font-mono text-[9px] uppercase tracking-[0.3em] text-dim">Navigate</h4>
          <ul className="space-y-2">
            <li>
              <Link
                href="/arena"
                className="font-mono text-xs text-ink/80 transition-colors duration-200 hover:text-accent"
              >
                Arena
              </Link>
            </li>
            <li>
              <Link
                href="/leaderboard"
                className="font-mono text-xs text-ink/80 transition-colors duration-200 hover:text-accent"
              >
                Leaderboard
              </Link>
            </li>
          </ul>
        </div>

        <div className="col-span-1">
          <h4 className="mb-4 font-mono text-[9px] uppercase tracking-[0.3em] text-dim">Contact</h4>
          <ul className="space-y-2">
            <li>
              <a
                href="#"
                className="font-mono text-xs text-ink/80 transition-colors duration-200 hover:text-accent"
              >
                Docs
              </a>
            </li>
            <li>
              <a
                href="#"
                className="font-mono text-xs text-ink/80 transition-colors duration-200 hover:text-accent"
              >
                GitHub
              </a>
            </li>
            <li>
              <a
                href="#"
                className="font-mono text-xs text-ink/80 transition-colors duration-200 hover:text-accent"
              >
                Twitter/X
              </a>
            </li>
          </ul>
        </div>

        <div className="col-span-1">
          <h4 className="mb-4 font-mono text-[9px] uppercase tracking-[0.3em] text-dim">Stack</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-ink/80">Next.js</li>
            <li className="font-mono text-xs text-ink/80">Tailwind CSS</li>
          </ul>
        </div>

        <div className="col-span-1">
          <h4 className="mb-4 font-mono text-[9px] uppercase tracking-[0.3em] text-dim">Year</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-ink/80">2026</li>
            <li className="font-mono text-xs text-ink/80">Round 8</li>
          </ul>
        </div>
      </div>

      {/* Bottom copyright */}
      <div
        ref={footerRef}
        className="mt-24 flex flex-col gap-4 border-t border-line/20 pt-8 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex items-center gap-3">
          <Image src="/mascot.png" alt="" width={24} height={24} className="h-6 w-6" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-dim">
            © 2026 Dead Ringer. All identities sealed.
          </p>
        </div>
        <p className="font-mono text-[10px] text-dim">Built on Mantle. Revealed on-chain.</p>
      </div>
    </section>
  );
}

function AlertForm() {
  const { toast } = useStore();
  const [email, setEmail] = useState("");

  return (
    <form
      className="mt-12 flex max-w-xl flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          toast("Enter a valid email address", "error");
          return;
        }
        setEmail("");
        toast("You're on the list.", "accent");
      }}
    >
      <label htmlFor="cta-email" className="sr-only">
        Email address
      </label>
      <input
        id="cta-email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 border border-line bg-transparent px-5 py-3.5 font-mono text-sm text-ink placeholder:text-dim focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        className="cursor-pointer border border-accent bg-accent px-6 py-3.5 font-mono text-xs uppercase tracking-widest text-black transition-opacity duration-200 hover:opacity-90"
      >
        Get Round Alerts
      </button>
    </form>
  );
}
