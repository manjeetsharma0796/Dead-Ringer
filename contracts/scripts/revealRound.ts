import { ethers, network } from "hardhat";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

/**
 * DR-109 round-runner (part 2): reads deployments/round-{roundId}.json, reveals
 * every suspect for that round (locking it first if it is still Open), then
 * calls settle() so winners can claim().
 *
 * Round selection: ROUND_ID env var if set, otherwise the highest-numbered
 * round-*.json found in deployments/. The deployed address is read from
 * deployments/{network}.json. The signer must be the Arena operator/owner.
 *
 * Usage:
 *   ROUND_ID=1 npx hardhat run scripts/revealRound.ts --network mantleSepolia
 *   npm run reveal:round
 */

const State = { Open: 0, Locked: 1, Revealed: 2, Settled: 3 } as const;

function deploymentsDir(): string {
  return join(__dirname, "..", "deployments");
}

function resolveRoundFile(): string {
  const dir = deploymentsDir();
  const explicit = process.env.ROUND_ID;
  if (explicit) {
    const file = join(dir, `round-${explicit}.json`);
    if (!existsSync(file)) throw new Error(`Round file not found: ${file}`);
    return file;
  }
  const candidates = readdirSync(dir)
    .filter((f) => /^round-\d+\.json$/.test(f))
    .map((f) => ({ f, n: Number(f.match(/\d+/)![0]) }))
    .sort((a, b) => b.n - a.n);
  if (candidates.length === 0) {
    throw new Error(`No round-*.json in ${dir}. Run scripts/seedRound.ts first.`);
  }
  return join(dir, candidates[0].f);
}

function loadDeployment(): { address: string } {
  const file = join(deploymentsDir(), `${network.name}.json`);
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

  const roundFile = resolveRoundFile();
  const round = JSON.parse(readFileSync(roundFile, "utf8"));
  const roundId: number = round.roundId;
  const identities: { suspectId: number; isHuman: boolean; salt: string }[] =
    round.identities;

  const { address } = loadDeployment();
  console.log(`Network: ${network.name}`);
  console.log(`Arena:   ${address}`);
  console.log(`Round:   ${roundId} (${roundFile})`);

  const arena = await ethers.getContractAt("Arena", address, signer);

  // Lock the round first if it is still Open.
  let view = await arena.getRound(roundId);
  if (Number(view.state) === State.Open) {
    console.log("Round is Open -> locking.");
    await (await arena.lockRound(roundId)).wait();
    view = await arena.getRound(roundId);
  }

  if (Number(view.state) === State.Locked) {
    const suspectIds = identities.map((s) => s.suspectId);
    const isHuman = identities.map((s) => s.isHuman);
    const salts = identities.map((s) => s.salt);
    console.log(`Revealing ${suspectIds.length} suspects.`);
    await (await arena.reveal(roundId, suspectIds, isHuman, salts)).wait();
    view = await arena.getRound(roundId);
  }

  if (Number(view.state) === State.Revealed) {
    console.log("Settling round.");
    await (await arena.settle(roundId)).wait();
    view = await arena.getRound(roundId);
  }

  console.log(`\nRound ${roundId} state is now ${Number(view.state)} (3 = Settled).`);
  console.log("Players can now call claim(roundId).");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
