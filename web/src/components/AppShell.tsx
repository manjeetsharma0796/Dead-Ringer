"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crosshair, History, ListChecks, Trophy, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { WalletButton } from "@/components/WalletButton";
import { GuessSlip } from "@/components/GuessSlip";

const NAV = [
  { href: "/arena", label: "Arena" },
  { href: "/reveal", label: "Reveal" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "My desk" },
];

const TABS = [
  { href: "/arena", label: "Arena", icon: Crosshair },
  { href: "/rounds", label: "Rounds", icon: History },
  { href: null, label: "My slip", icon: ListChecks }, // opens sheet
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/profile", label: "Desk", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setSlipOpen, slipOpen, slip } = useStore();
  const count = Object.keys(slip).length;

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="noir-noise" aria-hidden="true" />
      <div className="noir-grid fixed inset-0 opacity-30" aria-hidden="true" />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-ink focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:text-bg"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 border-b border-line/50 bg-bg/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-6 px-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/mascot.png" alt="" width={32} height={32} className="h-8 w-8" priority />
            <span className="type-stamp text-sm text-ink">Dead Ringer</span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-2 md:flex">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors duration-200 ${
                    active ? "text-accent" : "text-dim hover:text-ink"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <WalletButton />
        </div>
      </header>

      <main
        id="main"
        className="relative z-10 mx-auto w-full max-w-[1500px] flex-1 px-4 pb-28 pt-6 md:pb-10 lg:px-8"
      >
        {children}
      </main>

      <GuessSlip />

      {/* mobile bottom tab bar */}
      <nav
        aria-label="App"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line/50 bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          if (t.href === null) {
            return (
              <button
                key={t.label}
                type="button"
                onClick={() => setSlipOpen(!slipOpen)}
                className="flex cursor-pointer flex-col items-center gap-0.5 py-2 text-dim"
              >
                <span className="relative">
                  <Icon size={18} strokeWidth={2} aria-hidden="true" />
                  {count > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center bg-accent px-0.5 font-mono text-[9px] font-bold text-black">
                      {count}
                    </span>
                  )}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider">{t.label}</span>
              </button>
            );
          }
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 ${active ? "text-accent" : "text-dim"}`}
            >
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
              <span className="font-mono text-[9px] uppercase tracking-wider">{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
