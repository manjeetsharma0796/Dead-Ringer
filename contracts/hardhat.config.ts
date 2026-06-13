import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const MANTLE_SEPOLIA_RPC =
  process.env.MANTLE_SEPOLIA_RPC || "https://rpc.sepolia.mantle.xyz";
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
const MANTLESCAN_API_KEY = process.env.MANTLESCAN_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    mantleSepolia: {
      url: MANTLE_SEPOLIA_RPC,
      chainId: 5003,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    // Mantle Sepolia uses a Blockscout-compatible explorer. Any non-empty key
    // works for verification; the customChains entry points the verifier at the
    // correct API + browser URLs for chainId 5003.
    apiKey: {
      mantleSepolia: MANTLESCAN_API_KEY,
    },
    customChains: [
      {
        network: "mantleSepolia",
        chainId: 5003,
        urls: {
          apiURL: "https://explorer.sepolia.mantle.xyz/api",
          browserURL: "https://explorer.sepolia.mantle.xyz",
        },
      },
    ],
  },
};

export default config;
