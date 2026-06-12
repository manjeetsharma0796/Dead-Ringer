"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/* False during SSR/hydration, true after — gate live/ticking UI behind this. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
