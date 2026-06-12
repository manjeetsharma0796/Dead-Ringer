// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Arena
 * @author Dead Ringer
 * @notice On-chain coordinator for "Dead Ringer", a spot-the-bot trading game on
 *         Mantle Sepolia (chainId 5003, native currency MNT).
 *
 * @dev Game loop (one `Round`):
 *      1. The operator opens a round for a fixed number of suspects (`openRound`).
 *      2. The operator registers each suspect's *identity commitment* — a hash that
 *         hides whether the suspect is human or a bot until the reveal phase
 *         (`registerSuspects`).
 *      3. While the round is `Open`, players submit a "slip": for one or more
 *         suspects they guess HUMAN or BOT with a confidence, and escrow MNT as
 *         their stake (`placeVerdicts`).
 *      4. The operator locks the round so no further bets are accepted
 *         (`lockRound`).
 *      5. The operator reveals each suspect's true identity by supplying the
 *         pre-image of the commitment; the contract verifies the hash matches
 *         (`reveal`).
 *      6. Once the economic model is finalized (DR-104), `settle` scores the
 *         round and `claim` lets winners withdraw. Both are STUBS today — see the
 *         NatSpec on each — and revert so no funds can be paid out under an
 *         unspecified formula.
 *
 *      Identity commitment scheme:
 *          identityCommit = keccak256(abi.encode(bool isHuman, bytes32 salt))
 *      The 32-byte `salt` blinds the single boolean so the commitment cannot be
 *      brute-forced by an observer (there are only two possible `isHuman` values).
 */
