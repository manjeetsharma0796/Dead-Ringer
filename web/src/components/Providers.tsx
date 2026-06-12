"use client";

/**
 * Client-side provider tree.
 *
 * WagmiProvider and QueryClientProvider both require a browser environment,
 * so this file is a 'use client' boundary.  The root layout (a Server
 * Component) imports this wrapper, which keeps SSR intact: the HTML shell is
 * still server-rendered; the wagmi/query context is hydrated on the client.
 *
 * StoreProvider is nested here so it can use wagmi hooks once we rewire it.
 */

import { type ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";
import { StoreProvider } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  // Create a stable QueryClient per component mount (safe in Next.js App Router).
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <StoreProvider>{children}</StoreProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
