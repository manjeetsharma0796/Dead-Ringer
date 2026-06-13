import { ethers, network } from "hardhat";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { exportArenaAbi } from "./exportAbi";

/**
 * Deploys the Arena contract to the active Hardhat network and records the
 * resulting address under contracts/deployments/<network>.json.
 *
 * The deployer (signer[0]) is set as the Arena operator/owner. Override by
 * setting the ARENA_OPERATOR env var to a different address.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network mantleSepolia
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error(
      "No signer available. Set PRIVATE_KEY in .env for the target network."
    );
  }

  const operator = process.env.ARENA_OPERATOR ?? deployer.address;

  console.log(`Network:  ${network.name} (chainId ${network.config.chainId ?? "?"})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Operator: ${operator}`);

  const Arena = await ethers.getContractFactory("Arena");
  const arena = await Arena.deploy(operator);
  await arena.waitForDeployment();

  const address = await arena.getAddress();
  const deployTx = arena.deploymentTransaction();

  console.log(`\nArena deployed to: ${address}`);
  if (deployTx) {
    console.log(`Deploy tx:         ${deployTx.hash}`);
  }

  // Persist the deployment record.
  const deploymentsDir = join(__dirname, "..", "deployments");
  if (!existsSync(deploymentsDir)) {
    mkdirSync(deploymentsDir, { recursive: true });
  }

  const record = {
    network: network.name,
    chainId: Number(network.config.chainId ?? 0),
    address,
    operator,
    deployer: deployer.address,
    txHash: deployTx?.hash ?? null,
    timestamp: new Date().toISOString(),
  };

  const outFile = join(deploymentsDir, `${network.name}.json`);
  writeFileSync(outFile, JSON.stringify(record, null, 2) + "\n");
  console.log(`\nWrote deployment record to: ${outFile}`);

  // Also publish the ABI to the frontend so web and contracts stay in sync.
  const abiFile = exportArenaAbi();
  console.log(`Wrote Arena ABI to:         ${abiFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
