# Distribution preview, alternative depth, and Start — throwaway interaction prototype

**Status: Review v1 — awaiting human hands-on review and layout/interaction selection.**

Decision: [#35 — Design distribution preview, alternative depth, and Start](https://github.com/quirinbrandl/poker-planner/issues/35).
Parent: [#30 — Wayfinder: MVP user experience and visual design](https://github.com/quirinbrandl/poker-planner/issues/30).
Affected implementation tickets: [#14](https://github.com/quirinbrandl/poker-planner/issues/14), [#15](https://github.com/quirinbrandl/poker-planner/issues/15), [#16](https://github.com/quirinbrandl/poker-planner/issues/16), [#17](https://github.com/quirinbrandl/poker-planner/issues/17).

## Run

Open `index.html` directly offline, or run from the `prototype/distribution-preview-start` worktree root:

```sh
python3 docs/prototypes/distribution-preview-start/serve.py
```

Open:

- **A · Handout cards (recommended):** <http://127.0.0.1:4187/?variant=handout>
- **B · Table ledger:** <http://127.0.0.1:4187/?variant=ledger>
- **C · Visual stack + remaining case:** <http://127.0.0.1:4187/?variant=visual>

Switch variants at any time using the floating bottom bar (`?variant=`) or Left/Right arrow keys. Expand **Review controls, state presets & guided walkthroughs** at the top to jump directly to any state or run the three guided walkthroughs. All state is in memory; reload resets fixtures.

## Three layout variants on `Distribution preview`

1. **A · Handout cards (`?variant=handout`):**
   - **Give each of the N players** card first: shows the identical starting stack mix with approved colored chip symbols, per-player count and chip-unit value, and the **N-player pull total** (`Pull X of Y for N players`) so the host can physically prepare identical stacks without adding a per-player issuance checklist.
   - **Blinds & game terms** card second: Small/Big blind in chip units (explicitly noting when the small blind is rounded down from half the big blind, e.g., `2 / 5 chip units`), Starting stack depth (`100 BB`), Blind-payment coverage (`4 separate SB + 4 separate BB payments per stack`), and—for cash games only—the provisional cash-game valuation (`EUR 20.00 buy-in · EUR 0.10 per chip unit · EUR 0.10 / EUR 0.20 blinds`). Tournaments reuse the same card with no chip-to-money rate.
   - **Unissued bank & chip reserve** card third: states the simultaneous reserve guarantee (`3 additional qualifying stacks guaranteed` or `0 reserved stacks`) and makes clear that reserve and unused chips remain together in one unissued bank for rebuys or late arrivals rather than being prepacked or assigned per player.
2. **B · Table ledger (`?variant=ledger`):**
   - Compact **Blinds & stack summary** strip at the top, followed by a unified **Denomination ledger** (`Denomination` | `1 player` | `All N players` | `Unissued bank`) that reflows vertically at `150%`/`200%` text scaling.
3. **C · Visual stack + remaining case (`?variant=visual`):**
   - Visual **1-player starting stack tray** at the top paired with the approved **fit-to-width open poker-chip case** showing the remaining unissued bank chips still sitting in the case after pulling the N starting stacks, followed by the exact blinds, valuation, and bank facts below.

## Covered states and presets

- `Feasible (100 BB)`: 6 players, EUR 20.00 buy-in, 100 BB, coverage 4, automatic reserve 3.
- `Explicit zero reserve (0 stacks)`: custom 0 reserve unlocks 100 BB on a tighter set and explicitly states that 0 additional stacks are reserved.
- `Alternative depth (98 BB vs 100 BB)` and `Closer higher depth (101 BB vs 98 BB)`: explains why requested 100 BB failed, offers the nearest feasible whole-BB depth for explicit acceptance (`Accept 98 BB`), blocks `Start game` until accepted, supports `Withdraw acceptance`, and preserves `100 BB` while clearing stale acceptance when any setup input is edited.
- `Rounded small blind (2 / 5)`: shows explicit small-blind rounding when half the big blind is not representable or fails coverage.
- `No valid distribution` presets:
  - `No valid: Simultaneous reserve`
  - `No valid: Blind-paying chips`
  - `No valid: Total chip value`
  - `No valid: Unsuitable denominations`
  Each explains the physical bottleneck in plain language and provides direct `Edit chip set`, `Edit game settings`, and `Edit players` buttons using `Return to preview`.
- `Incomplete setup`: blocks preview/Start and links directly to the step needing attention.
- `Tournament mode (no chip money value)`: reuses the shared preview layout while omitting chip-to-money rates.
- `Started (In progress lock)`: shows the `Start cash game?` confirmation and transitions to locked `Play` and `Game details` with the `Return to Planning` explanation.
