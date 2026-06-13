import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";

/**
 * Exports the compiled Arena ABI to the frontend so the web app and contracts
 * never drift. Reads artifacts/contracts/Arena.sol/Arena.json's `.abi` and
 * writes it to ../web/src/lib/arena.abi.json (creating dirs if needed).
 *
 * Usage:
 *   npx hardhat run scripts/exportAbi.ts
 *   npm run export:abi
 */
export function exportArenaAbi(): string {
  const artifactPath = join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "Arena.sol",
    "Arena.json"
  );

  if (!existsSync(artifactPath)) {
    throw new Error(
      `Arena artifact not found at ${artifactPath}. Run \`npx hardhat compile\` first.`
    );
  }

  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  const abi = artifact.abi;

  const outFile = join(__dirname, "..", "..", "web", "src", "lib", "arena.abi.json");
  const outDir = dirname(outFile);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  writeFileSync(outFile, JSON.stringify(abi, null, 2) + "\n");
  return outFile;
}

// Allow running directly via `hardhat run`.
if (require.main === module) {
  try {
    const out = exportArenaAbi();
    console.log(`Wrote Arena ABI to: ${out}`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
