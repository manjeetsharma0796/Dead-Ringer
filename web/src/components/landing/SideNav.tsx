"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "hero", label: "Index" },
  { id: "lineup", label: "The Lineup" },
  { id: "case", label: "The Case" },
  { id: "builders", label: "Builders" },
  { id: "evidence", label: "Evidence" },
  { id: "join", label: "Join" },
];

export function SideNav() {
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3 },
    );

    navItems.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      aria-label="Sections"
      className="fixed left-0 top-0 z-50 hidden h-screen w-16 flex-col justify-center border-r border-line/30 bg-bg/80 backdrop-blur-sm md:flex md:w-20"
    >
      <div className="flex flex-col gap-6 px-4">
        {navItems.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollToSection(id)}
            className="group relative flex cursor-pointer items-center gap-3 py-1"
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-all duration-300",
                activeSection === id ? "scale-125 bg-accent" : "bg-dim/40 group-hover:bg-ink/60",
              )}
            />
            <span
              className={cn(
                "absolute left-6 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest opacity-0 transition-all duration-200 group-hover:left-8 group-hover:opacity-100",
                activeSection === id ? "text-accent" : "text-dim",
              )}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
