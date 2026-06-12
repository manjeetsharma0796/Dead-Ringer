# Dead Ringer — Storyboard & Shot List
**Companion to `docs/demo-script.md`**
**Maps each script beat to the exact screen, component, or asset needed.**

Asset status key:
- `[EXISTS]` — component or page already in `web/src/`
- `[SEED]` — exists but needs specific mock data pre-loaded before capture
- `[RECORD]` — needs a screen recording pass (live animation / streaming data)
- `[FAKE]` — needs a fabricated asset (e.g., an explorer screenshot with specific tx)

---

## Shot 1 — Cold Open (0:00–0:18)
**Beat:** Two anonymous trade feeds, no labels.

| Item | File / Route | Status | Capture notes |
|---|---|---|---|
| Split-screen tape layout | Custom layout: two `<TradeTape>` instances side by side, `compact` prop on, `filterSuspect` pre-set to S#01 left / S#05 right | `[SEED]` | Build a one-off `ColdOpen` page or snapshot the arena tape rail filtered to two suspects. Export as video loop. |
| Left column behavior | `web/src/components/TradeTape.tsx` — S#01 mock data: small size, 4–7s hold pattern | `[SEED]` | Adjust `web/src/lib/suspects.ts` S#01 stats to match; or use a custom seed in a ColdOpen fixture. |
| Right column behavior | Same component, S#05 data: larger size, hesitations, visible re-entry | `[SEED]` | Same approach. Ensure S#05 has `avgHoldMin ≥ 10` and a clearly imperfect P&L series in mock. |
| No labels / no names | CSS: hide the `Susp` column via `compact=true`; hide tape header suspect IDs for this shot | `[SEED]` | Quick className override on the ColdOpen fixture, or record with suspect column hidden via devtools. |

---

## Shot 2 — Landing Page Hero (0:18–0:32)
**Beat:** Full landing page, tagline, noir grid.

