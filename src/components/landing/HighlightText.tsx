"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* Orange marker sweeps across a word on scroll, flipping its ink to black. */
export function HighlightText({
  children,
  className = "",
  parallaxSpeed = 0.3,
}: {
  children: ReactNode;
  className?: string;
  parallaxSpeed?: number;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!containerRef.current || !highlightRef.current || !textRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(highlightRef.current, { scaleX: 1 });
      gsap.set(textRef.current, { color: "#000000" });
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          end: "top -20%",
          toggleActions: "play reverse play reverse",
        },
      });

      tl.fromTo(
        highlightRef.current,
        { scaleX: 0, transformOrigin: "left center" },
        { scaleX: 1, duration: 1.2, ease: "power3.out" },
      );

      tl.fromTo(
        textRef.current,
        { color: "rgb(250, 250, 250)" },
        { color: "#000000", duration: 0.6, ease: "power2.out" },
        0.5,
      );

      gsap.to(highlightRef.current, {
        yPercent: -20 * parallaxSpeed,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, [parallaxSpeed]);

  return (
    <span ref={containerRef} className={`relative inline-block ${className}`}>
      <span
        ref={highlightRef}
        className="absolute inset-0 bg-accent"
        aria-hidden="true"
        style={{
          left: "-0.1em",
          right: "-0.1em",
          top: "0.15em",
          bottom: "0.1em",
          transform: "scaleX(0)",
          transformOrigin: "left center",
        }}
      />
      <span ref={textRef} className="relative z-10">
        {children}
      </span>
    </span>
  );
}
