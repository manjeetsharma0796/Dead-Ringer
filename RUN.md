# Running Dead Ringer

The full loop — **watch → verdict → stake → lock → reveal → settle → claim** — runs end-to-end.
Three packages: `contracts/` (Arena on Mantle Sepolia), `agents/` (paper-trade sim + feed, :3101),
`web/` (Next.js UI, :3100).

> The web app **degrades gracefully**: with `NEXT_PUBLIC_ARENA_ADDRESS` empty it runs on mock data
> (no backend/chain needed). Point it at a real address + run the agents service to go live.

---

## A. Full local loop (no testnet funds needed)

Four terminals from the repo root.

**1 — local chain**
```bash
cd contracts && npm install
npx hardhat node          # JSON-RPC at http://127.0.0.1:8545, 20 funded accounts
```

**2 — deploy + open a round** (new terminal)
```bash
cd contracts
npx hardhat run scripts/deploy.ts     --network localhost   # deploys Arena, writes ABI -> web/src/lib/arena.abi.json
npx hardhat run scripts/seedRound.ts  --network localhost   # opens round 1, registers 8 suspects (0-3 bots, 4-7 humans)
# The first local deploy is deterministic: 0x5FbDB2315678afecb367f032d93F642f64180aa3
# That address is already in web/.env.local.
```

**3 — agents service (live feed + bots)**
```bash
cd agents && npm install && npm run build && npm start    # :3101  — CoinGecko feed, 4 bot personalities, ws /stream
```

**4 — web UI**
```bash
cd web && bun install && bun run dev                       # :3100
```
Open http://localhost:3100. To sign verdicts/claims in the browser, add the `Localhost 8545`
network to MetaMask (chainId 31337) and import a Hardhat test key.

**Prove the on-chain loop without a browser** (bets → reveal → settle → claim, with payout asserts):
```bash
cd contracts && npx hardhat run scripts/dryRun.ts --network localhost
# Expect: sharp detective claims 1.92 MNT (96% of a 2 MNT pot), fooled player gets 0, 4% house edge to operator.
```

After bets are in, settle the round so the reveal page can pay out:
```bash
cd contracts && npx hardhat run scripts/revealRound.ts --network localhost   # lock + reveal + settle
```

---

## B. Deploy to Mantle Sepolia (the live demo) — needs a funded key

1. Put a **funded** deployer key in `contracts/.env` (faucet MNT first — chainId 5003):
   ```
   PRIVATE_KEY=0x...
   MANTLE_SEPOLIA_RPC=https://rpc.sepolia.mantle.xyz
   ```
2. Deploy + open a round:
   ```bash
   cd contracts
   npx hardhat run scripts/deploy.ts    --network mantleSepolia   # prints the address; writes deployments/mantleSepolia.json + web ABI
   npx hardhat run scripts/seedRound.ts --network mantleSepolia
   ```
3. Point the web app at it — in `web/.env.local`:
   ```
   NEXT_PUBLIC_ARENA_ADDRESS=0x<deployed address>
   NEXT_PUBLIC_ARENA_ROUND_ID=1
   ```
4. After bets, reveal + settle: `npx hardhat run scripts/revealRound.ts --network mantleSepolia`.
5. (Submission) verify the contract: `npx hardhat verify --network mantleSepolia <address> <operatorAddress>`.

---

## Economic model

Parimutuel with a **4% house edge**. Each player's share of the pot is
`stake × (confidence on correct guesses ÷ total confidence)`, pro-rata across winners.
Nobody correct → everyone reclaims their stake (refund mode). Ties split naturally by weight.
See `settle`/`claim` in `contracts/contracts/Arena.sol`.
