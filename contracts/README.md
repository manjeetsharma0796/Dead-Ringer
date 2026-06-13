# Dead Ringer — Contracts

Smart-contract skeleton for **Dead Ringer**, an on-chain "spot-the-bot" trading
game on **Mantle Sepolia** (EVM testnet, chainId `5003`, native currency **MNT**).

Suspects — some human, some bot — trade live. Players bet **HUMAN** or **BOT** on
each suspect with a confidence and a stake in MNT. Each suspect's true identity is
**committed on-chain up front**, **revealed** after betting closes, and then the
round settles and pays out.

The core contract is [`contracts/Arena.sol`](contracts/Arena.sol).

## Deployed

**Mantle Sepolia** (chainId 5003): [`0x1190506A196A0598416B0673F84071C6BC7C63A1`](https://explorer.sepolia.mantle.xyz/address/0x1190506A196A0598416B0673F84071C6BC7C63A1) — operator `0x7176DC1B76a17BB502324Dd825EaB983F675DD7a`, source verified on [Sourcify (full match)](https://repo.sourcify.dev/contracts/full_match/5003/0x1190506A196A0598416B0673F84071C6BC7C63A1/). Deploy tx `0x667777ab186949941975c38705ee326a3b9c556f2e4f848c7bcf88360f374016`. Full record: [`deployments/mantleSepolia.json`](deployments/mantleSepolia.json).

## Round lifecycle

`enum State { Open, Locked, Revealed, Settled }`

| Step | Function | Caller | State transition |
| --- | --- | --- | --- |
| Open a round for N suspects | `openRound(suspectCount)` | operator | → `Open` |
| Register suspect commitments | `registerSuspects(roundId, commits[])` | operator | `Open` |
| Place a bet + escrow MNT | `placeVerdicts(roundId, ids[], guesses[], confidences[])` payable | anyone | `Open` |
| Close betting | `lockRound(roundId)` | operator | `Open` → `Locked` |
| Reveal identities | `reveal(roundId, ids[], isHuman[], salt[])` | operator | `Locked` → `Revealed` (when all revealed) |
| Score the round | `settle(roundId)` | operator | `Revealed` → `Settled` |
| Withdraw winnings | `claim(roundId)` | anyone | `Settled` (pull payment) |

Confidences are in **basis points** (`0..10000`, i.e. `10000` = 100.00%).

Read-only views: `getRound`, `getSlip(player, roundId)`,
`suspectRevealed(roundId, id)`, `suspectCommit(roundId, id)`,
`crowdSentiment(roundId, id)` (DR-107), `previewPayout(player, roundId)`, and
`getPlayers(roundId)`.

## Settlement: parimutuel with a 4% house edge (DR-104)

After all suspects are revealed, the operator calls `settle(roundId)`:

- **Distributable pot** = `totalPot * (10000 - 400) / 10000` — a **4%** house edge
  (`HOUSE_EDGE_BPS`) is skimmed to the operator at settle; the rest goes to winners.
- **Player weight** = `totalStake * (confidence on CORRECT guesses) / (confidence on ALL guesses)`,
  where a guess is correct when `isHumanGuess` matches the revealed `isHuman`.
- `claim(roundId)` pays each winner `distributable * weight / totalWeight` as a
  `nonReentrant` pull payment (one claim per player). Ties resolve pro-rata automatically.
- **Nobody correct** (`totalWeight == 0`): the round enters **refund mode** — the house
  takes nothing and every player reclaims their exact stake via `claim`.

Lifecycle, suspect registry, stake escrow, and commit/reveal verification are fully
implemented and covered by the test suite (25 passing).

## Identity commitment scheme

Each suspect's identity is hidden behind a commitment:

```
identityCommit = keccak256(abi.encode(bool isHuman, bytes32 salt))
```

The 32-byte `salt` blinds the single boolean (otherwise an observer could trivially
brute-force the two possible `isHuman` values). The operator keeps each salt secret
until the reveal phase, then supplies `(isHuman, salt)` to `reveal`, where the
contract recomputes the hash and requires it to match the stored commitment.

Compute a commitment off-chain with ethers v6:

```ts
const identityCommit = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(["bool", "bytes32"], [isHuman, salt])
);
```

`salt` must be a random 32-byte value, e.g. `ethers.hexlify(ethers.randomBytes(32))`.

## Commands

```bash
npm install          # install dependencies
npx hardhat compile  # compile contracts + generate TypeChain types
npx hardhat test     # run the test suite
```

Deploy (writes the address to `deployments/<network>.json`):

```bash
# local in-process network
npx hardhat run scripts/deploy.ts

# Mantle Sepolia (requires PRIVATE_KEY in .env, funded with testnet MNT)
npx hardhat run scripts/deploy.ts --network mantleSepolia
```

## Configuration

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
| --- | --- |
| `MANTLE_SEPOLIA_RPC` | RPC URL (defaults to `https://rpc.sepolia.mantle.xyz`) |
| `PRIVATE_KEY` | Deployer key (0x-prefixed). Leave empty to compile/test only. |
| `MANTLESCAN_API_KEY` | Explorer API key for `hardhat verify`. |

Network details: chainId `5003`, RPC `https://rpc.sepolia.mantle.xyz`,
explorer `https://explorer.sepolia.mantle.xyz`.

## Stack

Hardhat + TypeScript + `@nomicfoundation/hardhat-toolbox`, Solidity `0.8.24`
(optimizer on), OpenZeppelin `Ownable` + `ReentrancyGuard`.
