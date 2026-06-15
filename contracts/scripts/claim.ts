import { ethers, network } from "hardhat";
import { readFileSync } from "fs";
import { join } from "path";
async function main() {
  const [signer] = await ethers.getSigners();
  const roundId = Number(process.env.ROUND_ID ?? "1");
  const { address } = JSON.parse(readFileSync(join(__dirname,"..","deployments",`${network.name}.json`),"utf8"));
  const arena = await ethers.getContractAt("Arena", address, signer);
  const preview = await arena.previewPayout(signer.address, roundId);
  console.log(`Claiming round ${roundId} for ${signer.address}: preview ${ethers.formatEther(preview)} MNT`);
  const before = await ethers.provider.getBalance(signer.address);
  const tx = await arena.claim(roundId);
  const rc = await tx.wait();
  const after = await ethers.provider.getBalance(signer.address);
  console.log(`Claimed (tx ${rc?.hash}). Balance delta (net of gas): ${ethers.formatEther(after-before)} MNT`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
