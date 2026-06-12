"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-4 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`w-full border bg-raised px-4 py-2.5 text-xs font-medium ${
              t.tone === "accent"
                ? "border-accent text-accent"
                : t.tone === "error"
                  ? "border-loss text-loss"
                  : "border-line text-ink"
            }`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