contract Arena is Ownable, ReentrancyGuard {
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    /**
     * @notice Lifecycle of a round.
     * @dev Transitions are strictly forward-only and operator-gated:
     *      Open -> Locked -> Revealed -> Settled.
     */
    enum State {
        Open, // accepting suspect registration and player verdicts
        Locked, // betting closed; awaiting reveal
        Revealed, // all suspect identities revealed; awaiting settlement (DR-104)
        Settled // payouts scored (DR-104) — terminal
    }

    /**
     * @notice A single suspect within a round.
     * @param commit   Identity commitment supplied at registration. Zero until set.
     * @param revealed Whether the operator has opened this commitment.
     * @param isHuman  Revealed truth; only meaningful once `revealed` is true.
     */
    struct Suspect {
        bytes32 commit;
        bool revealed;
        bool isHuman;
    }

    /**
     * @notice One player's full set of guesses for one round.
     * @dev Arrays are parallel: index `i` describes a guess on `suspectIds[i]`.
     *      `totalStake` is the sum of MNT escrowed across all of this player's
     *      `placeVerdicts` calls for the round.
     * @param suspectIds   Suspect indices this player bet on.
     * @param isHumanGuess Per-suspect guess: true = HUMAN, false = BOT.
     * @param confidences  Per-suspect confidence in basis points (0..10000).
     * @param totalStake   Total MNT (wei) this player has escrowed for the round.
     * @param exists       True once the player has placed at least one verdict.
     */
    struct Slip {
        uint256[] suspectIds;
        bool[] isHumanGuess;
        uint256[] confidences;
        uint256 totalStake;
        bool exists;
    }

    /**
     * @notice Aggregate, gas-cheap view of a round's header.
     * @param state         Current lifecycle state.
     * @param suspectCount  Number of suspects in the round.
     * @param revealedCount Number of suspects revealed so far.
     * @param totalPot      Total MNT (wei) escrowed by all players for the round.
     */
    struct RoundView {
        State state;
        uint256 suspectCount;
        uint256 revealedCount;
        uint256 totalPot;
    }

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// @notice Maximum confidence value, in basis points (100.00%).
    uint256 public constant MAX_CONFIDENCE_BPS = 10_000;

    /// @notice Monotonic counter; also the id of the most recently opened round.
    /// @dev Round ids start at 1; id 0 is reserved as "no round".
    uint256 public roundCount;

    /// @dev roundId => lifecycle state.
    mapping(uint256 => State) private _state;

    /// @dev roundId => number of suspects declared at `openRound`.
    mapping(uint256 => uint256) private _suspectCount;

    /// @dev roundId => number of suspects revealed so far.
    mapping(uint256 => uint256) private _revealedCount;

    /// @dev roundId => total MNT (wei) escrowed by all players.
    mapping(uint256 => uint256) private _totalPot;

    /// @dev roundId => suspectId => suspect record.
    mapping(uint256 => mapping(uint256 => Suspect)) private _suspects;

    /// @dev roundId => player => slip.
    mapping(uint256 => mapping(address => Slip)) private _slips;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    /// @notice Emitted when the operator opens a new round.
    event RoundOpened(uint256 indexed roundId, uint256 suspectCount);

    /// @notice Emitted when the operator registers suspect commitments.
    event SuspectsRegistered(uint256 indexed roundId, uint256 count);

    /// @notice Emitted when a player escrows stake and records guesses.
    /// @param player    The bettor.
    /// @param roundId   Round bet on.
    /// @param count     Number of suspects this call covered.
    /// @param stake     MNT (wei) escrowed by this call.
    event VerdictsPlaced(address indexed player, uint256 indexed roundId, uint256 count, uint256 stake);

    /// @notice Emitted when betting is closed for a round.
    event RoundLocked(uint256 indexed roundId);

    /// @notice Emitted once per suspect when its identity is revealed.
    event SuspectRevealed(uint256 indexed roundId, uint256 indexed suspectId, bool isHuman);

    /// @notice Emitted when every suspect in a round has been revealed.
    event RoundRevealed(uint256 indexed roundId);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error InvalidSuspectCount();
    error UnknownRound(uint256 roundId);
    error WrongState(uint256 roundId, State expected, State actual);
    error LengthMismatch();
    error EmptyInput();
    error SuspectOutOfRange(uint256 roundId, uint256 suspectId);
    error CommitAlreadySet(uint256 roundId, uint256 suspectId);
    error CommitMissing(uint256 roundId, uint256 suspectId);
    error AlreadyRevealed(uint256 roundId, uint256 suspectId);
    error CommitMismatch(uint256 roundId, uint256 suspectId);
    error ConfidenceTooHigh(uint256 confidence);
    error NoStake();

    // ---------------------------------------------------------------------
    // Construction
    // ---------------------------------------------------------------------

    /**
     * @notice Deploys the Arena.
     * @param operator The address that may drive the round lifecycle (owner).
     *                 Passing `address(0)` reverts via OpenZeppelin `Ownable`.
     */
    constructor(address operator) Ownable(operator) {}

    // ---------------------------------------------------------------------
    // Operator: lifecycle
    // ---------------------------------------------------------------------

    /**
     * @notice Opens a new round expecting `suspectCount` suspects.
     * @dev Operator only. New round is `Open`. Suspect commitments are added
     *      separately via {registerSuspects}.
     * @param suspectCount Number of suspects that will trade in this round; must be > 0.
     * @return roundId The id assigned to the new round (starts at 1).
     */
    function openRound(uint256 suspectCount) external onlyOwner returns (uint256 roundId) {
        if (suspectCount == 0) revert InvalidSuspectCount();

        roundId = ++roundCount;
        _state[roundId] = State.Open;
        _suspectCount[roundId] = suspectCount;

        emit RoundOpened(roundId, suspectCount);
    }

    /**
     * @notice Stores identity commitments for the round's suspects.
     * @dev Operator only; round must be `Open`. The supplied array maps 1:1 onto
     *      suspect ids `0..suspectCount-1`, so its length must equal the round's
     *      declared `suspectCount`. Each commitment may only be set once.
     *
     *      Each `commits[i]` MUST equal
     *          keccak256(abi.encode(bool isHuman, bytes32 salt))
     *      for the suspect's true identity and a freshly-random salt. The salt is
     *      revealed later in {reveal}; keep it secret until then.
     * @param roundId Target round.
     * @param commits Identity commitments, one per suspect, indexed by suspect id.
     */
    function registerSuspects(uint256 roundId, bytes32[] calldata commits) external onlyOwner {
        _requireState(roundId, State.Open);

        uint256 expected = _suspectCount[roundId];
        if (commits.length != expected) revert LengthMismatch();

        for (uint256 i = 0; i < commits.length; ++i) {
            if (_suspects[roundId][i].commit != bytes32(0)) revert CommitAlreadySet(roundId, i);
            _suspects[roundId][i].commit = commits[i];
        }

        emit SuspectsRegistered(roundId, commits.length);
    }

    /**
     * @notice Closes betting for a round.
     * @dev Operator only; `Open` -> `Locked`. After this no further verdicts are
     *      accepted, freezing the pot ahead of reveal.
     * @param roundId Target round.
     */
    function lockRound(uint256 roundId) external onlyOwner {
        _requireState(roundId, State.Open);
        _state[roundId] = State.Locked;
        emit RoundLocked(roundId);
    }

    /**
     * @notice Reveals the true identity of one or more suspects.
     * @dev Operator only; round must be `Locked`. For each entry the contract
     *      recomputes keccak256(abi.encode(isHuman[i], salt[i])) and requires it
     *      to equal the stored commitment, proving the operator is not changing
     *      the answer after bets were placed. Re-revealing a suspect reverts.
     *      When the final suspect is revealed the round advances to `Revealed`
     *      and {RoundRevealed} is emitted.
     *
     *      The three arrays are parallel and may cover a subset of suspects, so
     *      reveals can be batched across multiple transactions.
     * @param roundId    Target round.
     * @param suspectIds Suspect ids being revealed.
     * @param isHuman    Claimed identity per suspect (true = human, false = bot).
     * @param salt       Per-suspect blinding salt used when committing.
     */
    function reveal(
        uint256 roundId,
        uint256[] calldata suspectIds,
        bool[] calldata isHuman,
        bytes32[] calldata salt
    ) external onlyOwner {
        _requireState(roundId, State.Locked);

        uint256 n = suspectIds.length;
        if (n == 0) revert EmptyInput();
        if (isHuman.length != n || salt.length != n) revert LengthMismatch();

        uint256 count = _suspectCount[roundId];
        uint256 newlyRevealed;

        for (uint256 i = 0; i < n; ++i) {
            uint256 id = suspectIds[i];
            if (id >= count) revert SuspectOutOfRange(roundId, id);

            Suspect storage s = _suspects[roundId][id];
            if (s.commit == bytes32(0)) revert CommitMissing(roundId, id);
            if (s.revealed) revert AlreadyRevealed(roundId, id);

            bytes32 recomputed = keccak256(abi.encode(isHuman[i], salt[i]));
            if (recomputed != s.commit) revert CommitMismatch(roundId, id);

            s.revealed = true;
            s.isHuman = isHuman[i];
            unchecked {
                ++newlyRevealed;
            }

            emit SuspectRevealed(roundId, id, isHuman[i]);
        }

        uint256 revealedTotal = _revealedCount[roundId] + newlyRevealed;
        _revealedCount[roundId] = revealedTotal;

        if (revealedTotal == count) {
            _state[roundId] = State.Revealed;
            emit RoundRevealed(roundId);
        }
    }

    // ---------------------------------------------------------------------
    // Player: betting
    // ---------------------------------------------------------------------

    /**
     * @notice Records a player's guesses for a round and escrows their stake.
     * @dev Round must be `Open`. The three arrays are parallel and must be the
     *      same non-zero length; every id must be in `0..suspectCount-1`; every
     *      confidence must be <= {MAX_CONFIDENCE_BPS}. The attached `msg.value`
     *      (MNT) is escrowed and added to both the player's running `totalStake`
     *      and the round's total pot.
     *
     *      Calling more than once for the same round APPENDS to the existing slip
     *      and accumulates stake; it does not overwrite earlier guesses. Duplicate
     *      suspect ids are not de-duplicated — scoring (DR-104) defines how such
     *      entries are treated.
     * @param roundId      Target round.
     * @param suspectIds   Suspect ids being guessed.
     * @param isHumanGuess Guess per suspect: true = HUMAN, false = BOT.
     * @param confidences  Confidence per suspect, in basis points (0..10000).
     */
    function placeVerdicts(
        uint256 roundId,
        uint256[] calldata suspectIds,
        bool[] calldata isHumanGuess,
        uint256[] calldata confidences
    ) external payable nonReentrant {
        _requireState(roundId, State.Open);

        uint256 n = suspectIds.length;
        if (n == 0) revert EmptyInput();
        if (isHumanGuess.length != n || confidences.length != n) revert LengthMismatch();
        if (msg.value == 0) revert NoStake();

        uint256 count = _suspectCount[roundId];
        for (uint256 i = 0; i < n; ++i) {
            if (suspectIds[i] >= count) revert SuspectOutOfRange(roundId, suspectIds[i]);
            if (confidences[i] > MAX_CONFIDENCE_BPS) revert ConfidenceTooHigh(confidences[i]);
        }

        Slip storage slip = _slips[roundId][msg.sender];
        for (uint256 i = 0; i < n; ++i) {
            slip.suspectIds.push(suspectIds[i]);
            slip.isHumanGuess.push(isHumanGuess[i]);
            slip.confidences.push(confidences[i]);
        }
        slip.totalStake += msg.value;
        slip.exists = true;

        _totalPot[roundId] += msg.value;

        emit VerdictsPlaced(msg.sender, roundId, n, msg.value);
    }

    // ---------------------------------------------------------------------
    // Settlement — STUBS (DR-104)
    // ---------------------------------------------------------------------

    /**
     * @notice Scores a revealed round and prepares payouts.
     *
     * @dev !!! STUB — NOT YET IMPLEMENTED (DR-104) !!!
     *
     *      The economic model for Dead Ringer is not finalized. It is undecided
     *      whether payouts are parimutuel (winners split the losers' pot pro-rata
     *      to stake and confidence) or house-banked (fixed odds against a bankroll),
     *      and the exact scoring formula — how confidence in basis points maps to
     *      reward, how ties/duplicates resolve, and what fee (if any) the house
     *      takes — has not been specified.
     *
     *      To avoid distributing escrowed MNT under an unspecified rule, this
     *      function intentionally reverts. The signature is frozen so the ABI is
     *      forward-compatible: implementing DR-104 will fill in this body without
     *      changing how off-chain code calls it.
     *
     *      Intended (future) preconditions: round in `Revealed`, operator-gated,
     *      transition to `Settled`.
     *
     * @param roundId The round to settle. Currently unused.
     */
    function settle(uint256 roundId) external nonReentrant {
        roundId; // silence unused-parameter warning while stubbed
        revert("DR-104: payout model not specified");
    }

    /**
     * @notice Withdraws a player's winnings (and/or stake) for a settled round.
     *
     * @dev !!! STUB — NOT YET IMPLEMENTED (DR-104) !!!
     *
     *      Depends entirely on the payout model chosen in {settle}, which is still
     *      open (parimutuel vs house-banked, fee policy, refund-on-void rules).
     *      Until that is specified this function reverts so no escrowed MNT can
     *      leave the contract. The signature is frozen for ABI forward-compat:
     *      implementing DR-104 will fill in this body — pull-payment, `nonReentrant`,
     *      one claim per player per round — without changing the call shape.
     *
     * @param roundId The round to claim from. Currently unused.
     */
    function claim(uint256 roundId) external nonReentrant {
        roundId; // silence unused-parameter warning while stubbed
        revert("DR-104: payout model not specified");
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /**
     * @notice Returns a round's header in one call.
     * @param roundId Target round (must exist).
     * @return view_ Packed {RoundView} (state, suspect count, revealed count, pot).
     */
    function getRound(uint256 roundId) external view returns (RoundView memory view_) {
        _requireRound(roundId);
        view_ = RoundView({
            state: _state[roundId],
            suspectCount: _suspectCount[roundId],
            revealedCount: _revealedCount[roundId],
            totalPot: _totalPot[roundId]
        });
    }

    /**
     * @notice Returns a player's slip for a round.
     * @dev If the player never bet, all arrays are empty and `totalStake`/`exists`
     *      are zero/false. Arrays are parallel by index.
     * @param player  The bettor to look up.
     * @param roundId Target round.
     * @return suspectIds   Suspect ids the player guessed.
     * @return isHumanGuess Per-suspect guess (true = human).
     * @return confidences  Per-suspect confidence (basis points).
     * @return totalStake   Total MNT (wei) escrowed by the player.
     * @return exists       Whether the player placed any verdict.
     */
    function getSlip(address player, uint256 roundId)
        external
        view
        returns (
            uint256[] memory suspectIds,
            bool[] memory isHumanGuess,
            uint256[] memory confidences,
            uint256 totalStake,
            bool exists
        )
    {
        Slip storage slip = _slips[roundId][player];
        return (slip.suspectIds, slip.isHumanGuess, slip.confidences, slip.totalStake, slip.exists);
    }

    /**
     * @notice Reveal status and (if revealed) truth for a single suspect.
     * @param roundId   Target round.
     * @param suspectId Suspect id (must be in range).
     * @return revealed Whether the suspect has been revealed.
     * @return isHuman  Revealed identity; only meaningful when `revealed` is true.
     */
    function suspectRevealed(uint256 roundId, uint256 suspectId)
        external
        view
        returns (bool revealed, bool isHuman)
    {
        _requireRound(roundId);
        if (suspectId >= _suspectCount[roundId]) revert SuspectOutOfRange(roundId, suspectId);
        Suspect storage s = _suspects[roundId][suspectId];
        return (s.revealed, s.isHuman);
    }

    /**
     * @notice Returns the stored identity commitment for a suspect.
     * @dev Convenience accessor for off-chain verification before reveal.
     * @param roundId   Target round.
     * @param suspectId Suspect id (must be in range).
     * @return commit The stored commitment (zero if not yet registered).
     */
    function suspectCommit(uint256 roundId, uint256 suspectId) external view returns (bytes32 commit) {
        _requireRound(roundId);
        if (suspectId >= _suspectCount[roundId]) revert SuspectOutOfRange(roundId, suspectId);
        return _suspects[roundId][suspectId].commit;
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /// @dev Reverts {UnknownRound} unless `roundId` has been opened.
    function _requireRound(uint256 roundId) private view {
        if (roundId == 0 || roundId > roundCount) revert UnknownRound(roundId);
    }

    /// @dev Reverts unless the round exists and is currently in `expected` state.
    function _requireState(uint256 roundId, State expected) private view {
        _requireRound(roundId);
        State actual = _state[roundId];
        if (actual != expected) revert WrongState(roundId, expected, actual);
    }
}
