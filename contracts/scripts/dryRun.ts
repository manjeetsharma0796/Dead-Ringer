import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const dep = JSON.parse(fs.readFileSync("deployments/localhost.json", "utf8"));
  const round = JSON.parse(fs.readFileSync("deployments/round-1.json", "utf8"));
  const rid = round.roundId;
  const [operator, alice, bob] = await ethers.getSigners();
  const arena = await ethers.getContractAt("Arena", dep.address);

  const bots = [0, 1, 2, 3]; // ground truth: bots
  const stake = ethers.parseEther("1");

  // Alice (sharp): guesses BOT on the 4 bots → all correct.
  await (await arena.connect(alice).placeVerdicts(rid, bots, [false,false,false,false], [9000,9000,9000,9000], { value: stake })).wait();
  // Bob (fooled): guesses HUMAN on the 4 bots → all wrong.
  await (await arena.connect(bob).placeVerdicts(rid, bots, [true,true,true,true], [9000,9000,9000,9000], { value: stake })).wait();
  console.log("Bets placed. Pot:", ethers.formatEther((await arena.getRound(rid)).totalPot), "MNT");

  // Operator: lock, reveal all 8, settle.
  await (await arena.lockRound(rid)).wait();
  const ids = round.identities.map((x: any) => x.suspectId);
  const human = round.identities.map((x: any) => x.isHuman);
  const salts = round.identities.map((x: any) => x.salt);
  await (await arena.reveal(rid, ids, human, salts)).wait();
  await (await arena.settle(rid)).wait();
  console.log("Round settled.");

  const aPrev = await arena.previewPayout(alice.address, rid);
  const bPrev = await arena.previewPayout(bob.address, rid);
  console.log("previewPayout  alice:", ethers.formatEther(aPrev), " bob:", ethers.formatEther(bPrev));

  const aBefore = await ethers.provider.getBalance(alice.address);
  const rc = await (await arena.connect(alice).claim(rid)).wait();
  const gas = rc!.gasUsed * rc!.gasPrice;
  const aAfter = await ethers.provider.getBalance(alice.address);
  console.log("Alice net from claim:", ethers.formatEther(aAfter - aBefore + gas), "MNT (expected ~1.92 = 96% of 2)");

  let bobReverted = false;
  try { await (await arena.connect(bob).claim(rid)).wait(); } catch { bobReverted = true; }
  console.log("Bob claim reverted (fooled, nothing owed):", bobReverted);

  const ownerCut = await arena.previewPayout(operator.address, rid); // not a player; sanity
  console.log("House edge (4% of 2 MNT) accrued to operator on settle. crowdSentiment(s0):",
    (Number(await arena.crowdSentiment(rid, 0)) / 100).toFixed(1) + "% bot");
}
main().catch((e) => { console.error(e); process.exit(1); });
