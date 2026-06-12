# Dead Ringer — agents service

Paper-trade simulator, live price feed, bot harness, and WebSocket stream.
Serves on **port 3101** (web dev server = 3100; klink stack = 3000/5432/6379 — no overlap).

## Quick start

```bash
cd agents
cp .env.example .env        # edit if needed
npm install
npm run build               # tsc → dist/
node dist/index.js          # or: npx ts-node src/index.ts
```

Verify:
```bash
curl http://localhost:3101/health
```

## Trade contract (frontend ↔ backend parity)

Every trade — bot or human — is emitted in this exact shape:

```ts
interface Trade {
  id: string;          // UUIDv4
  ts: string;          // "HH:MM:SS"
  side: "BUY" | "SELL";
  pair: string;        // e.g. "ETH/USD"
  size: number;        // quantity of base asset
  price: number;       // execution price in USD (real feed price)
  pnl: number;         // realized PnL on close; 0 while position is open
  suspectId: number;   // 1-indexed suspect
}
```

WebSocket stream envelope:
```json
{ "type": "trade", "payload": <Trade> }
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness + latest prices |
| `GET` | `/trades` | Full trade log (all suspects) |
| `GET` | `/trades?suspectId=3` | Trades for one suspect |
| `GET` | `/suspects` | Per-suspect stats (tradeCount, winRate) |
| `POST` | `/admin/trade` | Inject a manual human trade |
| `WS` | `ws://…/stream` | Live broadcast of every new trade |
| `GET` | `/admin/admin.html` | Browser admin form (DR-204) |

### POST /admin/trade body

```json
{
  "suspectId": 5,
  "side": "BUY",
  "pair": "ETH/USD",
  "size": 0.1
}
```

Returns the full `Trade` object (server fills `id`, `ts`, `price`, `pnl`).

## Port rationale

| Port | Owner |
|------|-------|
| 3000 | klink API (Solana sibling project) |
| 3030 | klink web |
| 3100 | Dead Ringer Next.js dev server |
| **3101** | **Dead Ringer agents service (this)** |
| 5432 | klink Postgres |
| 6379 | klink Redis |
| 8545 | Hardhat/anvil (free) |

## Suspect layout (DR-502)

`SUSPECT_COUNT` in `src/config.ts` is the **single source of truth**.
Default: **6 suspects** (ids 1–6). Bot runner assigns ids 1–4 as bots; 5–6 as human slots.

> DR-502 is still open (6 vs 8). Change `SUSPECT_COUNT` to 8 and restart — nothing else needs editing.

## What is stubbed / TODO

### DR-203 — Bot personalities (BLOCKED on DR-201 credits)

All four suspects run the same `BaselineBot` (alternating BUY/SELL, small random sizes).
Real personalities are stubbed in `src/bots/runner.ts` with detailed TODO comments:

- **The Quant** (suspect 1) — metronomic intervals, tight stops, round lot sizes
- **The Degen** (suspect 2) — LLM-driven via Z.AI, FOMO entries, revenge trades
- **The Sleeper** (suspect 3) — human sleep-cycle timing, fat-finger corrections
- **Paper Hands** (suspect 4) — sells dips, buys pumps (cut #3 — lowest priority)

### DR-204 — Admin page auth

`POST /admin/trade` currently accepts any request. TODO: shared-secret header check.

### DR-207 — Per-suspect behavioral tells

`GET /suspects` returns `winRate` (real) but not: `avgHoldTime`, `activeHours`, `panicSellCount`.
Those are marked TODO in `src/server/routes.ts`.

### Swappable price feed

`CoinGeckoFeed` implements the `PriceFeed` interface in `src/feed/types.ts`.
To use Bybit: implement `PriceFeed`, swap the instance in `src/index.ts`.
