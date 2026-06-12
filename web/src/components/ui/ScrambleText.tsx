"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ0123456789#$%&";

/*
 * Decrypt-style character shuffle. Letters resolve left to right.
 * Pattern sourced from 21st.dev, rebuilt: no deps, reduced-motion safe,
 * screen readers get the real text immediately.
 */
export function ScrambleText({
  text,
  duration = 700,
  delay = 0,
  rescrambleOnHover = false,
  className = "",
  as: Tag = "span",
}: {
  text: string;
  duration?: number;
  delay?: number;
  rescrambleOnHover?: boolean;
  className?: string;
  as?: "span" | "div" | "h1" | "h2" | "h3";
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(text);
  const running = useRef(false);

  const scramble = () => {
    if (reduce || running.current) return;
    running.current = true;
    const step = 30;
    const steps = duration / step;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      const settled = Math.floor((n / steps) * text.length);
      setDisplay(
        text
          .split("")
          .map((c, i) => {
            if (c === " " || i < settled) return c;
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join(""),
      );
      if (n >= steps) {
        clearInterval(id);
        setDisplay(text);
        running.current = false;
      }
    }, step);
  };

  useEffect(() => {
    const t = setTimeout(scramble, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <Tag
      className={className}
      onMouseEnter={rescrambleOnHover ? scramble : undefined}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{display}</span>
    </Tag>
  );
}
