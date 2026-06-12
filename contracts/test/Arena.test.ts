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

  describe("settle / claim stubs (DR-104)", () => {
    it("settle reverts with the stub message", async () => {
      await arena.openRound(1);
      await expect(arena.settle(1)).to.be.revertedWith(
        "DR-104: payout model not specified"
      );
    });

    it("claim reverts with the stub message", async () => {
      await arena.openRound(1);
      await expect(arena.connect(alice).claim(1)).to.be.revertedWith(
        "DR-104: payout model not specified"
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
