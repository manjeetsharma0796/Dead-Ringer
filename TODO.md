# DEAD RINGER — 24-Hour Hackathon Sprint Plan

Goal: a working, demo-able MVP — one arena round end-to-end (watch → verdict → stake → reveal → payout) — plus a landing page, demo video, and submission. Built to win, which means: **one flawless loop beats ten half-features.**

Team of 4 — named owners: **Manjeet = Smart Contracts/Chain** · **Mouli = Frontend/UI** · **Prithwish = Backend/Agents** · **Jishnu = Production Build** (integration, environments/deploys, demo video & submission).

---

## GROUND RULES (read once, obey all day)

- [ ] Everything runs on **Mantle Sepolia testnet**. No mainnet heroics.
- [ ] Trades are **paper trades against real price feeds** — no actual DEX swaps. The bet/reveal layer is the real product; judges won't care that trading is simulated.
- [ ] Mock first, wire later. Frontend never waits on contracts — build against fake data, swap in real calls at integration hour.
- [ ] Scope cuts are pre-decided (see ✂️ items). When behind schedule, cut without discussion.
- [ ] Commit every 30–45 min. Working `main` branch at all times — judges may check the repo.

---

## HOUR 0–1 · KICKOFF (all hands)

- [ ] All: lock the demo script FIRST (write the 3-min story you'll tell, then build only what it needs)
- [ ] Jishnu: repo setup — monorepo (`/contracts`, `/web`, `/agents`), README skeleton with the one-liner
- [ ] Jishnu: get Mantle Sepolia RPC + faucet MNT into 4 wallets
- [ ] Prithwish: claim hackathon computing credits (Z.AI / Nansen / etc.) — apply now, approval takes time
- [ ] All: decide final round parameters — 6 suspects (4 bots, 2 humans), 1 demo round, MNT-denominated stakes

## HOUR 1–6 · PARALLEL BUILD, PHASE 1

### MANJEET — Smart Contracts (the trust layer)
- [ ] `Arena.sol`: round lifecycle (open → locked → revealed), suspect registry with `identityCommit = keccak256(isHuman, salt)`
- [ ] Staking: `placeVerdicts(roundId, suspectIds[], verdicts[], confidences[])` payable in MNT, one tx for the whole slip
- [ ] Reveal: `reveal(suspectId, isHuman, salt)` verifies against commit; `settle()` computes payouts pro-rata by correct verdicts × confidence multiplier
- [ ] `claim()` for winners + a simple house-edge skim (story point: protocol revenue)
- [ ] Hardhat/Foundry tests for the happy path ONLY (commit→stake→reveal→claim)
- [ ] Deploy to Mantle Sepolia, save addresses + verify on explorer — **submission requires the contract address**

### MOULI — Frontend / UI (use the master UI prompt from earlier)
- [ ] Scaffold Next.js + Tailwind + Framer Motion + wagmi/viem (Mantle Sepolia chain config)
- [ ] Design tokens from the prompt (dark evidence-room palette, mono for data, zero gradients)
- [ ] Build against `mockData.ts`: 6 suspects, streaming fake trades, countdown
- [ ] **Dossier card** (the hero component): codename stamp, sparkline, 3 behavioral tells, HUMAN↔BOT verdict slider with live multiplier
- [ ] Arena page: card grid + live trade tape + round status rail

### PRITHWISH — Backend + Agents
- [ ] Trade simulator service: real price feed (CoinGecko/Bybit ticker) + paper-trade engine, positions per suspect, writes a trade log (Postgres/Supabase or even JSON + websocket)
- [ ] 4 bot personalities with distinct fingerprints:
  - [ ] "The Quant" — metronomic intervals, tight stop-losses, trades at exact round numbers
  - [ ] "The Degen" — LLM-driven (Z.AI credits): FOMO entries, revenge trades, oversized positions
  - [ ] "The Sleeper" — mimics human sleep cycle, sloppy timing, occasional fat-finger + immediate correction (the one designed to fool people)
  - [ ] "Paper Hands" — sells every dip, buys every pump, painfully human-looking ✂️ cut to 3 bots if behind
- [ ] 2 human slots: Jishnu + one more teammate place manual paper trades via a tiny admin page (do this in spare moments all day — real human noise is your secret sauce)
- [ ] Websocket/polling endpoint streaming trades to the frontend

### JISHNU — Production Build, Phase 1
- [ ] CI + environments: Vercel project for `/web`, hosting for Prithwish's backend (Railway/Render/Fly), env-var management
- [ ] Wallet + chain ops: faucet MNT into all 4 wallets, RPC keys, contract-verification setup for Manjeet
- [ ] Freeze and document the integration contract early: API shapes, websocket event names, ABI export pipeline from contracts → web
- [ ] Start the human paper-trading slot (Prithwish's admin page) — trade casually all day
- [ ] Begin the demo storyboard doc (shot list for the 3-min video)

## HOUR 6–7 · CHECKPOINT 1 (all hands, 30 min max)

- [ ] Demo each piece raw. Kill anything not on the critical path.
- [ ] Agree the exact integration contract: API shapes, event names, contract ABI frozen from here.

## HOUR 7–12 · PARALLEL BUILD, PHASE 2

### MANJEET
- [ ] Crowd-sentiment view function (per-suspect % bot votes) for the UI
- [ ] Settlement edge cases: nobody correct → rollover; ties → split
- [ ] Scripted round-runner: one command opens round, registers commits, later reveals (Jishnu runs this live in the demo)

### MOULI
- [ ] Guess slip (docked panel / mobile bottom sheet): collected verdicts, stake input, projected payout, `Lock verdicts` → wagmi tx
- [ ] Suspect detail drawer: trade history table, activity heatmap, crowd sentiment bar ✂️ heatmap if behind
- [ ] **Reveal ceremony page**: staggered redaction-tear animation → HUMAN/BOT stamps → score card. This is the demo climax — make it perfect.
- [ ] Share-card generator (html-to-image) "4/6 · Top 8% Detective" ✂️ static mock if behind

### PRITHWISH
- [ ] Wire bots to live simulator; let them run continuously from now (judges love a feed with real history depth)
- [ ] Behavioral-tells computation (avg hold time, active hours, panic-sell count) served per suspect
- [ ] Landing page content pass with Mouli: hero, live two-feed teaser, how-it-works, builder section ✂️ builder section if behind

### JISHNU — Phase 2
- [ ] Staging deploys live for web + backend; testnet contracts wired into staging env vars
- [ ] Write the integration test script for Hour 12 (the exact click-path of the full round)
- [ ] Keep human paper-trades flowing; recruit 1–2 outside friends as extra human traders

## HOUR 12–16 · INTEGRATION (led by Jishnu, all hands on call)

- [ ] Mouli: frontend swaps mocks → real websocket feed + real contract reads/writes
- [ ] Jishnu: full dry run on testnet — open round → 3 wallets place slips → lock → reveal → claim. Fix until this loop is bulletproof. (Manjeet on contract bugs, Prithwish on feed bugs)
- [ ] Mouli + Prithwish: leaderboard page (Detectives + Dead Ringers/fool-rate tabs) from real round data ✂️ hardcode plausible data if behind — but the fool-rate tab must exist, it's the inverted-Turing-test story
- [ ] Mouli: mobile pass on the 3 demo-critical screens (arena, slip, reveal)

## HOUR 16–17 · CHECKPOINT 2 — FEATURE FREEZE

- [ ] Nothing new after this. Bugs, polish, and story only.

## HOUR 17–20 · POLISH + SEED

- [ ] Prithwish: seed a juicy demo round — 12+ hours of accumulated bot/human trade history visible in feeds
- [ ] Mouli: loading skeletons, empty states, error toasts on the demo path
- [ ] Mouli: landing page final polish — first impression for judges browsing submissions
- [ ] Jishnu: run one REAL round with friends/other hackers in Discord; screenshot their guesses and accuracy (live-user proof = community-vote ammo, there's $17K in community prizes)
- [ ] Jishnu: capture the "detection accuracy: 54% — barely better than a coin flip" stat if it emerges; that's your headline number
- [ ] Manjeet: contract addresses verified on explorer, NatSpec comments tidy (judges read contracts)

## HOUR 20–23 · DEMO + SUBMISSION PACKAGE (owned by Jishnu)

- [ ] Jishnu: **3-min demo video** — cold open on two anonymous feeds → "one is human, which?" → place verdicts → live reveal ceremony → payout on-chain → fool-rate leaderboard → close with the line "we didn't build an agent that trades well — we built ones that trade *believably*, and put the Turing test on-chain."
- [ ] Jishnu + Manjeet: README — pitch, architecture diagram, contract addresses, how-to-run, track (Consumer & Viral DApps), partner tech used (Mantle, Z.AI, Bybit feed, Nansen if used)
- [ ] Mouli: pitch deck, 6 slides max: problem/hook → the game → live numbers → architecture → why Mantle (on-chain commits = trustless reveal) → roadmap ✂️ deck optional if video is strong
- [ ] Jishnu: submit on DoraHacks BUIDL **and** post the X thread with **#MantleAIHackathon** (pitch + demo video + GitHub + Mantle contract address — all four are required)
- [ ] Jishnu: test every link in the submission from an incognito window

## HOUR 23–24 · BUFFER + LIVE-DEMO REHEARSAL

- [ ] Two full rehearsals of the live demo, including the "judges, you vote now" moment (Jishnu drives, Mouli on screen-share UI, Manjeet narrates the on-chain reveal)
- [ ] Jishnu: backup plan — screen-recording of the full loop in case wifi/testnet dies on stage
- [ ] Jishnu: production deploy on Vercel, custom domain if available, final smoke test

---

## DEMO-DAY KILLSHOT (prep tonight, use on stage)

Put two live trade feeds on screen. Ask the judges to vote human-or-bot by show of hands. Reveal on-chain in front of them. If the Nansen judge gets fooled by "The Sleeper," you've won the room — and you should say, calmly: "That's the product."

## PRE-AGREED CUT ORDER (when behind, cut top-down)
1. Share-card generator → static image
2. Suspect heatmap + builder landing section
3. 4th bot personality
4. Leaderboard from live data → seeded data
5. Deck → video only

**Never cut:** dossier card + verdict slider, on-chain stake/reveal/claim loop, reveal ceremony animation, the X-thread submission requirements.