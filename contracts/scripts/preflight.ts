import { ethers, network } from "hardhat";

/**
 * Deploy preflight (DR-106). Confirms a signer is configured for the target
 * network and reports its address + native MNT balance. NEVER prints the key.
 * Exits non-zero (with guidance) if there is no signer or a zero balance, so we
 * never fire a deploy that will fail.
 *
 * Usage:
 *   npx hardhat run scripts/preflight.ts --network mantleSepolia
 */
async function main() {
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    console.error(
      `No signer for "${network.name}". Set DEPLOYER_PRIVATE_KEY (0x + 64 hex) ` +
        `in contracts/.env.local.`
    );
    process.exit(1);
  }

  const deployer = signers[0];
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`Network:  ${network.name} (chainId ${network.config.chainId ?? "?"})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} MNT`);

  if (balance === 0n) {
    console.error(
      `\nBalance is 0 — fund ${deployer.address} with Mantle Sepolia MNT ` +
        `from the faucet, then re-run.`
    );
    process.exit(2);
  }

  console.log(`\nReady to deploy.`);
}

main().catch((e) => {
  // ethers redacts private keys in its errors; print only a short message.
  console.error("Preflight failed:", e?.shortMessage ?? e?.message ?? "unknown error");
  process.exit(1);
});
