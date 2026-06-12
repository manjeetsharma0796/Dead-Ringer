"use client";

/*
 * Adapted from the "shape-landing-hero" (HeroGeometric) community component.
 * Geometry + choreography kept: rotated pill shapes drop in, then float forever.
 * Rendering restyled to the DEAD RINGER token system — flat fills and hairline
 * borders instead of gradients/blur/glow, which this design system forbids.
 */

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  tone = "ink",
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  tone?: "ink" | "line" | "human" | "bot";
}) {
  const reduce = useReducedMotion();

  const fill =
    tone === "human"
      ? "bg-human/[0.05]"
      : tone === "bot"
        ? "bg-bot/[0.05]"
        : tone === "line"
          ? "bg-raised/60"
          : "bg-ink/[0.04]";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
      aria-hidden="true"
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        style={{ width, height }}
        className="relative"
      >
        <div className={cn("absolute inset-0 rounded-full border border-line", fill)} />
      </motion.div>
    </motion.div>
  );
}

/* Background layer for the landing hero — five drifting shapes, corners only
   so the headline/mascot/teaser stay on clean felt. */
export function HeroShapes() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <ElegantShape
        delay={0.3}
        width={620}
        height={140}
        rotate={12}
        tone="ink"
        className="left-[-12%] top-[12%] md:left-[-6%] md:top-[16%]"
      />
      <ElegantShape
        delay={0.5}
        width={520}
        height={120}
        rotate={-15}
        tone="bot"
        className="right-[-8%] top-[72%] md:right-[-2%] md:top-[76%]"
      />
      <ElegantShape
        delay={0.4}
        width={320}
        height={80}
        rotate={-8}
        tone="line"
        className="bottom-[4%] left-[4%] md:bottom-[8%] md:left-[8%]"
      />
      <ElegantShape
        delay={0.6}
        width={220}
        height={60}
        rotate={20}
        tone="human"
        className="right-[12%] top-[8%] md:right-[18%] md:top-[12%]"
      />
      <ElegantShape
        delay={0.7}
        width={160}
        height={40}
        rotate={-25}
        tone="ink"
        className="left-[18%] top-[4%] md:left-[24%] md:top-[8%]"
      />
    </div>
  );
}
