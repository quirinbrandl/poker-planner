# Cash-game Payments, reopening, history and delete · Approved

**Throwaway UI prototype. The human approved it after Review v1.** It asks: how does a host finish a cash game, read who pays whom, look back at finished games, and Reopen / Return to Planning / Delete without mixing those up or trusting stale Payments?

Decision ticket: [Design Payments, reopening, history, and destructive actions](https://github.com/quirinbrandl/poker-planner/issues/38). It continues the approved [results prototype](https://github.com/quirinbrandl/poker-planner/tree/64553733318a53b37abcb5f0b4c8e2714b964056/docs/prototypes/cash-game-results) (count editor, result confirmation, player page, results status card). Those screens are only stubbed here. No production code, functional specification or implementation-ticket criteria are changed by this branch.

## Resolution

- **Payments layout A · Payment list** is chosen. B (by player) and C (money flow) stay switchable as archived alternatives, not MVP choices.
- The **Calculate Payments?**, **Game actions**, **Reopen**, **Return to Planning**, **Delete** and **History** proposals below are approved as shown (“2: fine”).
- **No “Result confirmed” tag on player rows**, in Play, Results or Completed. The signed Won / Lost amount already shows that a result exists. Rows keep a tag only for open work: **Uncounted**, **Count draft**, or **Correction draft**. This was raised during review and approved (“yeah that sounds good”).

Approved captures: `previews/approved-*.png`. The `review-v1-*` captures are the review history; they still show the dropped tag.

## Run

From this branch's repository root:

```sh
python3 docs/prototypes/cash-game-payments/serve.py
```

Open <http://127.0.0.1:4190/>. It starts on Results with everyone counted; tap **Calculate Payments…**. Opening `index.html` directly works offline too.

URL parameters:

- `variant=A|B|C`: Payments layout (also the floating bar at the bottom, or ← / → keys).
- `fixture=ready|even|two|cents|big|short`: the main game (see below).
- `history=saved|empty`: three earlier finished games, or none.
- `walk=finish|payments|even|history|history-empty|reopen|reset|delete|blocked|details`: jump straight to a state.
- `scale=1.5|2`: app text size.

All data is in memory; reload resets it.

## Payments layout options (A chosen)

Same data, three structures:

- **A · Payment list**: “3 payments · EUR 21.00 in total”, then one card per payment (payer → amount → receiver), then a Balances list (final result, buy-ins, signed balance; tap opens the read-only player page).
- **B · By player**: one card per player in joining order, with their balance and their own lines (“PAY Clara EUR 8.00”, “GET from David EUR 7.00”, “Nothing to pay or get.”). Each payment appears on both people's cards.
- **C · Money flow**: a two-column diagram, PAYS on the left and GETS on the right, ribbons labelled with the amount. Clean at 3 payments, hard to trace at 10 (`fixture=big`). SVG text does not grow with app text size.

## Everything else (approved as proposed)

- **Calculate Payments** stays on Results (approved). Enabled only when everything adds up; otherwise disabled with one reason, and tapping it shows “Can’t calculate Payments yet” and moves focus to the status card. Opens **Calculate Payments?**: “✓ All 6 counted · 1,600 chip units” and “This finishes the game. Results become read-only; you can reopen it later.” **Cancel / Calculate Payments**. While calculating, the button reads “Calculating…”. Success opens **Completed → Payments** with a “✓ Game finished” toast.
- **Payments page** (Completed): context line with created and finished time, Completed badge, tabs **Payments / Results / Game details**, one line “Who pays whom. The app doesn’t track payments.” No algorithm badges, no paid ticks, no editing. All-zero balances show **No payments needed · Everyone broke even.**
- **Completed Results / player page / Game details** are the approved screens, read-only, with allocated cents, and no “Result confirmed” row tag. Game details ends with “Read-only. To change something, reopen the game from ⋯.” In progress it says “Setup is locked. To change it, use ⋯ → Return to Planning.”
- **Game actions (⋯)** is a bottom sheet with one line per item. Completed: **Reopen game…**, **Delete game…**. In progress: **Return to Planning…**, **Delete game…**. Planning: **Delete game…**. Return to Planning is not offered on a Completed game; reopen first.
- **Reopen this game?** “Results and buy-ins stay. These Payments stop being final. Calculate them again when you’re done.” **Cancel / Reopen game**. Goes to In progress → Results with “✓ Game reopened”; the old Payments are gone, not shown as stale. Under Calculate Payments: “Reopened · calculate Payments again when you’re done.” The game leaves History and shows on Games as “Reopened · calculate Payments again →”.
- **Return to Planning?** (destructive, Cancel focused) “Clears: 2 rebuys · 6 results · all handed-out stacks”, “Keeps: 6 players · buy-ins · settings”, “Collect all chips. You’ll hand out new stacks after Start.” **Cancel / Return to Planning**. Goes to the Planning Distribution preview (stub) with “✓ Back in Planning”.
- **Delete this game?** (destructive, Cancel focused) shows the game's phase, mode, names and date, then “Everything recorded in this game is deleted. This can’t be undone.” and “Saved players and chip set templates stay.” **Cancel / Delete game**. Goes back to the list the game lived in (History for Completed, Games otherwise) with “✓ Game deleted”.
- **History**: newest finished first. Each card: mode badge, participant names, “23 Nov 2026 · 19:30–23:41”, then “Buy-ins EUR 160.00 · 3 payments · Top Alice +EUR 13.00” (tournament: “Prize pool · payments · Winner”; all even: “No payments needed”). Opens Payments with **← History**. Empty: “No finished games yet · A game shows up here once you calculate its Payments.” No search or filters.
- **Games** gets a History row (“3 games” / “Empty”) beside Saved players and Chip set templates.

Cancel, Escape and the simulated app restart never apply an action.

## Fixtures

| `fixture` | What it shows |
| --- | --- |
| `ready` | 6 players, 2 rebuys, balances +13 / −8 / +8 / −7 / −6 / 0 → 3 payments (the spec's 8·7·6 vs 13·8 case). |
| `even` | Everyone breaks even → No payments needed. |
| `two` | Alice and Bob, EUR 30 / EUR 10 → Bob pays Alice EUR 10. |
| `cents` | EUR 10.01 buy-in. In progress Results show exact +EUR 2.5025; Payments show the allocated +EUR 2.50. |
| `big` | 12 players, 3 rebuys, 11 nonzero balances → 10 payments. |
| `short` | 1 chip unit missing → Calculate Payments blocked. |

The settlement code is a fixture stand-in (largest-remainder cents, exact minimum for ≤16 nonzero balances, largest-first above that). It is not the production solver.

## Browser checks (Review v1)

Headless Chrome drove: calculate (confirm, cancel, Escape, calculating state, Completed Payments), the 8·7·6 vs 13·8 minimum of 3, Bob → Alice EUR 10, cent allocation, read-only Completed Results/player/details, phase-specific menus, cancelled and confirmed Reopen with all records kept, identical Payments after an unchanged recalculation, a new plan after a simulated correction, cancelled and confirmed Return to Planning (rebuys/results cleared, 6 players kept), cancelled and confirmed Delete (only that game removed, correct destination list), Planning delete, History open with ← History, blocked Calculate, and a restart that replays nothing. No page exceptions. No horizontal overflow and no buttons under 48×48 at 390px/100% and 320px/200% (all three layouts, History, details, menu and every confirmation). Fixture evidence only, not native accessibility or device certification.

Captures are in `previews/` (`review-v1-*.png`; `review-v1-montage-*.png` for overviews).
