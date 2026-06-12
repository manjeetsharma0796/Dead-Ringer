import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import type { Chain } from "viem";

/**
 * Mantle Sepolia testnet (chain ID 5003).
 * viem/chains may not export this in all installed versions, so we define it inline.
 */
export const mantleSepoliaTestnet = {
  id: 5003,
  name: "Mantle Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "MNT",
    symbol: "MNT",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.sepolia.mantle.xyz"],
    },
    public: {
      http: ["https://rpc.sepolia.mantle.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Mantle Sepolia Explorer",
      url: "https://explorer.sepolia.mantle.xyz",
    },
  },
  testnet: true,
} as const satisfies Chain;

export const wagmiConfig = createConfig({
  chains: [mantleSepoliaTestnet],
  connectors: [injected()],
  transports: {
    [mantleSepoliaTestnet.id]: http("https://rpc.sepolia.mantle.xyz"),
  },
});
