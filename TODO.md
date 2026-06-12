---
title: Team task board — Dead Ringer 24-hour sprint
purpose: Shared task tracker for the 4-person team — humans and their Claude agents. Same board system as klink, namespaced DR-XXX so the two repos never collide.
last_updated: 2026-06-13
---

# TODO

Single source of truth for what's in flight during the Dead Ringer sprint. Anyone — human or Claude agent — can pick pending tasks, add new ones, or release stale ones.

> **Sibling repo notice:** the same four people also run [klink](https://github.com/manjeetsharma0796/klink), whose board uses `T-XXX` (T-101–T-510 are burned there, including gap IDs T-233/T-509). This board uses **`DR-XXX`** — never write a bare task number anywhere the two projects share (Telegram, commit talk); always the full `DR-XXX` / `T-XXX` form.

## How to use this file (90-second version)

1. **Find a pickable task** — `Status: pending` AND every entry in `Depends-on` is `done`.
2. **Claim** — change `Status: pending` → `Status: in-progress @your-handle YYYY-MM-DD`. Commit that line on your task branch; the merge of your PR records the lock. Urgent/solo: push the status line straight to `main` — the push is the lock.
3. **Work** — branch `feat/DR-XXX-<slug>` off `main`, commit referencing `DR-XXX` in every message. Open a PR when ready — **non-draft PRs auto-merge (squash) on their own** via [`auto-merge.yml`](.github/workflows/auto-merge.yml). Keep the PR a **draft** while still working; mark it **Ready for review** to merge. One task = one PR.
4. **Finish** — the same PR flips the line to `Status: done @your-handle YYYY-MM-DD` and moves the task block to the **Done** section at the bottom. Merge happens automatically and the branch auto-deletes.
5. **Stuck** — change to `Status: blocked — <one-line reason>` and ping the team channel. Keep the entry; do not delete it.
6. **Add a task** — append a new block under the right section using the next free ID. Mirror an existing block's shape — don't invent fields. State `Acceptance` clearly so anyone can pick it up cold.
7. **Drop a claim** — flip `Status: in-progress @you DATE` back to `Status: pending`. No shame in it.

### Stale-claim rule (sprint scale)

This is a 24-hour sprint, so klink's 5-day rule compresses: if a task is `in-progress` for **more than 2 hours with zero commits referencing its ID**, anyone may revert it to `pending` and re-claim. Add a `Reverted: <time> by @you — reason` line for paper trail. Override earlier when you have concrete reason (blocking your own work, owner asleep).

## Conventions

| Thing | Convention |
|---|---|
| Branch | `feat/DR-XXX-<short-slug>` / `fix/DR-XXX-<slug>` / `docs/DR-XXX-<slug>` |
| Commit | `DR-XXX: <verb> <object>` (e.g. `DR-102: add placeVerdicts payable slip`) |
| PR title | `DR-XXX — <task title>` |
| Merging | one PR per task; **non-draft PRs auto-merge (squash)** via [`auto-merge.yml`](.github/workflows/auto-merge.yml). Draft = WIP, Ready = merge. Branches auto-delete on merge |
| Scope per commit/PR | One task = one unit of work. If it balloons, stop and split — second thing gets a new DR-XXX entry |
| Network | **Mantle Sepolia testnet only** (chainId 5003). No mainnet heroics. |
| Sibling repo | klink = `T-XXX` on Solana devnet; Dead Ringer = `DR-XXX` on Mantle Sepolia. Different prefixes, different chains, zero overlap by construction |

## Ground rules (read once, obey all day)

- Trades are **paper trades against real price feeds** — no actual DEX swaps. The bet/reveal layer is the real product; judges won't care that trading is simulated.
- Mock first, wire later. Frontend never waits on contracts — build against fake data, swap in real calls at integration (DR-310).
- Scope cuts are pre-decided (see [Pre-agreed cut order](#pre-agreed-cut-order)). When behind schedule, cut without discussion.
- Commit every 30–45 min. Working `main` at all times — judges may check the repo.

### Collision rules vs klink (same people, same machines — keep the projects apart)

- **Ports:** klink local stack owns `3000` (api), `3030` (web), `5432` (Postgres), `6379` (Redis). Dead Ringer pins **web = 3100**, **backend + websocket = 3101**. Port `8545` is free for a local Hardhat/anvil node.
- **Hosting:** Dead Ringer backend deploys to **Railway**. Render is klink-only — klink's *production* API lives there and dev machines carry a Render MCP with write access to that workspace. Vercel hosts both webs; free-tier build concurrency is shared, so don't trigger simultaneous deploys during klink work.
- **Env hygiene:** never DM raw `.env` files across projects (known klink habit — and the wrong-paste risk is real since names like `DATABASE_URL`/`PORT`/`JWT_SECRET` recur). Dead Ringer env examples live in this repo; prefix project-specific vars `DR_` / `NEXT_PUBLIC_DR_` where possible.
- **Park klink for the sprint:** stop klink's local Postgres/Redis/dev servers during these 24 hours (frees the ports and the heads). klink's Colosseum window resumes after.
- **Telegram:** notifications from this repo are tagged `[DR/...]` by the workflow and should go to a **separate Dead Ringer chat or topic**, not the `klink-dev` group where klink's bot already posts (DR-413).

## Team

> **Team channel:** Dead Ringer Telegram chat/topic — set up in DR-413 (same bot as klink is fine; same *chat* is not). Notification workflow: [`.github/workflows/telegram-notify.yml`](.github/workflows/telegram-notify.yml).

> **OS note:** Dead Ringer is EVM — the whole toolchain (Node, Next.js, Hardhat/Foundry, wagmi/viem) runs native on Windows/macOS/Linux. Every task is `OS: any`; nobody needs WSL2 here, unlike klink's Anchor work. Any teammate can pick any task from any machine.

| Handle | Sprint role | OS | Timezone |
|---|---|---|---|
| `@Manjeet` | Smart contracts / chain (DR-1xx) | any | IST |
| `@Mouli` | Frontend / UI (DR-3xx) | any | IST |
| `@Prithwish` | Backend + agents (DR-2xx) | any | IST |
| `@Jishnu` | Production build — integration, environments, demo & submission (DR-4xx, DR-5xx) | any | IST |

Section leads are defaults, not fences — every task names its taker on an `Owner:` line, but anyone unblocked picks the highest-leverage pending task.

## Active claims

To see who's working on what right now: `grep "Status: in-progress" TODO.md`. Claims live inline with each task — no separate roster.

## Sprint clock

The hour-by-hour plan from the original sprint doc, expressed as gates. A task's *real* schedule is its `Depends-on` chain; this table is the pacing reference.

| Hours | Phase | Tasks in flight | Gate |
|---|---|---|---|
| 0–1 | Kickoff (all hands) | DR-501, DR-502, DR-401, DR-402, DR-201 | demo script locked first |
| 1–6 | Parallel build, phase 1 | DR-101…106 · DR-202…205 · DR-301…305 · DR-403…405, DR-503 | — |
| 6–7 | **Checkpoint 1** (30 min max) | DR-406 | ABI + API frozen |
| 7–12 | Parallel build, phase 2 | DR-107…109 · DR-206…208 · DR-306…309 · DR-407, DR-408 | — |
| 12–16 | Integration (Jishnu leads) | DR-310, DR-311, DR-312, DR-409 | full loop bulletproof |
| 16–17 | **Checkpoint 2 — FEATURE FREEZE** | DR-410 | nothing new after this |
| 17–20 | Polish + seed | DR-110, DR-209, DR-313, DR-314, DR-411 | — |
| 20–23 | Demo + submission | DR-504, DR-505, DR-506, DR-507 | submitted, links verified |
| 23–24 | Buffer + rehearsal | DR-508, DR-412 | two clean run-throughs |

## Sections

1. [Smart contracts / on-chain](#1--smart-contracts--on-chain) — `DR-1xx` — Arena.sol, commit-reveal, staking, payouts, Mantle Sepolia deploy
2. [Backend + agents](#2--backend--agents) — `DR-2xx` — trade simulator, bot personalities, feeds, tells
3. [Frontend / UI](#3--frontend--ui) — `DR-3xx` — Next.js arena, dossier cards, reveal ceremony, leaderboard
4. [Infrastructure / DevOps](#4--infrastructure--devops) — `DR-4xx` — repo, wallets, environments, checkpoints, dry runs
5. [Docs, demo + submission](#5--docs-demo--submission) — `DR-5xx` — demo script, video, README, DoraHacks + X thread
6. [Done](#done)
7. [Blocked](#blocked)

> **Seed scope:** converted 1:1 from the original hour-by-hour sprint plan (git `9325f69`). If the demo script (DR-501) changes scope, edit/add tasks here in the same commit. Goal unchanged: **one flawless loop beats ten half-features** — one arena round end-to-end (watch → verdict → stake → reveal → payout) plus landing page, demo video, and submission.

---

## 1 — Smart contracts / on-chain

> Lead: `@Manjeet`. The trust layer — on-chain commits make the reveal trustless, which is the "why Mantle" story.

### Status legend
- `pending` — anyone with deps cleared can pick
- `in-progress @handle YYYY-MM-DD` — locked
- `review` — implementation PR open, awaiting review
- `blocked — <reason>` — stuck
- `done @handle YYYY-MM-DD` — completed; move block to Done

Every block also carries `Owner: @handle` — the pre-assigned sprint lane from the original plan, i.e. who has taken the task. It's the default assignee, not the lock: the lock is still flipping Status to `in-progress` when you actually start. Picking outside your lane is fine when you're unblocked and it helps the critical path.

### DR-101 — Arena.sol round lifecycle + suspect registry
- Status: done @Manjeet 2026-06-13
- Owner: @Manjeet
- Depends-on: DR-401
- OS: any
- Scope: contracts
- Acceptance: round states `open → locked → revealed`; suspect registry stores `identityCommit = keccak256(isHuman, salt)` per suspect; only the operator can open/lock rounds and register suspects.
- Notes: ✅ shipped on `main` — `contracts/Arena.sol` (Hardhat, Solidity 0.8.24): lifecycle, registry, `identityCommit = keccak256(abi.encode(isHuman, salt))`, Ownable operator access control. PR #1; 16 tests passing.

### DR-102 — Staking: placeVerdicts slip
- Status: done @Manjeet 2026-06-13
- Owner: @Manjeet
- Depends-on: DR-101
- OS: any
- Scope: contracts
- Acceptance: `placeVerdicts(roundId, suspectIds[], verdicts[], confidences[])` payable in MNT — one tx covers the whole slip; reverts after the round locks; stake recorded per player per suspect.

### DR-103 — Reveal + settle
- Status: in-progress @Manjeet 2026-06-13
- Owner: @Manjeet
- Depends-on: DR-101
- OS: any
- Scope: contracts
- Acceptance: `reveal(suspectId, isHuman, salt)` verifies against the stored commit; `settle()` computes payouts pro-rata by correct verdicts × confidence multiplier.
- Notes: ⏳ partial — `reveal()` commit-verification shipped on `main` (`contracts/`, PR #1) with passing happy-path + wrong-salt + flipped-bit tests. `settle()` is a stub that reverts `DR-104: payout model not specified` — the payout half is blocked on the economic spec (parimutuel vs house-banked). Finish when DR-104 unblocks.

### DR-104 — claim() + house-edge skim
- Status: pending
- Owner: @Manjeet
- Depends-on: DR-102, DR-103
- OS: any
- Scope: contracts
- Acceptance: winners pull payouts via `claim()`; a simple house-edge skim accrues to the protocol (story point: protocol revenue).

### DR-105 — Happy-path test suite
- Status: done @Manjeet 2026-06-13
- Owner: @Manjeet
- Depends-on: DR-101, DR-102
- OS: any
- Scope: tests
- Acceptance: Hardhat or Foundry tests green for the happy path ONLY — commit → stake → reveal → claim. No edge-case rabbit holes before Checkpoint 1.
- Notes: ✅ shipped on `main` (PR #1) — Hardhat+chai, 16 tests passing: full lifecycle (open→register→stake→lock→reveal) asserting events + escrow, wrong-salt + flipped-bit reveal reverts, and settle/claim stub reverts. (`claim` itself is stubbed — DR-104.) Depends-on corrected from DR-104 (was inverted).

### DR-106 — Deploy to Mantle Sepolia + verify
- Status: pending
- Owner: @Manjeet
- Depends-on: DR-105, DR-402
- OS: any
- Scope: deploy
- Acceptance: contracts live on Mantle Sepolia (chainId 5003); addresses saved where web/agents read them (env + a `deployments` note); source verified on the explorer — **submission requires the contract address**.

### DR-107 — Crowd-sentiment view function
- Status: pending
- Owner: @Manjeet
- Depends-on: DR-102
- OS: any
- Scope: contracts
- Acceptance: view function returns per-suspect % of bot votes for the UI's crowd-sentiment bar.

### DR-108 — Settlement edge cases
- Status: pending
- Owner: @Manjeet
- Depends-on: DR-103
- OS: any
- Scope: contracts
- Acceptance: nobody-correct → stake rolls over; ties → split. Covered by a test each.

### DR-109 — Scripted round-runner
- Status: pending
- Owner: @Manjeet
- Depends-on: DR-106
- OS: any
- Scope: ops
- Acceptance: one command opens a round, registers suspect commits, and later reveals — `@Jishnu` runs this live in the demo without touching a console mid-pitch.

### DR-110 — Explorer polish + NatSpec
- Status: pending
- Owner: @Manjeet
- Depends-on: DR-106
- OS: any
- Scope: contracts, docs
- Acceptance: all deployed contracts verified on the explorer with tidy NatSpec comments — judges read contracts.

## 2 — Backend + agents

> Lead: `@Prithwish`. Bots that trade *believably*, plus real human noise — the secret sauce.

### DR-201 — Claim hackathon computing credits
- Status: pending
- Owner: @Prithwish
- Depends-on: —
- OS: any
- Scope: ops
- Acceptance: applications submitted at kickoff for Z.AI / Nansen / other partner credits — approval takes time, so this fires in hour 0.

### DR-202 — Trade simulator service
- Status: done @Prithwish 2026-06-13
- Owner: @Prithwish
- Depends-on: DR-401
- OS: any
- Scope: api, db
- Acceptance: real price feed (CoinGecko or Bybit ticker) + paper-trade engine; positions tracked per suspect; trade log persisted (Postgres/Supabase, or JSON + websocket if faster). Serves on port **3101** (klink owns 3000). Paper trades only — no DEX calls.
- Notes: ✅ shipped on `main` — `agents/` Express+ws service on :3101 (PR #2): CoinGecko feed (live-verified BTC/ETH), paper-trade engine emitting the exact frontend `Trade` shape (human/bot parity by construction), JSON trade log. `SUSPECT_COUNT` is a single config constant for the 6-vs-8 decision; feed source swappable (Bybit later).

### DR-203 — Bot personalities ×4
- Status: pending
- Owner: @Prithwish
- Depends-on: DR-202, DR-201
- OS: any
- Scope: agents
- Acceptance: four distinct behavioral fingerprints running against the simulator — **The Quant** (metronomic intervals, tight stop-losses, round-number trades), **The Degen** (LLM-driven via Z.AI: FOMO entries, revenge trades, oversized positions), **The Sleeper** (mimics human sleep cycle, sloppy timing, occasional fat-finger + immediate correction — the one designed to fool people), **Paper Hands** (sells every dip, buys every pump, painfully human-looking).
- Notes: Cut #3 — if behind, drop to 3 bots (Paper Hands goes first).

### DR-204 — Human trader slots + admin page
- Status: pending
- Owner: @Prithwish
- Depends-on: DR-202
- OS: any
- Scope: agents, web
- Acceptance: tiny admin page where 2 humans (`@Jishnu` + one more) place manual paper trades; usable in spare moments all day — real human noise in the feed.

### DR-205 — Trade stream endpoint
- Status: done @Prithwish 2026-06-13
- Owner: @Prithwish
- Depends-on: DR-202
- OS: any
- Scope: api
- Acceptance: websocket (or polling) endpoint on :3101 streaming trades to the frontend; event names match the integration contract frozen in DR-404.

### DR-206 — Bots running continuously
- Status: pending
- Owner: @Prithwish
- Depends-on: DR-203
- OS: any
- Scope: agents
- Acceptance: bots wired to the live simulator and left running from phase 2 onward — judges love a feed with real history depth.

### DR-207 — Behavioral tells per suspect
- Status: done @Prithwish 2026-06-13
- Owner: @Prithwish
- Depends-on: DR-202
- OS: any
- Scope: api
- Acceptance: per-suspect computed tells served to the UI — avg hold time, active hours, panic-sell count.
- Notes: ✅ shipped on `main` (PR #5) — `agents/src/engine/stats.ts` pure functions over the trade log fill the frontend `SuspectStats` (winRate, avgHoldMin via open→close pairing, maxDrawdown, volatility) + extra tells (activeHours, panicSellCount), served on `GET /suspects`. No engine change — derived from the frozen Trade log, so it won't churn with bot tuning or the economic model. 6 `node:test` unit tests pass.

### DR-208 — Landing page content pass
- Status: pending
- Owner: @Prithwish
- Depends-on: DR-501
- OS: any
- Scope: web, docs
- Acceptance: with `@Mouli` — hero, live two-feed teaser, how-it-works, builder section.
- Notes: Cut #2 (partial) — builder section goes if behind. The `web/` app on `main` already has the landing skeleton (`Hero/Lineup/Evidence/Builders/Colophon` sections + scramble/split-flap flourishes) — this task is the copy/content pass over it.

### DR-209 — Seed the juicy demo round
- Status: pending
- Owner: @Prithwish
- Depends-on: DR-206
- OS: any
- Scope: agents, ops
- Acceptance: demo round shows 12+ hours of accumulated bot/human trade history in the feeds.

## 3 — Frontend / UI

> Lead: `@Mouli`. Use the master UI prompt: dark evidence-room palette, mono for data, zero gradients.

### DR-301 — Scaffold web app
- Status: done @Mouli 2026-06-13
- Owner: @Mouli
- Depends-on: DR-401
- OS: any
- Scope: web, setup
- Acceptance: Next.js + Tailwind + Framer Motion + wagmi/viem scaffolded under `/web` with Mantle Sepolia chain config (chainId 5003); dev server pinned to port **3100** (klink owns 3000/3030).
- Notes: ✅ shipped on `main` (PR #3) — real wagmi/viem wallet on Mantle Sepolia (5003): `web/src/lib/wagmi.ts`, a Next-16 `'use client'` `Providers` wrapper, `store.tsx` rewired to wagmi hooks with the `WalletState` shape preserved, dev port pinned to 3100. `tsc --noEmit` clean. (Mantle chain defined inline — viem's installed version lacked the export.) Base scaffold came in via the `web/` merge (DR-401).

### DR-302 — Design tokens
- Status: in-progress @Mouli 2026-06-12
- Owner: @Mouli
- Depends-on: DR-301
- OS: any
- Scope: design
- Acceptance: tokens from the master UI prompt applied — dark evidence-room palette, monospace for data, zero gradients.
- Notes: "noir editorial" system landed on `main` (under `web/`) (`globals.css`: oklch ink/dim palette, mono data, `.noir-grid` — the linear-gradients there are 1px grid lines, not color fades, so the zero-gradients rule holds).

### DR-303 — Mock data layer
- Status: in-progress @Mouli 2026-06-12
- Owner: @Mouli
- Depends-on: DR-301
- OS: any
- Scope: web
- Acceptance: `mockData.ts` with 6 suspects, streaming fake trades, round countdown — frontend never waits on contracts or backend.
- Notes: lives on `main` (under `web/`) as `web/src/lib/mock.ts` + `suspects.ts` + `store.tsx` (deterministic seeded set, ticking trades). ⚠️ Ships **8 suspects (4 bots / 4 humans)** — DR-502's locked decision says **6 (4 bots / 2 humans)**. Reconcile one way or the other before integration.

### DR-304 — Dossier card (the hero component)
- Status: in-progress @Mouli 2026-06-12
- Owner: @Mouli
- Depends-on: DR-302, DR-303
- OS: any
- Scope: web, design
- Acceptance: codename stamp, sparkline, 3 behavioral tells, HUMAN↔BOT verdict slider with live payout multiplier.
- Notes: **Never cut.** On `main` (under `web/`): `DossierCard.tsx` + `VerdictSlider.tsx` + `Sparkline.tsx` + `TellChip.tsx` + `Stamp.tsx` all exist — verify acceptance against mocks, don't rebuild.

### DR-305 — Arena page
- Status: in-progress @Mouli 2026-06-12
- Owner: @Mouli
- Depends-on: DR-304
- OS: any
- Scope: web
- Acceptance: dossier-card grid + live trade tape + round status rail.
- Notes: on `main` (under `web/`): `web/src/app/(app)/arena/page.tsx` + `TradeTape.tsx` + `Countdown.tsx`.

### DR-306 — Guess slip
- Status: in-progress @Mouli 2026-06-12
- Owner: @Mouli
- Depends-on: DR-304
- OS: any
- Scope: web
- Acceptance: docked panel (mobile: bottom sheet) collecting verdicts; stake input, projected payout, `Lock verdicts` → wagmi tx (against mocks until DR-310).
- Notes: `GuessSlip.tsx` on `main` (under `web/`); the wagmi tx half waits on DR-301's chain config.

### DR-307 — Suspect detail drawer
- Status: in-progress @Mouli 2026-06-12
- Owner: @Mouli
- Depends-on: DR-305
- OS: any
- Scope: web
- Acceptance: trade history table, activity heatmap, crowd-sentiment bar.
- Notes: Cut #2 (partial) — heatmap goes if behind. `SuspectDrawer.tsx` exists on `main` (under `web/`).

### DR-308 — Reveal ceremony page
- Status: in-progress @Mouli 2026-06-12
- Owner: @Mouli
- Depends-on: DR-304
- OS: any
- Scope: web, design
- Acceptance: staggered redaction-tear animation → HUMAN/BOT stamps → score card. This is the demo climax — make it perfect.
- Notes: **Never cut.** `web/src/app/(app)/reveal/page.tsx` on `main` (under `web/`) — it already draws a share canvas ("CAN YOU SPOT THE MACHINE? · BUILT ON MANTLE"), which overlaps DR-309.

### DR-309 — Share-card generator
- Status: pending
- Owner: @Mouli
- Depends-on: DR-308
- OS: any
- Scope: web
- Acceptance: html-to-image share card — "4/6 · Top 8% Detective".
- Notes: Cut #1 — falls back to a static mock image. Check the `web/` app on `main` first: the reveal page already renders a share canvas (DR-308 note) — extend that rather than starting fresh.

### DR-310 — Swap mocks → real feed + contracts
- Status: pending
- Owner: @Mouli
- Depends-on: DR-306, DR-205, DR-106
- OS: any
- Scope: web, api
- Acceptance: frontend reads the real websocket feed and performs real contract reads/writes on Mantle Sepolia; `mockData.ts` no longer on the demo path. Integration phase — `@Jishnu` coordinates, `@Mouli` executes.

### DR-311 — Leaderboard page
- Status: in-progress @Mouli 2026-06-12
- Owner: @Mouli
- Depends-on: DR-207, DR-310
- OS: any
- Scope: web
- Acceptance: two tabs from real round data — **Detectives** (accuracy) and **Dead Ringers** (fool-rate).
- Notes: Cut #4 — hardcode plausible data if behind, but the fool-rate tab must exist; it's the inverted-Turing-test story. `leaderboard/page.tsx` exists on `main` (under `web/`) (mock-fed); real-data wiring still open.

### DR-312 — Mobile pass on demo-critical screens
- Status: pending
- Owner: @Mouli
- Depends-on: DR-310, DR-308
- OS: any
- Scope: web
- Acceptance: arena, guess slip, and reveal ceremony usable on mobile.

### DR-313 — Loading/empty/error states
- Status: pending
- Owner: @Mouli
- Depends-on: DR-410
- OS: any
- Scope: web
- Acceptance: loading skeletons, empty states, and error toasts on every screen in the demo path.
- Notes: `Skeleton.tsx` + `Toasts.tsx` primitives already exist on `main` (under `web/`) — this task is applying them across the demo path, not building them.

### DR-314 — Landing page final polish
- Status: pending
- Owner: @Mouli
- Depends-on: DR-208, DR-410
- OS: any
- Scope: web, design
- Acceptance: landing is the first impression for judges browsing submissions — polished, fast, on-message.

## 4 — Infrastructure / DevOps

> Lead: `@Jishnu`. Integration, environments, checkpoints — the glue that makes the loop bulletproof.

### DR-401 — Repo setup
- Status: done @Jishnu 2026-06-13
- Owner: @Jishnu
- Depends-on: —
- OS: any
- Scope: setup
- Acceptance: monorepo layout `/contracts`, `/web`, `/agents`; README skeleton with the one-liner.
- Notes: ✅ resolved 2026-06-13 — the orphan `frontend` branch (Next.js app at its root, no merge base) was subtree-merged under `web/`, preserving @Mouli's history without disturbing root `README`/`TODO`. `web/ui-inspo/` is a scratch dir that rode along — delete when convenient. Now complete: `/contracts` + `/agents` landed (PRs #1–#2) and a root README documents all four packages (PR #6).

### DR-402 — Chain ops: wallets, faucet, RPC
- Status: pending
- Owner: @Jishnu
- Depends-on: —
- OS: any
- Scope: ops
- Acceptance: Mantle Sepolia RPC endpoints configured; faucet MNT in all 4 dev wallets; explorer-verification tooling ready for `@Manjeet`.

### DR-403 — CI + environments
- Status: pending
- Owner: @Jishnu
- Depends-on: DR-401
- OS: any
- Scope: infra
- Acceptance: Vercel project for `/web`; **Railway** project for the backend (hard rule: Render stays klink-only — klink prod lives there); env-var management documented in `.env.example` files per app.

### DR-404 — Freeze the integration contract
- Status: pending
- Owner: @Jishnu
- Depends-on: DR-401
- OS: any
- Scope: infra, api
- Acceptance: API shapes, websocket event names, and the ABI export pipeline (contracts → web) written down early; frozen at Checkpoint 1.

### DR-405 — Human paper-trading ops
- Status: pending
- Owner: @Jishnu
- Depends-on: DR-204
- OS: any
- Scope: ops
- Acceptance: `@Jishnu` + one teammate trade casually all day via the admin page; 1–2 outside friends recruited as extra human traders.

### DR-406 — CHECKPOINT 1 (hours 6–7, all hands, 30 min max)
- Status: pending
- Owner: all hands
- Depends-on: DR-104, DR-205, DR-305, DR-404
- OS: any
- Scope: ops
- Acceptance: each piece demoed raw; anything not on the critical path killed; exact integration contract agreed — API shapes, event names, contract ABI **frozen from here**.

### DR-407 — Staging deploys
- Status: pending
- Owner: @Jishnu
- Depends-on: DR-403, DR-106
- OS: any
- Scope: infra
- Acceptance: staging live for web + backend; testnet contract addresses wired into staging env vars.

### DR-408 — Integration test script
- Status: pending
- Owner: @Jishnu
- Depends-on: DR-404
- OS: any
- Scope: ops, docs
- Acceptance: the exact click-path of the full round written out for hour 12 — the script the dry run follows.

### DR-409 — Full dry run on testnet
- Status: pending
- Owner: @Jishnu
- Depends-on: DR-310, DR-109, DR-407, DR-408
- OS: any
- Scope: ops
- Acceptance: open round → 3 wallets place slips → lock → reveal → claim, end-to-end on Mantle Sepolia. Fix until this loop is bulletproof — `@Manjeet` on contract bugs, `@Prithwish` on feed bugs.

### DR-410 — CHECKPOINT 2 — FEATURE FREEZE (hours 16–17)
- Status: pending
- Owner: all hands
- Depends-on: DR-409
- OS: any
- Scope: ops
- Acceptance: nothing new lands after this gate. Bugs, polish, and story only.

### DR-411 — One REAL round with outsiders
- Status: pending
- Owner: @Jishnu
- Depends-on: DR-409
- OS: any
- Scope: ops
- Acceptance: a real round run with friends/other hackers from Discord; screenshots of their guesses and accuracy captured (live-user proof = community-vote ammo — $17K in community prizes). If the "detection accuracy: 54% — barely better than a coin flip" stat emerges, capture it; that's the headline number.

### DR-412 — Production deploy + stage backup
- Status: pending
- Owner: @Jishnu
- Depends-on: DR-410
- OS: any
- Scope: infra
- Acceptance: production deploy on Vercel (custom domain if available) with a final smoke test; backup screen-recording of the full loop saved locally in case wifi/testnet dies on stage.

### DR-413 — Telegram integration setup
- Status: pending
- Owner: @Jishnu
- Depends-on: —
- OS: any
- Scope: infra
- Acceptance: a **Dead Ringer Telegram chat or topic** exists (reusing klink's bot is fine; reusing the `klink-dev` chat is not — its bot already posts there). Repo secrets `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` set on this repo; [`telegram-notify.yml`](.github/workflows/telegram-notify.yml) verified firing with `[DR/...]`-tagged messages on a test push.

## 5 — Docs, demo + submission

> Lead: `@Jishnu` (deck: `@Mouli`). The story is the product on judging day.

### DR-501 — Lock the demo script FIRST
- Status: done @Jishnu 2026-06-13
- Owner: all hands
- Depends-on: —
- OS: any
- Scope: docs
- Acceptance: the 3-minute story written before building — then the team builds only what the story needs. All hands, hour 0.

### DR-502 — Final round parameters
- Status: pending
- Owner: all hands
- Depends-on: —
- OS: any
- Scope: decision
- Acceptance: decided and recorded — **6 suspects (4 bots, 2 humans), 1 demo round, MNT-denominated stakes**. Change only via editing this task.
- Notes: ⚠️ the frontend mock (DR-303) currently ships **8 suspects (4 bots / 4 humans)** — either ratify 8/4/4 by editing this task or fix the mock to 6/4/2. Contracts + bots must match whatever is ratified.

### DR-503 — Demo storyboard
- Status: done @Jishnu 2026-06-13
- Owner: @Jishnu
- Depends-on: DR-501
- OS: any
- Scope: docs
- Acceptance: shot list for the 3-min video; updated as features land.

### DR-504 — 3-minute demo video
- Status: pending
- Owner: @Jishnu
- Depends-on: DR-409, DR-503
- OS: any
- Scope: demo
- Acceptance: cold open on two anonymous feeds → "one is human — which?" → place verdicts → live reveal ceremony → payout on-chain → fool-rate leaderboard → close with: *"we didn't build an agent that trades well — we built ones that trade believably, and put the Turing test on-chain."*

### DR-505 — Submission-grade README
- Status: pending
- Owner: @Jishnu, @Manjeet
- Depends-on: DR-106
- OS: any
- Scope: docs
- Acceptance: pitch, architecture diagram, contract addresses, how-to-run, track (**Consumer & Viral DApps**), partner tech used (Mantle, Z.AI, Bybit feed, Nansen if used). `@Jishnu` + `@Manjeet`.

### DR-506 — Pitch deck
- Status: pending
- Owner: @Mouli
- Depends-on: DR-501
- OS: any
- Scope: docs, design
- Acceptance: 6 slides max — problem/hook → the game → live numbers → architecture → why Mantle (on-chain commits = trustless reveal) → roadmap. Owner `@Mouli`.
- Notes: Cut #5 — deck optional if the video is strong.

### DR-507 — Submit: DoraHacks + X thread
- Status: pending
- Owner: @Jishnu
- Depends-on: DR-504, DR-505, DR-106
- OS: any
- Scope: submission
- Acceptance: submitted on DoraHacks BUIDL **and** X thread posted with **#MantleAIHackathon** — all four required elements present: pitch + demo video + GitHub + Mantle contract address. Every link tested from an incognito window before calling it done.
- Notes: **Never cut** any of the four required elements.

### DR-508 — Live-demo rehearsals ×2
- Status: pending
- Owner: all hands (@Jishnu drives)
- Depends-on: DR-409, DR-504
- OS: any
- Scope: demo
- Acceptance: two full rehearsals of the live demo including the "judges, you vote now" moment — `@Jishnu` drives, `@Mouli` on screen-share UI, `@Manjeet` narrates the on-chain reveal.

---

## Pre-agreed cut order

When behind, cut top-down — no discussion:

1. DR-309 share-card generator → static image
2. DR-307 suspect heatmap + DR-208 builder landing section
3. DR-203 4th bot personality (Paper Hands)
4. DR-311 leaderboard from live data → seeded data (fool-rate tab stays)
5. DR-506 deck → video only

**Never cut:** DR-304 dossier card + verdict slider · the on-chain stake/reveal/claim loop (DR-101…DR-106) · DR-308 reveal ceremony animation · DR-507's four required submission elements.

## Demo-day killshot

Prep during the buffer hour, use on stage: put two live trade feeds on screen. Ask the judges to vote human-or-bot by show of hands. Reveal on-chain in front of them. If the Nansen judge gets fooled by "The Sleeper," you've won the room — and you should say, calmly: **"That's the product."**

---

## Done

_Done this sprint (blocks flipped in place, newest first):_

- **DR-401** @Jishnu — root README: monorepo architecture + run instructions (PR #6)
- **DR-207** @Prithwish — behavioral tells, pure stats over the trade log (`agents/`, PR #5)
- **DR-503 / DR-501** @Jishnu — demo script + storyboard (`docs/`, PR #4)
- **DR-301** @Mouli — real wagmi wallet on Mantle Sepolia (`web/`, PR #3)
- **DR-205 / DR-202** @Prithwish — trade simulator + feed + websocket stream (`agents/`, PR #2)
- **DR-105 / DR-102 / DR-101** @Manjeet — Arena commit-reveal contracts + 16 tests (`contracts/`, PR #1)

_Bookkeeping: during the sprint, completed blocks are flipped to `done` in place (not physically relocated) so section + owner structure stays stable; a closing sweep can relocate them. DR-103 stays in-progress — reveal shipped, settle blocked on DR-104._

## Blocked

_(empty)_