| Item | File / Route | Status | Capture notes |
|---|---|---|---|
| Landing page | `web/src/app/page.tsx` → renders `HeroSection`, `LineupSection`, etc. | `[EXISTS]` | Screenshot or record the full hero viewport. Ensure `noir-noise` and `noir-grid` divs are visible (they're in the layout). |
| Hero tagline "CAN YOU SPOT THE MACHINE?" | `web/src/components/landing/HeroSection.tsx` | `[EXISTS]` | Verify this copy is in the component; grab a screenshot at 1280×800. |
| Noir grid pulse animation | `globals.css` — `.noir-grid` class | `[EXISTS]` | Record 3s loop for the background pulse, or use a static screenshot. |

---

## Shot 3 — Arena Page Load (0:32–0:55)
**Beat:** Round strip, dossier grid, live tape rail.

| Item | File / Route | Status | Capture notes |
|---|---|---|---|
| Arena page | `web/src/app/(app)/arena/page.tsx` | `[EXISTS]` | Full-page screenshot at 1440px width to show 2-column grid + tape rail. |
| Round strip data | `web/src/lib/mock.ts` → `ROUND` export | `[SEED]` | Set `ROUND.number = 7`, `closesInSec = 252` (04:12), `pot = 14880`, `detectives = 47`. |
| Suspect count = 6 | `web/src/lib/suspects.ts` → `SUSPECTS` array | `[SEED]` | Confirm length is 6 for the demo. If array has more entries, trim to 6 for recording. *(Note: 6-vs-8 count still open; trim to 6 for now.)* |
| DossierCard grid | `web/src/components/DossierCard.tsx` | `[EXISTS]` | The scramble-alias animation fires on mount; capture at least 2s after load for names to resolve. |
| Tell chips | `web/src/components/ui/TellChip.tsx` | `[EXISTS]` | Confirm each of the 6 suspects has exactly 2 tells in `web/src/lib/suspects.ts`. |
| Tape rail — live | `web/src/components/TradeTape.tsx` | `[RECORD]` | Record 5–8s of the tape ticking for the B-roll overlay. |
| Hover: card highlights tape row | Interaction between `ArenaPage` `hovered` state + TradeTape `onHoverSuspect` | `[RECORD]` | Record hover on a DossierCard; verify tape row flashes. |

---

## Shot 4 — Suspect Drawer (The Sleeper) (0:55–1:12)
**Beat:** SuspectDrawer opens for S#03.

| Item | File / Route | Status | Capture notes |
|---|---|---|---|
| SuspectDrawer component | `web/src/components/SuspectDrawer.tsx` | `[EXISTS]` | Click the folder-open icon on S#03 to trigger. |
| S#03 mock data — "The Sleeper" profile | `web/src/lib/suspects.ts` — S#03 entry | `[SEED]` | Set: `alias: "THE SLEEPER"`, `stats.avgHoldMin: 11`, `stats.winRate: 58`, `isBot: false` (for the reveal surprise), tells: `[{label:"LONG PAUSES",...},{label:"BURST ENTRY",...}]`. P&L series should be flat for hours, then two sharp moves. |
| Drawer animation | SuspectDrawer uses slide-in from right | `[RECORD]` | Record the open animation (~0.25s). |

---

## Shot 5 — Placing Verdicts (1:12–1:42)
**Beat:** Three verdicts set via VerdictSlider.

| Item | File / Route | Status | Capture notes |
|---|---|---|---|
| VerdictSlider — BOT call | `web/src/components/VerdictSlider.tsx` | `[RECORD]` | Drag to +78 (right). Capture: border shifts to bot-white (`--color-bot`), label "BOT · 78%", multiplier "2.0×". |
| VerdictSlider — HUMAN call | Same component, S#02 | `[RECORD]` | Drag to -61. Capture: border shifts to human-orange (`--color-human`), "HUMAN · 61%", "1.5×". |
| VerdictSlider — The Sleeper (S#03) | Same component | `[RECORD]` | Drag slowly: show the neutral dead zone (dashed border), cross threshold to "BOT · 22%", "1.2×". Show the crowd bar reading ~49% BOT. |
| Crowd bar 49% | `VerdictSlider` → `crowdBotPct` prop on S#03 | `[SEED]` | Set `SUSPECTS[2].crowdBotPct = 49` in mock data. |
| DossierCard border color | `DossierCard.tsx` — `borderColor` computed from verdict | `[EXISTS]` | Visible after slider drag; no extra work needed. |

---

## Shot 6 — Lock the Slip (1:42–2:00)
**Beat:** GuessSlip panel, wallet confirm, LOCKED stamps.

| Item | File / Route | Status | Capture notes |
|---|---|---|---|
| GuessSlip panel open | `web/src/components/GuessSlip.tsx` | `[EXISTS]` | Panel is fixed bottom-right. Click header to expand. |
| Three entries visible | GuessSlip renders `Object.values(slip)` | `[SEED]` | Must have verdicts set on S#01, S#02, S#03 before this shot. Stake field: type 500. |
| Projected payout 820 MNT | `projected` calculation in GuessSlip | `[SEED]` | With multipliers 2.0×, 1.5×, 1.2× and stake 500, projected ~= 820. Verify with the formula. |
| Wallet connection | `web/src/components/WalletButton.tsx` | `[SEED]` | Pre-connect a Mantle testnet wallet before recording. The `lockSlip` call checks `wallet.status === "connected"`. |
| Lock confirmation / wallet modal | Native MetaMask or Mantle wallet modal | `[FAKE]` | Record a real testnet approval, or use a mocked wallet that auto-approves for the demo flow. |
| "LOCKED" stamp on DossierCard | `DossierCard.tsx` — `locked && entry` renders diagonal stamp | `[RECORD]` | After lockSlip fires, record all three cards animating the stamp. |

---

## Shot 7 — Judge Live Vote (2:00–2:15)
**Beat:** No screen change. Presenter faces room.

| Item | Status | Capture notes |
|---|---|---|
| Presenter on camera | N/A — live moment | No recording needed. Cut from the locked arena still to presenter wide-shot. |
| Arena locked-state hold | Arena page, all verdicts locked | `[RECORD]` | Freeze-frame or hold the locked arena as the background during the judge moment. |

---

## Shot 8 — The Reveal (2:15–2:38)
**Beat:** `/reveal` page, staggered card animations, S#03 = HUMAN.

| Item | File / Route | Status | Capture notes |
|---|---|---|---|
| Reveal page | `web/src/app/(app)/reveal/page.tsx` | `[EXISTS]` | Navigate from the arena. |
| "Declassifying…" header | `RevealPage` — `<h1>` | `[EXISTS]` | Visible on load. |
| Staggered card reveal animation | `motion.div` with `delay: i * STAGGER (0.6s)` | `[RECORD]` | Record full 3.6s stagger for 6 suspects. This is the cinematic apex — do not cut short. |
| Redaction tear animation | `motion.div scaleX: 1→0` on each card | `[EXISTS]` | Uses Framer Motion; no extra work. Ensure `useReducedMotion()` is NOT active in recording environment (disable OS reduced-motion setting). |
| BOT / HUMAN stamps | `suspect.isBot ? "BOT" : "HUMAN"` with color-coded borders | `[SEED]` | S#01 `isBot: true`, S#02 `isBot: false`, S#03 `isBot: false`. Remaining 3 suspects set consistently. |
| S#03 "HUMAN" — the surprise reveal | Same as above, `isBot: false` on S#03 | `[SEED]` | Critical: The Sleeper must be a human in the mock to land the reveal beat. |
| Score card | Rendered after `totalDelay` | `[EXISTS]` | "2/3 correct · top 34% · +160 MNT." With slip as set: S#01 correct, S#02 correct, S#03 wrong → 2/3. Verify the `winnings` formula gives ~+160. |
| X mark on S#03 entry | `correct ? Check : X` icon | `[EXISTS]` | Auto-renders given the incorrect verdict. |

---

## Shot 9 — On-Chain Settlement (2:38–2:48)
**Beat:** Mantle explorer showing `revealRound` tx.

| Item | Status | Capture notes |
|---|---|---|
| Mantle explorer transaction | `[FAKE]` | This is the one fabricated asset. Screenshot or screen-record the Mantlescan/Mantle explorer showing a `revealRound(7, ...)` transaction. Calldata should show an array of verdicts and a bytes32 salt. Event logs should show MNT transfer events. |
| Explorer URL | `explorer.mantle.xyz` or `mantlescan.xyz` | `[FAKE]` | Use the Mantle testnet explorer with a real test tx if available; otherwise mock a screenshot with realistic calldata. |
| Side-panel layout | Browser split: app left, explorer right | N/A | Arrange manually during recording. No code changes needed. |

---

## Shot 10 — Fool-Rate Leaderboard (2:48–2:55)
**Beat:** `/leaderboard` "Dead Ringers" tab, THE SLEEPER at top.

| Item | File / Route | Status | Capture notes |
|---|---|---|---|
| Leaderboard page | `web/src/app/(app)/leaderboard/page.tsx` | `[EXISTS]` | Navigate to `/leaderboard`. |
| "Dead Ringers" tab | Tab key = "agents" | `[EXISTS]` | Click the "Dead Ringers" tab to switch. |
| Agent table | `makeAgents()` in `web/src/lib/mock.ts` | `[SEED]` | Ensure top row is `{ rank: 1, agent: "THE SLEEPER", builder: "dead-ringer-core", foolRate: 61, roundsSurvived: 7, status: "active" }`. |
| Fool rate column | `a.foolRate` | `[SEED]` | Confirm "61%" renders in top row. |

---

## Shot 11 — Killshot Close (2:55–3:00)
**Beat:** Hold on THE SLEEPER row. Black card.

| Item | Status | Capture notes |
|---|---|---|
| THE SLEEPER leaderboard row | `[SEED]` | Hold the leaderboard frame. No interaction. |
| End card: "DEAD RINGER · BUILT ON MANTLE" | `[FAKE]` | Single static frame: dark background (#141414), Bebas Neue type, Mantle logo or wordmark bottom-right. Can be generated with the same canvas approach as `downloadShareCard` in `RevealPage.tsx`. |

---

## Pre-Recording Checklist

- [ ] Trim `SUSPECTS` array to 6 entries in `web/src/lib/suspects.ts`
- [ ] Set S#03 `alias: "THE SLEEPER"`, `isBot: false`, `stats.avgHoldMin: 11`, `stats.winRate: 58`, `crowdBotPct: 49`, tells: LONG PAUSES + BURST ENTRY
- [ ] Set S#01 `isBot: true` (BOT reveal), S#02 `isBot: false` (HUMAN reveal)
- [ ] Set `ROUND.number = 7`, `closesInSec = 252`, `pot = 14880`, `detectives = 47`
- [ ] Seed `makeAgents()` to return THE SLEEPER first with `foolRate: 61`, `roundsSurvived: 7`
- [ ] Pre-connect Mantle testnet wallet (or configure mock auto-approve wallet)
- [ ] Disable OS "reduce motion" setting before recording reveal animations
- [ ] Fabricate the Mantle explorer screenshot for Shot 9
- [ ] Fabricate the end card for Shot 11
- [ ] Confirm app runs at 1440×900 without layout breaks (the tape rail is `hidden xl:block`)
- [ ] Record the TradeTape B-roll loop (5s) for Shot 1 and Shot 3 overlays
