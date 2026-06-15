/**
 * autoSeed.mjs — run with: node scripts/autoSeed.mjs
 *
 * Watches for the first Claim on the current round. The moment one fires,
 * it opens the next round, registers fresh commitments, saves the salt file,
 * and bumps NEXT_PUBLIC_ARENA_ROUND_ID in web/.env.local.
 *
 * The Next.js server picks up env changes on restart; the script prints a
 * reminder. Keep this running in a background terminal during the demo.
 */

import { ethers } from "ethers";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const RPC = process.env.MANTLE_SEPOLIA_RPC || "https://rpc.sepolia.mantle.xyz";
const PK  = process.env.DEPLOYER_PRIVATE_KEY;
if (!PK) throw new Error("DEPLOYER_PRIVATE_KEY not set in contracts/.env");

const deploymentPath = join(__dirname, "../deployments/mantleSepolia.json");
const { address: ARENA_ADDRESS } = JSON.parse(readFileSync(deploymentPath, "utf8"));

const ABI = [
  "function roundCount() view returns (uint256)",
  "function openRound(uint256 suspectCount) returns (uint256)",
  "function registerSuspects(uint256 roundId, bytes32[] calldata commits)",
  "event Claimed(address indexed player, uint256 indexed roundId, uint256 amount)",
];

const SUSPECT_COUNT = 8;

function commitOf(isHuman, salt) {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["bool", "bytes32"], [isHuman, salt])
  );
}

async function seedNextRound(arena) {
  const identities = [];
  const commits    = [];
  for (let i = 0; i < SUSPECT_COUNT; i++) {
    const isHuman = i >= 4; // 0..3 bots, 4..7 humans
    const salt    = ethers.hexlify(ethers.randomBytes(32));
    identities.push({ suspectId: i, isHuman, salt });
    commits.push(commitOf(isHuman, salt));
  }

  console.log("Opening next round…");
  const openTx  = await arena.openRound(SUSPECT_COUNT);
  await openTx.wait();
  const newRoundId = Number(await arena.roundCount());
  console.log(`  Round ${newRoundId} opened.`);

  const regTx = await arena.registerSuspects(newRoundId, commits);
  await regTx.wait();
  console.log(`  Registered ${SUSPECT_COUNT} suspect commitments.`);

  // Persist salts for revealRound.ts
  const record = {
    network: "mantleSepolia",
    arena: ARENA_ADDRESS,
    roundId: newRoundId,
    suspectCount: SUSPECT_COUNT,
    identities,
    commits,
    timestamp: new Date().toISOString(),
  };
  const outFile = join(__dirname, `../deployments/round-${newRoundId}.json`);
  writeFileSync(outFile, JSON.stringify(record, null, 2) + "\n");
  console.log(`  Secrets saved → ${outFile}`);

  // Bump NEXT_PUBLIC_ARENA_ROUND_ID in web/.env.local
  const envPath = join(__dirname, "../../web/.env.local");
  if (existsSync(envPath)) {
    const updated = readFileSync(envPath, "utf8").replace(
      /NEXT_PUBLIC_ARENA_ROUND_ID=\d+/,
      `NEXT_PUBLIC_ARENA_ROUND_ID=${newRoundId}`
    );
    writeFileSync(envPath, updated);
    console.log(`  web/.env.local → NEXT_PUBLIC_ARENA_ROUND_ID=${newRoundId}`);
  }

  return newRoundId;
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const signer   = new ethers.Wallet(PK, provider);
  const arena    = new ethers.Contract(ARENA_ADDRESS, ABI, signer);

  const currentRoundId = Number(await arena.roundCount());
  console.log(`Arena    : ${ARENA_ADDRESS}`);
  console.log(`Round    : ${currentRoundId} (waiting for first Claim…)`);
  console.log("Ctrl+C to stop.\n");

  // Mantle Sepolia RPC doesn't support eth_newFilter, so we poll queryFilter
  // (getLogs) on each new block instead of subscribing.
  let lastCheckedBlock = (await provider.getBlockNumber()) - 1;
  const filter = arena.filters.Claimed(null, currentRoundId);

  const poll = async () => {
    try {
      const latest = await provider.getBlockNumber();
      if (latest <= lastCheckedBlock) return;

      const events = await arena.queryFilter(filter, lastCheckedBlock + 1, latest);
      lastCheckedBlock = latest;

      if (events.length === 0) return;

      const ev = events[0];
      const [player, roundId, amount] = ev.args;
      console.log(`Claim detected!`);
      console.log(`  Player : ${player}`);
      console.log(`  Amount : ${ethers.formatEther(amount)} MNT`);
      console.log(`  Round  : ${roundId}\n`);

      clearInterval(timer);
      try {
        const newId = await seedNextRound(arena);
        console.log(`\nRound ${newId} is live on-chain.`);
        console.log("Restart the Next.js server (Ctrl+C → npm run dev) to serve the new round.");
      } catch (err) {
        console.error("Failed to seed next round:", err);
      }
      process.exit(0);
    } catch (err) {
      // Log but don't crash — just retry next interval.
      console.error("Poll error (will retry):", err.shortMessage || err.message);
    }
  };

  // Poll every 5 seconds (~2 blocks on Mantle Sepolia).
  const timer = setInterval(poll, 5_000);
  poll(); // immediate first check
}

main().catch((err) => { console.error(err); process.exit(1); });
