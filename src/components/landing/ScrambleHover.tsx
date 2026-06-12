"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";

const GLYPHS = "!@#$%^&*()_+-=<>?/\\[]{}Xx";

/* Text decodes from glyph noise on hover — the inspo's link treatment. */
export function ScrambleHover({
  text,
  className,
  duration = 0.4,
}: {
  text: string;
  className?: string;
  duration?: number;
}) {
  const [displayText, setDisplayText] = useState(text);
  const isAnimating = useRef(false);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (isAnimating.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    isAnimating.current = true;

    if (tweenRef.current) tweenRef.current.kill();

    const finalChars = text.split("");
    setDisplayText(
      finalChars.map(() => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join(""),
    );

    const locked = new Set<number>();
    const scramble = { progress: 0 };
    tweenRef.current = gsap.to(scramble, {
      progress: 1,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        const numLocked = Math.floor(scramble.progress * finalChars.length);
        for (let i = 0; i < numLocked; i++) locked.add(i);
        setDisplayText(
          finalChars
            .map((char, i) =>
              locked.has(i) ? char : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
            )
            .join(""),
        );
      },
      onComplete: () => {
        setDisplayText(text);
        isAnimating.current = false;
      },
    });
  }, [text, duration]);

  useEffect(() => {
    if (!isAnimating.current) setDisplayText(text);
  }, [text]);

  useEffect(() => {
    return () => {
      if (tweenRef.current) tweenRef.current.kill();
    };
  }, []);

  return (
    <span className={className} onMouseEnter={handleMouseEnter}>
      {displayText}
    </span>
  );
}
