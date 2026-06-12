import Link from "next/link";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { SideNav } from "@/components/landing/SideNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { LineupSection } from "@/components/landing/LineupSection";
import { CaseSection } from "@/components/landing/CaseSection";
import { BuildersSection } from "@/components/landing/BuildersSection";
import { EvidenceSection } from "@/components/landing/EvidenceSection";
import { ColophonSection } from "@/components/landing/ColophonSection";

export default function LandingPage() {
  return (
    <SmoothScroll>
      <main className="relative min-h-screen">
        <div className="noir-noise" aria-hidden="true" />
        <SideNav />
        {/* Solid backdrop so the app theme never bleeds through on scroll */}
        <div className="fixed inset-0 bg-bg" aria-hidden="true" />
        <div className="noir-grid fixed inset-0 opacity-30" aria-hidden="true" />

        {/* Top-right corner nav */}
        <nav
          aria-label="Site"
          className="fixed right-6 top-6 z-50 flex items-center gap-6 md:right-12 md:top-8"
        >
          <Link
            href="/leaderboard"
            className="font-mono text-[10px] uppercase tracking-widest text-dim transition-colors duration-200 hover:text-ink"
          >
            Leaderboard
          </Link>
          <Link
            href="/arena"
            className="border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-ink transition-colors duration-200 hover:border-accent hover:text-accent"
          >
            Enter the Arena
          </Link>
        </nav>

        <div className="relative z-10">
          <HeroSection />
          <LineupSection />
          <CaseSection />
          <BuildersSection />
          <EvidenceSection />
          <ColophonSection />
        </div>
      </main>
    </SmoothScroll>
  );
}
