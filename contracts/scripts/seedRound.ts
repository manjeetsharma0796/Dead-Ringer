import { ethers, network } from "hardhat";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

/**
 * DR-109 round-runner (part 1): opens a fresh round for 8 suspects, builds their
 * identity commitments (suspects 0..3 = BOTS, 4..7 = HUMANS) each blinded with a
 * random 32-byte salt, registers them on-chain, and persists the salts +
 * identities to deployments/round-{roundId}.json so revealRound.ts can open them
 * later.
 *
 * The deployed address is read from deployments/{network}.json (run deploy.ts
 * first). The signer must be the Arena operator/owner.
 *
 * Usage:
 *   npx hardhat run scripts/seedRound.ts --network mantleSepolia
 *   npm run seed:round
 */

const SUSPECT_COUNT = 8;

/** identityCommit = keccak256(abi.encode(bool isHuman, bytes32 salt)). */
function commitOf(isHuman: boolean, salt: string): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["bool", "bytes32"], [isHuman, salt])
  );
}

function loadDeployment(): { address: string } {
  const file = join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!existsSync(file)) {
    throw new Error(
      `No deployment for network "${network.name}" at ${file}. Run scripts/deploy.ts first.`
    );
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

async function main() {
  const [signer] = await ethers.getSigners();
  if (!signer) {
    throw new Error("No signer available. Set PRIVATE_KEY in .env for the target network.");
  }

  const { address } = loadDeployment();
  console.log(`Network: ${network.name}`);
  console.log(`Arena:   ${address}`);
  console.log(`Signer:  ${signer.address}`);

  const arena = await ethers.getContractAt("Arena", address, signer);

  // Build identities: suspects 0..3 are BOTS (isHuman=false), 4..7 are HUMANS.
  const identities: { suspectId: number; isHuman: boolean; salt: string }[] = [];
  const commits: string[] = [];
  for (let i = 0; i < SUSPECT_COUNT; i++) {
    const isHuman = i >= 4; // 0..3 bots, 4..7 humans
    const salt = ethers.hexlify(ethers.randomBytes(32));
    identities.push({ suspectId: i, isHuman, salt });
    commits.push(commitOf(isHuman, salt));
  }

  // Open the round.
  const openTx = await arena.openRound(SUSPECT_COUNT);
  const openReceipt = await openTx.wait();
  const roundId = Number(await arena.roundCount());
  console.log(`\nOpened round ${roundId} for ${SUSPECT_COUNT} suspects (tx ${openReceipt?.hash}).`);

  // Register commitments.
  const regTx = await arena.registerSuspects(roundId, commits);
  await regTx.wait();
  console.log(`Registered ${commits.length} suspect commitments.`);

  // Persist salts + identities for reveal.
  const deploymentsDir = join(__dirname, "..", "deployments");
  if (!existsSync(deploymentsDir)) {
    mkdirSync(deploymentsDir, { recursive: true });
  }
  const record = {
    network: network.name,
    arena: address,
    roundId,
    suspectCount: SUSPECT_COUNT,
    identities,
    commits,
    timestamp: new Date().toISOString(),
  };
  const outFile = join(deploymentsDir, `round-${roundId}.json`);
  writeFileSync(outFile, JSON.stringify(record, null, 2) + "\n");
  console.log(`\nWrote round secrets to: ${outFile}`);
  console.log(`Next: place bets, then \`npx hardhat run scripts/revealRound.ts\`.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
