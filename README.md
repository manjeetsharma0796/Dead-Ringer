# Dead Ringer

**Spot the bot trader.** An on-chain inverted Turing test, built on Mantle.

Six suspects trade live against real price feeds. Some are humans, some are bots
built to trade *believably*. You watch the anonymized feeds, bet **HUMAN** or
**BOT** on each suspect with a confidence level, and stake MNT on your read.
Identities are committed on-chain up front and revealed at the end — so the
reveal is trustless, not our word against yours. Detection hovers near a coin
flip. That's the product: *we didn't build an agent that trades well — we built
ones that trade believably, and put the Turing test on-chain.*

> Mantle AI Hackathon · track: **Consumer & Viral DApps**

---

## The loop

```
watch the feeds → call HUMAN/BOT per suspect (+ confidence) → stake MNT
      → round locks → on-chain reveal → settle payouts → fool-rate leaderboard
```

Trust comes from commit–reveal: each suspect's identity is stored on-chain as
`identityCommit = keccak256(abi.encode(isHuman, salt))` before betting opens, and
verified against the revealed `(isHuman, salt)` after it closes. Nobody — not even
the operator — can change an identity once a round is open.

## Monorepo layout

| Package | What it is | Stack | Dev port |
|---|---|---|---|
| [`contracts/`](contracts/) | `Arena.sol` — round lifecycle, suspect registry, stake escrow, commit-reveal | Hardhat · Solidity 0.8.24 · OpenZeppelin | — |
| [`web/`](web/) | The arena UI — dossier cards, verdict sliders, reveal ceremony, leaderboard | Next.js 16 · React 19 · Tailwind 4 · wagmi/viem | **3100** |
| [`agents/`](agents/) | Paper-trade simulator — real price feed, trade engine, bot harness, live stream | Node · TypeScript · Express · ws | **3101** |
| [`docs/`](docs/) | Demo script + storyboard | Markdown | — |

The live task board is [`TODO.md`](TODO.md) — a `DR-XXX` task system (claim → branch → PR → auto-merge).

## Chain

Everything targets **Mantle Sepolia testnet** (chainId **5003**, RPC
`https://rpc.sepolia.mantle.xyz`, explorer `https://explorer.sepolia.mantle.xyz`,
native currency MNT). No mainnet. Trades are **paper trades against real price
feeds** — no DEX swaps; the bet/reveal/settle layer is the real product.

## Run it

Each package is independent. From the repo root:

**Contracts**
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test                                   # 16 passing
npx hardhat run scripts/deploy.ts --network mantleSepolia   # needs .env (see contracts/.env.example)
```

**Web** (arena UI, on :3100)
```bash
cd web
npm install
npm run dev            # next dev -p 3100  →  http://localhost:3100
```

**Agents** (simulator + API + websocket, on :3101)
```bash
cd agents
npm install
npm run dev            # boots the feed, engine, bots, and ws stream on :3101
npm test               # behavioral-stats unit tests
```

> Port note: `web` is pinned to 3100 and `agents` to 3101 to stay clear of a
> sibling project that owns 3000/5432/6379 on the same machines.

## Status

Built to demo one flawless round end-to-end. What's live vs. pending:

| Area | State |
|---|---|
| Commit-reveal contract (lifecycle, registry, escrow, reveal) | ✅ on `main`, 16 tests |
| Wallet on Mantle Sepolia (wagmi/viem) | ✅ on `main` |
| Trade simulator + price feed + websocket stream | ✅ on `main` |
| Per-suspect behavioral tells | ✅ on `main` |
| Demo script + storyboard | ✅ on `main` |
| **Payout math** (`settle`/`claim`) | ⏳ stubbed — pending the economic-model spec (DR-104) |
| **Bot personalities** | ⏳ harness shipped, strategies pending (DR-203) |
| Testnet deploy + verified addresses | ⏳ pending funded wallets (DR-402/DR-106) |

Contract addresses: _TBD once DR-106 deploys to Mantle Sepolia._

## Team

Four-person sprint — Manjeet (contracts), Mouli (frontend), Prithwish
(backend/agents), Jishnu (production/integration/demo). See [`TODO.md`](TODO.md)
for the live board and ownership.
