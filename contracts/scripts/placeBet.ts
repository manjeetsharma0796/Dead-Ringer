import { ethers, network } from "hardhat";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * DEMO helper: place one player's verdicts on a round so the full
 * bet → reveal → settle → claim loop can be exercised live.
 *
 * Reads the deployed address from deployments/{network}.json and the round
 * truth from deployments/round-{ROUND_ID}.json. The player guesses BOT on the
 * first 6 suspects and HUMAN on the last 2 — given the seeded truth
 * (0..3 bots, 4..7 humans) that's 6 correct / 2 wrong, a realistic mixed read.
 *
 * Usage:
 *   ROUND_ID=1 STAKE=0.02 npx hardhat run scripts/placeBet.ts --network mantleSepolia
 */

function dir() {
  return join(__dirname, "..", "deployments");
}

async function main() {
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("No signer. Set PRIVATE_KEY/DEPLOYER_PRIVATE_KEY in .env.");

  const roundId = Number(process.env.ROUND_ID ?? "1");
  const stake = process.env.STAKE ?? "0.02";

  const depFile = join(dir(), `${network.name}.json`);
  if (!existsSync(depFile)) throw new Error(`No deployment at ${depFile}`);
  const { address } = JSON.parse(readFileSync(depFile, "utf8"));

  const arena = await ethers.getContractAt("Arena", address, signer);
  const view = await arena.getRound(roundId);
  if (Number(view.state) !== 0) {
    throw new Error(`Round ${roundId} is not Open (state=${Number(view.state)}). Cannot bet.`);
  }

  const n = Number(view.suspectCount);
  const suspectIds: number[] = [];
  const isHumanGuess: boolean[] = [];
  const confidences: number[] = [];
  for (let i = 0; i < n; i++) {
    suspectIds.push(i);
    // Guess HUMAN only on the last 2 suspects; BOT on the rest.
    isHumanGuess.push(i >= n - 2);
    confidences.push(8000); // 80% confidence, in bps
  }

  console.log(`Network: ${network.name}`);
  console.log(`Arena:   ${address}`);
  console.log(`Player:  ${signer.address}`);
  console.log(`Betting ${stake} MNT on round ${roundId} (${n} suspects).`);

  const tx = await arena.placeVerdicts(
    roundId,
    suspectIds,
    isHumanGuess,
    confidences,
    { value: ethers.parseEther(stake) }
  );
  const receipt = await tx.wait();
  console.log(`Verdicts placed (tx ${receipt?.hash}).`);

  const after = await arena.getRound(roundId);
  console.log(`Round ${roundId} pot is now ${ethers.formatEther(after.totalPot)} MNT.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
