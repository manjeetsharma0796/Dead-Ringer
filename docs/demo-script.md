# Dead Ringer — 3-Minute Demo Script
**Mantle AI Hackathon · Consumer & Viral DApps track**
**Total runtime: 3:00 hard stop**

---

## Beat 0 — Cold Open (0:00–0:18)

**Screen:** Full-bleed live trade tape, two columns side by side. No labels, no names — just raw ticks. Left column: a burst of small MNT-ETH positions, tight entry windows, exits after 4–7 seconds. Right column: larger size, longer holds, a few hesitations, one clear re-entry mistake.

**Voice-over:**
> "Two traders. Real price feeds. Real positions, settled on-chain. One of them is an algorithm. The other is a person — probably sweating right now."

*Pause two beats.*

> "Which one?"

---

## Beat 1 — The Problem Statement (0:18–0:32)

**Screen:** Cut to the Dead Ringer landing page hero. Tagline visible: "CAN YOU SPOT THE MACHINE?" The noir-grid background pulses. No interaction — just the frame.

**Voice-over:**
> "The Turing test has always been a parlor game. We put it on-chain, with money on the line. This is Dead Ringer — a spot-the-bot game where every verdict is staked, every identity is committed to Mantle before the round opens, and the reveal is a smart-contract event — not our word against anyone's."

---

## Beat 2 — Enter the Arena (0:32–0:55)

**Screen:** Click "Enter the Arena." The `/arena` page loads. The round strip at top shows: **Round 7 · closes 04:12 · pot 14,880 MNT · 47 detectives · 6 suspects.** *(Note: 6-vs-8 suspect count still open; 6 used here, may change before mainnet.)*

The dossier grid fills: six cards — each showing a codename, an alias scramble animation resolving to something like "PHANTOM QUANT," a 24h P&L sparkline, four stats (TRD/24H, WIN %, HOLD, MAXDD), and two "tell" chips below the chart.

**Voice-over:**
> "Six suspects per round — four bots, two humans — all trading anonymously against Chainlink price feeds on Mantle. Each suspect is a card. The sparkline is their last 24 hours. The tell chips are behavioral flags our system flagged. The crowd bar at the bottom of each slider shows how everyone else is voting, in real time."

*Hover over a dossier card. The border lights up. The TradeTape rail on the right highlights that suspect's rows.*

> "The live tape on the right is streaming every paper trade as it lands. Hover a card, the tape filters to that suspect."

---

## Beat 3 — Open a Dossier (0:55–1:12)

**Screen:** Click the folder-open icon on **S#03 "THE SLEEPER."** The SuspectDrawer slides in from the right. Shown: full P&L series, expanded stats table, all tells, hold-time histogram.

**Voice-over:**
> "S#03 — we named this one The Sleeper. It does almost nothing for hours, then places two or three trades inside a thirty-second window and goes quiet. Win rate: 58%. Average hold: 11 minutes. Looks like a cautious human. It is not."

*Close the drawer.*

---

## Beat 4 — Place Verdicts (1:12–1:42)

**Screen:** Back to the arena grid. Drag the verdict slider on S#01 hard right toward BOT — border shifts to bot-white, confidence reads "BOT · 78%," multiplier badge shows "2.0×." Do the same for S#02 left toward HUMAN — border shifts to human-orange, "HUMAN · 61%," "1.5×." For S#03 (The Sleeper), drag it slowly — past neutral, hover over "BOT · 45%", and then pull it back to just barely cross the threshold. Leave it at "BOT · 22%," multiplier "1.2×."

The crowd bar under S#03 reads: **49% say BOT.**

**Voice-over:**
> "The verdict slider goes left for human, right for bot. Distance past the neutral zone sets your conviction — and your multiplier. Higher confidence, bigger payout if you're right, bigger loss if you're not. S#03 has the crowd split almost perfectly at 49–51. That's The Sleeper doing its job."

*Pause.*

> "I'll call it bot — barely."

---

## Beat 5 — Lock the Slip (1:42–2:00)

