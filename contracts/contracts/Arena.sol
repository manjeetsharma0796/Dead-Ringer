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
 *      6. After reveal, `settle` scores the round and `claim` lets winners
 *         withdraw. Scoring is PARIMUTUEL with a 4% house edge (DR-104): each
 *         player's weight is their stake times the share of their confidence
 *         spent on CORRECT guesses, and the post-edge pot is split pro-rata by
 *         weight. If nobody is correct the round enters refund mode and every
 *         player reclaims their exact stake.
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

    // --- Settlement (DR-104): parimutuel with a 4% house edge ------------

    /// @notice House edge taken from the pot at settlement, in basis points (4%).
    uint256 public constant HOUSE_EDGE_BPS = 400;

    /// @dev roundId => ordered list of unique players who bet in the round.
    mapping(uint256 => address[]) private _players;

    /// @dev roundId => suspectId => number of BOT guesses (isHumanGuess == false).
    mapping(uint256 => mapping(uint256 => uint256)) private _botVotes;

    /// @dev roundId => suspectId => total guesses cast on that suspect.
    mapping(uint256 => mapping(uint256 => uint256)) private _totalVotes;

    /// @dev roundId => player => settlement weight (stake-weighted accuracy).
    mapping(uint256 => mapping(address => uint256)) private _weight;

    /// @dev roundId => sum of all players' weights (parimutuel denominator).
    mapping(uint256 => uint256) private _totalWeight;

    /// @dev roundId => MNT (wei) distributable to winners after the house edge.
    mapping(uint256 => uint256) private _distributable;

    /// @dev roundId => true when nobody scored, so claim() refunds stakes 1:1.
    mapping(uint256 => bool) private _refundMode;

    /// @dev roundId => player => whether they have already claimed.
    mapping(uint256 => mapping(address => bool)) private _claimed;

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

    /// @notice Emitted when the operator settles a round and scores payouts.
    /// @param roundId       The settled round.
    /// @param distributable MNT (wei) available to winners after the house edge.
    /// @param houseCut      MNT (wei) taken as the house edge (0 in refund mode).
    /// @param totalWeight   Sum of all players' winning weights (0 => refund mode).
    /// @param refundMode    True when nobody scored and stakes are refunded 1:1.
    event RoundSettled(
        uint256 indexed roundId,
        uint256 distributable,
        uint256 houseCut,
        uint256 totalWeight,
        bool refundMode
    );

    /// @notice Emitted when a player withdraws their winnings or refund.
    /// @param player  The claimant.
    /// @param roundId Round claimed from.
    /// @param amount  MNT (wei) paid out.
    event Claimed(address indexed player, uint256 indexed roundId, uint256 amount);

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
    error AlreadyClaimed(uint256 roundId, address player);
    error NothingToClaim(uint256 roundId, address player);
    error TransferFailed();

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
        // Register the player on their first bet for this round (one entry only).
        if (!slip.exists) {
            _players[roundId].push(msg.sender);
        }
        for (uint256 i = 0; i < n; ++i) {
            slip.suspectIds.push(suspectIds[i]);
            slip.isHumanGuess.push(isHumanGuess[i]);
            slip.confidences.push(confidences[i]);

            // Tally crowd sentiment: a BOT guess is isHumanGuess[i] == false.
            uint256 id = suspectIds[i];
            if (!isHumanGuess[i]) {
                _botVotes[roundId][id] += 1;
            }
            _totalVotes[roundId][id] += 1;
        }
        slip.totalStake += msg.value;
        slip.exists = true;

        _totalPot[roundId] += msg.value;

        emit VerdictsPlaced(msg.sender, roundId, n, msg.value);
    }

    // ---------------------------------------------------------------------
    // Settlement (DR-104): parimutuel with a 4% house edge
    // ---------------------------------------------------------------------

    /**
     * @notice Scores a revealed round and prepares parimutuel payouts.
     *
     * @dev Operator only; round must be `Revealed`, transitions to `Settled`.
     *
     *      Payout model — PARIMUTUEL with a {HOUSE_EDGE_BPS} (4%) house edge:
     *        - distributable = totalPot * (10000 - 400) / 10000; the remainder is
     *          the house cut.
     *        - Each player earns a `weight`:
     *              weight = totalStake * (sum of confidence on CORRECT guesses)
     *                                  / (sum of confidence on ALL guesses)
     *          A guess `i` is correct when isHumanGuess[i] == suspect.isHuman
     *          (the revealed truth). A player with zero total confidence gets
     *          weight 0 (divide-by-zero guard).
     *        - claim() pays distributable * weight[player] / totalWeight, so ties
     *          resolve automatically pro-rata with no special case.
     *
     *      Edge case — NOBODY CORRECT (totalWeight == 0): the round enters
     *      `refundMode`, the house takes nothing, and claim() refunds each player
     *      exactly their own `totalStake`.
     *
     * @param roundId The round to settle.
     */
    function settle(uint256 roundId) external onlyOwner nonReentrant {
        _requireState(roundId, State.Revealed);
        _state[roundId] = State.Settled;

        uint256 totalPot = _totalPot[roundId];
        uint256 distributable = (totalPot * (MAX_CONFIDENCE_BPS - HOUSE_EDGE_BPS)) / MAX_CONFIDENCE_BPS;
        uint256 houseCut = totalPot - distributable;

        address[] storage players = _players[roundId];
        uint256 totalWeight;

        for (uint256 p = 0; p < players.length; ++p) {
            address player = players[p];
            Slip storage slip = _slips[roundId][player];

            uint256 sumCorrect;
            uint256 sumAll;
            uint256 m = slip.suspectIds.length;
            for (uint256 i = 0; i < m; ++i) {
                uint256 c = slip.confidences[i];
                sumAll += c;
                if (slip.isHumanGuess[i] == _suspects[roundId][slip.suspectIds[i]].isHuman) {
                    sumCorrect += c;
                }
            }

            uint256 w = sumAll == 0 ? 0 : (slip.totalStake * sumCorrect) / sumAll;
            _weight[roundId][player] = w;
            totalWeight += w;
        }

        _totalWeight[roundId] = totalWeight;

        if (totalWeight == 0) {
            // Nobody scored: refund stakes 1:1, house takes nothing.
            _refundMode[roundId] = true;
            _distributable[roundId] = 0;
            emit RoundSettled(roundId, 0, 0, 0, true);
        } else {
            _distributable[roundId] = distributable;
            emit RoundSettled(roundId, distributable, houseCut, totalWeight, false);
            if (houseCut > 0) {
                (bool ok, ) = payable(owner()).call{value: houseCut}("");
                if (!ok) revert TransferFailed();
            }
        }
    }

    /**
     * @notice Withdraws a player's parimutuel winnings (or refund) for a round.
     *
     * @dev Round must be `Settled`. Pull-payment, `nonReentrant`, one claim per
     *      player per round.
     *        - In refund mode: payout = the player's own `totalStake`.
     *        - Otherwise: payout = distributable * weight[player] / totalWeight.
     *      Reverts {NothingToClaim} when the payout is zero, and
     *      {AlreadyClaimed} on a second claim.
     *
     * @param roundId The round to claim from.
     */
    function claim(uint256 roundId) external nonReentrant {
        _requireState(roundId, State.Settled);
        if (_claimed[roundId][msg.sender]) revert AlreadyClaimed(roundId, msg.sender);

        uint256 payout = _payoutOf(roundId, msg.sender);
        if (payout == 0) revert NothingToClaim(roundId, msg.sender);

        _claimed[roundId][msg.sender] = true;

        (bool ok, ) = payable(msg.sender).call{value: payout}("");
        if (!ok) revert TransferFailed();

        emit Claimed(msg.sender, roundId, payout);
    }

    /// @dev Computes the gross payout owed to `player` for a settled round
    ///      (ignores the already-claimed flag). 0 if not settled.
    function _payoutOf(uint256 roundId, address player) private view returns (uint256) {
        if (_state[roundId] != State.Settled) return 0;
        if (_refundMode[roundId]) {
            return _slips[roundId][player].totalStake;
        }
        uint256 totalWeight = _totalWeight[roundId];
        if (totalWeight == 0) return 0;
        return (_distributable[roundId] * _weight[roundId][player]) / totalWeight;
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

    /**
     * @notice Crowd sentiment for a suspect: the share of guesses that called it
     *         a BOT, in basis points (DR-107).
     * @dev Returns 0 when no guesses have been cast on the suspect.
     * @param roundId   Target round.
     * @param suspectId Suspect id (must be in range).
     * @return botVotePctBps botVotes * 10000 / totalVotes (0 if no votes).
     */
    function crowdSentiment(uint256 roundId, uint256 suspectId)
        external
        view
        returns (uint256 botVotePctBps)
    {
        _requireRound(roundId);
        if (suspectId >= _suspectCount[roundId]) revert SuspectOutOfRange(roundId, suspectId);
        uint256 total = _totalVotes[roundId][suspectId];
        if (total == 0) return 0;
        return (_botVotes[roundId][suspectId] * MAX_CONFIDENCE_BPS) / total;
    }

    /**
     * @notice What {claim} would currently pay `player` for a round.
     * @dev Safe to call in any state. Returns 0 if the round is not `Settled`,
     *      the player has already claimed, or they are owed nothing.
     * @param player  The bettor to look up.
     * @param roundId Target round.
     * @return payout MNT (wei) claimable now.
     */
    function previewPayout(address player, uint256 roundId) external view returns (uint256) {
        if (roundId == 0 || roundId > roundCount) return 0;
        if (_state[roundId] != State.Settled) return 0;
        if (_claimed[roundId][player]) return 0;
        return _payoutOf(roundId, player);
    }

    /**
     * @notice The ordered list of unique players who bet in a round.
     * @param roundId Target round (must exist).
     * @return players Player addresses, in first-bet order.
     */
    function getPlayers(uint256 roundId) external view returns (address[] memory players) {
        _requireRound(roundId);
        return _players[roundId];
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
