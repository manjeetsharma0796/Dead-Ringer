import { expect } from "chai";
import { ethers } from "hardhat";
import { Arena } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Computes an identity commitment exactly as the contract does on reveal:
 *   keccak256(abi.encode(bool isHuman, bytes32 salt))
 */
function commitOf(isHuman: boolean, salt: string): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["bool", "bytes32"], [isHuman, salt])
  );
}

// Enum State { Open, Locked, Revealed, Settled }
const State = { Open: 0n, Locked: 1n, Revealed: 2n, Settled: 3n } as const;

describe("Arena", () => {
  let arena: Arena;
  let operator: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  // Ground-truth identities for a 3-suspect round and their blinding salts.
  const truth = [true, false, true]; // human, bot, human
  const salts = [
    ethers.id("salt-suspect-0"),
    ethers.id("salt-suspect-1"),
    ethers.id("salt-suspect-2"),
  ];
  const commits = truth.map((h, i) => commitOf(h, salts[i]));

  beforeEach(async () => {
    [operator, alice, bob] = await ethers.getSigners();
    const Arena = await ethers.getContractFactory("Arena");
    arena = (await Arena.deploy(operator.address)) as unknown as Arena;
    await arena.waitForDeployment();
  });

  describe("happy path", () => {
    it("runs open -> register -> bet -> lock -> reveal end to end", async () => {
      // --- openRound -----------------------------------------------------
      await expect(arena.openRound(3))
        .to.emit(arena, "RoundOpened")
        .withArgs(1, 3);
      expect(await arena.roundCount()).to.equal(1n);

      let round = await arena.getRound(1);
      expect(round.state).to.equal(State.Open);
      expect(round.suspectCount).to.equal(3n);
      expect(round.revealedCount).to.equal(0n);
      expect(round.totalPot).to.equal(0n);

      // --- registerSuspects ---------------------------------------------
      await expect(arena.registerSuspects(1, commits))
        .to.emit(arena, "SuspectsRegistered")
        .withArgs(1, 3);
      expect(await arena.suspectCommit(1, 0)).to.equal(commits[0]);
      expect(await arena.suspectCommit(1, 2)).to.equal(commits[2]);

      // --- placeVerdicts (Alice) ----------------------------------------
      const aliceStake = ethers.parseEther("1.5");
      await expect(
        arena
          .connect(alice)
          .placeVerdicts(1, [0, 1, 2], [true, false, true], [9000, 8000, 5000], {
            value: aliceStake,
          })
      )
        .to.emit(arena, "VerdictsPlaced")
        .withArgs(alice.address, 1, 3, aliceStake);

      // --- placeVerdicts (Bob, partial + second call accumulates) -------
      const bobStake1 = ethers.parseEther("0.5");
      await arena
        .connect(bob)
        .placeVerdicts(1, [0], [false], [3000], { value: bobStake1 });
      const bobStake2 = ethers.parseEther("0.25");
      await arena
        .connect(bob)
        .placeVerdicts(1, [2], [true], [10000], { value: bobStake2 });

      // Slip assertions.
      const aliceSlip = await arena.getSlip(alice.address, 1);
      expect(aliceSlip.suspectIds).to.deep.equal([0n, 1n, 2n]);
      expect(aliceSlip.isHumanGuess).to.deep.equal([true, false, true]);
      expect(aliceSlip.confidences).to.deep.equal([9000n, 8000n, 5000n]);
      expect(aliceSlip.totalStake).to.equal(aliceStake);
      expect(aliceSlip.exists).to.equal(true);

      const bobSlip = await arena.getSlip(bob.address, 1);
      expect(bobSlip.suspectIds).to.deep.equal([0n, 2n]);
      expect(bobSlip.totalStake).to.equal(bobStake1 + bobStake2);

      // Pot + escrowed balance.
      const expectedPot = aliceStake + bobStake1 + bobStake2;
      round = await arena.getRound(1);
      expect(round.totalPot).to.equal(expectedPot);
      expect(await ethers.provider.getBalance(await arena.getAddress())).to.equal(
        expectedPot
      );

      // --- lockRound -----------------------------------------------------
      await expect(arena.lockRound(1)).to.emit(arena, "RoundLocked").withArgs(1);
      round = await arena.getRound(1);
      expect(round.state).to.equal(State.Locked);

      // --- reveal (batched: first two, then the last) -------------------
      await expect(arena.reveal(1, [0, 1], [true, false], [salts[0], salts[1]]))
        .to.emit(arena, "SuspectRevealed")
        .withArgs(1, 0, true)
        .and.to.emit(arena, "SuspectRevealed")
        .withArgs(1, 1, false);

      // Not all revealed yet -> still Locked.
      round = await arena.getRound(1);
      expect(round.state).to.equal(State.Locked);
      expect(round.revealedCount).to.equal(2n);

      await expect(arena.reveal(1, [2], [true], [salts[2]]))
        .to.emit(arena, "SuspectRevealed")
        .withArgs(1, 2, true)
        .and.to.emit(arena, "RoundRevealed")
        .withArgs(1);

      // Now Revealed, with stored truth readable.
      round = await arena.getRound(1);
      expect(round.state).to.equal(State.Revealed);
      expect(round.revealedCount).to.equal(3n);

      for (let i = 0; i < 3; i++) {
        const [revealed, isHuman] = await arena.suspectRevealed(1, i);
        expect(revealed).to.equal(true);
        expect(isHuman).to.equal(truth[i]);
      }
    });
  });

  describe("reveal verification", () => {
    it("reverts when revealing with a wrong salt", async () => {
      await arena.openRound(3);
      await arena.registerSuspects(1, commits);
      await arena.lockRound(1);

      const wrongSalt = ethers.id("not-the-real-salt");
      await expect(
        arena.reveal(1, [0], [true], [wrongSalt])
      ).to.be.revertedWithCustomError(arena, "CommitMismatch");
    });

    it("reverts when revealing with a flipped identity bit", async () => {
      await arena.openRound(3);
      await arena.registerSuspects(1, commits);
      await arena.lockRound(1);

      // suspect 0 is truly human; claiming bot with the real salt must fail.
      await expect(
        arena.reveal(1, [0], [false], [salts[0]])
      ).to.be.revertedWithCustomError(arena, "CommitMismatch");
    });
  });

  describe("settlement: parimutuel with 4% house edge (DR-104)", () => {
    // Helper: open a 3-suspect round (truth = [human, bot, human]) and register.
    async function openAndRegister() {
      await arena.openRound(3);
      await arena.registerSuspects(1, commits);
    }

    // Helper: lock + reveal all three suspects so the round is `Revealed`.
    async function lockAndReveal() {
      await arena.lockRound(1);
      await arena.reveal(1, [0, 1, 2], truth, salts);
    }

    it("scores a happy path: payouts ~= distributable and the better detective earns more", async () => {
      await openAndRegister();

      // Alice: all three correct (human, bot, human), high confidence. Stake 1.0.
      const aliceStake = ethers.parseEther("1.0");
      await arena
        .connect(alice)
        .placeVerdicts(1, [0, 1, 2], [true, false, true], [10000, 10000, 10000], {
          value: aliceStake,
        });

      // Bob: only suspect 0 correct, suspect 1 wrong (guesses human, truth bot).
      // Stake 1.0 as well so the difference is purely accuracy.
      const bobStake = ethers.parseEther("1.0");
      await arena
        .connect(bob)
        .placeVerdicts(1, [0, 1], [true, true], [10000, 10000], { value: bobStake });

      await lockAndReveal();

      const totalPot = aliceStake + bobStake; // 2.0
      const distributable = (totalPot * 9600n) / 10000n;
      const houseCut = totalPot - distributable;

      const ownerBefore = await ethers.provider.getBalance(operator.address);

      await expect(arena.settle(1))
        .to.emit(arena, "RoundSettled");

      // House edge accrued to the owner. settle() is operator-initiated so the
      // owner also paid gas; compare via balance delta minus gas.
      const round = await arena.getRound(1);
      expect(round.state).to.equal(State.Settled);

      // Weights: Alice 1.0*30000/30000 = 1.0e18; Bob 1.0*10000/20000 = 0.5e18.
      // Alice should preview 2/3 of distributable, Bob 1/3.
      const alicePreview = await arena.previewPayout(alice.address, 1);
      const bobPreview = await arena.previewPayout(bob.address, 1);
      expect(alicePreview).to.be.gt(bobPreview);
      expect(alicePreview + bobPreview).to.equal(distributable); // exact, no dust here

      // Claims pay out the previewed amounts.
      const aBalBefore = await ethers.provider.getBalance(alice.address);
      const aTx = await arena.connect(alice).claim(1);
      const aRcpt = await aTx.wait();
      const aGas = aRcpt!.gasUsed * aRcpt!.gasPrice;
      const aBalAfter = await ethers.provider.getBalance(alice.address);
      expect(aBalAfter - aBalBefore + aGas).to.equal(alicePreview);

      await expect(arena.connect(bob).claim(1))
        .to.emit(arena, "Claimed")
        .withArgs(bob.address, 1, bobPreview);

      // House cut sanity: positive and equals pot - distributable.
      expect(houseCut).to.equal(totalPot - distributable);
      void ownerBefore;
    });

    it("house edge accrues to the owner at settle", async () => {
      await openAndRegister();

      // Use a non-owner bettor so the owner's balance change at settle isolates
      // the house cut (minus gas). Stake from alice + bob.
      const stake = ethers.parseEther("5.0");
      await arena
        .connect(alice)
        .placeVerdicts(1, [0, 1, 2], truth, [10000, 10000, 10000], { value: stake });

      await lockAndReveal();

      const totalPot = stake;
      const distributable = (totalPot * 9600n) / 10000n;
      const houseCut = totalPot - distributable;

      const ownerBefore = await ethers.provider.getBalance(operator.address);
      const tx = await arena.settle(1);
      const rcpt = await tx.wait();
      const gas = rcpt!.gasUsed * rcpt!.gasPrice;
      const ownerAfter = await ethers.provider.getBalance(operator.address);

      expect(ownerAfter - ownerBefore + gas).to.equal(houseCut);
      expect(houseCut).to.equal((totalPot * 400n) / 10000n);
    });

    it("refunds every player their exact stake when nobody is correct", async () => {
      await openAndRegister();

      // Both players get suspect 1 wrong AND only bet on suspect 1 -> 0 correct.
      // truth[1] = false (bot); both guess human -> all wrong.
      const aliceStake = ethers.parseEther("1.0");
      const bobStake = ethers.parseEther("3.0");
      await arena
        .connect(alice)
        .placeVerdicts(1, [1], [true], [10000], { value: aliceStake });
      await arena
        .connect(bob)
        .placeVerdicts(1, [1], [true], [10000], { value: bobStake });

      await lockAndReveal();

      await expect(arena.settle(1))
        .to.emit(arena, "RoundSettled")
        .withArgs(1, 0, 0, 0, true);

      // Refund mode: each player can reclaim exactly their own stake.
      expect(await arena.previewPayout(alice.address, 1)).to.equal(aliceStake);
      expect(await arena.previewPayout(bob.address, 1)).to.equal(bobStake);

      const aBefore = await ethers.provider.getBalance(alice.address);
      const aTx = await arena.connect(alice).claim(1);
      const aRcpt = await aTx.wait();
      const aGas = aRcpt!.gasUsed * aRcpt!.gasPrice;
      const aAfter = await ethers.provider.getBalance(alice.address);
      expect(aAfter - aBefore + aGas).to.equal(aliceStake);

      await expect(arena.connect(bob).claim(1))
        .to.emit(arena, "Claimed")
        .withArgs(bob.address, 1, bobStake);

      // Contract fully drained: only the two stakes were in escrow, no house cut.
      expect(await ethers.provider.getBalance(await arena.getAddress())).to.equal(0n);
    });

    it("reverts on a double claim", async () => {
      await openAndRegister();
      await arena
        .connect(alice)
        .placeVerdicts(1, [0, 1, 2], truth, [10000, 10000, 10000], {
          value: ethers.parseEther("1.0"),
        });
      await lockAndReveal();
      await arena.settle(1);

      await arena.connect(alice).claim(1);
      await expect(arena.connect(alice).claim(1)).to.be.revertedWithCustomError(
        arena,
        "AlreadyClaimed"
      );
    });

    it("reverts claim with NothingToClaim when a player scored zero", async () => {
      await openAndRegister();

      // Alice scores; Charlie-like loser: reuse bob with all-wrong guesses.
      await arena
        .connect(alice)
        .placeVerdicts(1, [0, 1, 2], truth, [10000, 10000, 10000], {
          value: ethers.parseEther("1.0"),
        });
      // Bob: bets only on suspect 1 (truth bot) but guesses human -> 0 correct.
      await arena
        .connect(bob)
        .placeVerdicts(1, [1], [true], [10000], { value: ethers.parseEther("1.0") });

      await lockAndReveal();
      await arena.settle(1);

      expect(await arena.previewPayout(bob.address, 1)).to.equal(0n);
      await expect(arena.connect(bob).claim(1)).to.be.revertedWithCustomError(
        arena,
        "NothingToClaim"
      );
    });

    it("reverts claim before the round is settled", async () => {
      await openAndRegister();
      await arena
        .connect(alice)
        .placeVerdicts(1, [0], [true], [10000], { value: ethers.parseEther("1.0") });
      await arena.lockRound(1);
      await expect(arena.connect(alice).claim(1)).to.be.revertedWithCustomError(
        arena,
        "WrongState"
      );
    });

    it("reverts settle before the round is revealed", async () => {
      await openAndRegister();
      await arena
        .connect(alice)
        .placeVerdicts(1, [0], [true], [10000], { value: ethers.parseEther("1.0") });
      await arena.lockRound(1); // Locked, not Revealed
      await expect(arena.settle(1)).to.be.revertedWithCustomError(
        arena,
        "WrongState"
      );
    });

    it("only the operator can settle", async () => {
      await openAndRegister();
      await arena
        .connect(alice)
        .placeVerdicts(1, [0], [true], [10000], { value: ethers.parseEther("1.0") });
      await lockAndReveal();
      await expect(arena.connect(alice).settle(1)).to.be.revertedWithCustomError(
        arena,
        "OwnableUnauthorizedAccount"
      );
    });

    it("previewPayout returns 0 before settlement", async () => {
      await openAndRegister();
      await arena
        .connect(alice)
        .placeVerdicts(1, [0], [true], [10000], { value: ethers.parseEther("1.0") });
      expect(await arena.previewPayout(alice.address, 1)).to.equal(0n);
      expect(await arena.previewPayout(alice.address, 99)).to.equal(0n);
    });
  });

  describe("crowd sentiment (DR-107)", () => {
    it("computes botVote share in basis points and tracks the player list", async () => {
      await arena.openRound(3);
      await arena.registerSuspects(1, commits);

      // Suspect 0: alice guesses human, bob guesses bot -> 1 bot of 2 = 5000 bps.
      await arena
        .connect(alice)
        .placeVerdicts(1, [0, 1], [true, false], [5000, 5000], {
          value: ethers.parseEther("1.0"),
        });
      await arena
        .connect(bob)
        .placeVerdicts(1, [0], [false], [5000], { value: ethers.parseEther("1.0") });

      // Suspect 0: votes human(alice)+bot(bob) -> 1/2 bot = 5000.
      expect(await arena.crowdSentiment(1, 0)).to.equal(5000n);
      // Suspect 1: only alice voted bot -> 1/1 = 10000.
      expect(await arena.crowdSentiment(1, 1)).to.equal(10000n);
      // Suspect 2: no votes -> 0.
      expect(await arena.crowdSentiment(1, 2)).to.equal(0n);

      // Player list deduplicated and ordered by first bet.
      expect(await arena.getPlayers(1)).to.deep.equal([
        alice.address,
        bob.address,
      ]);
    });

    it("reverts crowdSentiment for an out-of-range suspect", async () => {
      await arena.openRound(3);
      await arena.registerSuspects(1, commits);
      await expect(arena.crowdSentiment(1, 3)).to.be.revertedWithCustomError(
        arena,
        "SuspectOutOfRange"
      );
    });
  });

  describe("access control & validation", () => {
    it("only the operator can open a round", async () => {
      await expect(arena.connect(alice).openRound(2)).to.be.revertedWithCustomError(
        arena,
        "OwnableUnauthorizedAccount"
      );
    });

    it("rejects openRound with zero suspects", async () => {
      await expect(arena.openRound(0)).to.be.revertedWithCustomError(
        arena,
        "InvalidSuspectCount"
      );
    });

    it("rejects registerSuspects with a wrong-length array", async () => {
      await arena.openRound(3);
      await expect(
        arena.registerSuspects(1, [commits[0], commits[1]])
      ).to.be.revertedWithCustomError(arena, "LengthMismatch");
    });

    it("rejects placeVerdicts with mismatched array lengths", async () => {
      await arena.openRound(3);
      await arena.registerSuspects(1, commits);
      await expect(
        arena
          .connect(alice)
          .placeVerdicts(1, [0, 1], [true], [9000, 8000], {
            value: ethers.parseEther("1"),
          })
      ).to.be.revertedWithCustomError(arena, "LengthMismatch");
    });

    it("rejects placeVerdicts referencing an out-of-range suspect", async () => {
      await arena.openRound(3);
      await arena.registerSuspects(1, commits);
      await expect(
        arena
          .connect(alice)
          .placeVerdicts(1, [3], [true], [9000], { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(arena, "SuspectOutOfRange");
    });

    it("rejects placeVerdicts with confidence above 10000 bps", async () => {
      await arena.openRound(3);
      await arena.registerSuspects(1, commits);
      await expect(
        arena
          .connect(alice)
          .placeVerdicts(1, [0], [true], [10001], { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(arena, "ConfidenceTooHigh");
    });

    it("rejects placeVerdicts with no stake", async () => {
      await arena.openRound(3);
      await arena.registerSuspects(1, commits);
      await expect(
        arena.connect(alice).placeVerdicts(1, [0], [true], [9000], { value: 0 })
      ).to.be.revertedWithCustomError(arena, "NoStake");
    });

    it("rejects betting once the round is locked", async () => {
      await arena.openRound(3);
      await arena.registerSuspects(1, commits);
      await arena.lockRound(1);
      await expect(
        arena
          .connect(alice)
          .placeVerdicts(1, [0], [true], [9000], { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(arena, "WrongState");
    });

    it("rejects reveal before the round is locked", async () => {
      await arena.openRound(3);
      await arena.registerSuspects(1, commits);
      await expect(
        arena.reveal(1, [0], [true], [salts[0]])
      ).to.be.revertedWithCustomError(arena, "WrongState");
    });

    it("rejects re-revealing an already-revealed suspect", async () => {
      await arena.openRound(3);
      await arena.registerSuspects(1, commits);
      await arena.lockRound(1);
      await arena.reveal(1, [0], [true], [salts[0]]);
      await expect(
        arena.reveal(1, [0], [true], [salts[0]])
      ).to.be.revertedWithCustomError(arena, "AlreadyRevealed");
    });

    it("reverts views for an unknown round", async () => {
      await expect(arena.getRound(99)).to.be.revertedWithCustomError(
        arena,
        "UnknownRound"
      );
    });
  });
});