**Screen:** The Guess Slip panel (bottom-right) is open. It shows three entries: S#01 BOT 78% · 2.0×, S#02 HUMAN 61% · 1.5×, S#03 BOT 22% · 1.2×. Total stake field shows 500 MNT. Projected payout: 820 MNT. Click "Lock verdicts (3)."

A wallet confirmation dialog appears (mock MetaMask / Mantle wallet). Approve. The three cards in the grid each stamp a diagonal "LOCKED" badge in orange. The slip header reads "Locked."

**Voice-over:**
> "Three verdicts, 500 MNT staked. The slip goes on-chain as a commit: a hash of your verdicts and a salt — Mantle settles it, not us. Until the round closes and the reveal fires, nobody — including us — can see what you called."

---

## Beat 6 — Judges Vote Live (2:00–2:15)

**Screen:** Freeze on the locked arena. Presenter steps back and addresses the room.

**Voice-over / Presenter (live, to the judges):**
> "Before we hit reveal — judges, show of hands. Crowd vote. S#03, The Sleeper: human or bot? Raise your hand if you think it's human."

*[Pause for hands. Read the room. Note the count aloud.]*

> "Okay. Keep that in mind."

---

## Beat 7 — The Reveal (2:15–2:38)

**Screen:** Navigate to `/reveal`. The "Declassifying…" header. Six cards animate in one by one at 0.6-second stagger. For each, the redaction bar sweeps left and tears away, exposing either **BOT** (white border) or **HUMAN** (orange border), with a slight rotation.

S#01 — BOT. S#02 — HUMAN. S#03 — **HUMAN.**

The S#03 card shows: check on S#01 ✓, check on S#02 ✓, X on S#03. Score card fades in below: **2/3 correct · top 34% of detectives · net: +160 MNT.**

**Voice-over:**
> "S#01: bot. Correct. S#02: human. Correct. S#03 — The Sleeper — human."

*Let it land.*

> "I called it wrong. The crowd called it wrong. 49–51, and the 51% were right."

---

## Beat 8 — On-Chain Settlement (2:38–2:48)

**Screen:** Open the Mantle explorer in a side panel. Show a real transaction: `revealRound(7, ...)` with the verdicts array and salt in calldata. Settlement receipts listed beneath — MNT transfers to correct callers visible in the event log.

**Voice-over:**
> "Settlement happens on-chain the moment the reveal transaction confirms. No house, no custody. The contract holds the pot and distributes by correctness × confidence multiplier."

---

## Beat 9 — Fool-Rate Leaderboard (2:48–2:55)

**Screen:** Navigate to `/leaderboard`, click the "Dead Ringers" tab. Table visible: columns Agent, Builder, Fool Rate, Rounds Survived, Status. Top row: **THE SLEEPER · 61% fooled · 7 rounds survived · active.**

**Voice-over:**
> "The Leaderboard tab tracks the bots, not the players. The Sleeper has fooled 61% of detectives across seven rounds. That's the score we care about."

---

## Beat 10 — Killshot Close (2:55–3:00)

**Screen:** Hold on THE SLEEPER row. No transition.

**Presenter (directly to the judges who voted "human"):**
> "For everyone who just raised their hand — that's the product."

*Hard cut to black. "DEAD RINGER · BUILT ON MANTLE" in mono type.*

---

## Notes for Recording

- Round countdown should read something in the 4–6 minute range during the demo — pre-seed the mock or use the countdown fixture.
- The wallet connect interaction at Beat 5 should use a pre-approved Mantle testnet wallet to avoid MetaMask friction mid-demo.
- Beat 6 (live judge vote) is improvised — no screen change. Keep it tight; 15 seconds max.
- The S#03 "HUMAN" reveal beat at 2:28 is the emotional apex. Do not rush past it.
- Total time budget: Beat 0–1: 32s · Beat 2–3: 40s · Beat 4–5: 48s · Beat 6: 15s · Beat 7–8: 33s · Beat 9–10: 12s = 180s.
