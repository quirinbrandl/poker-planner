# Tournament play, corrections and Payments · Review v1

**Throwaway UI prototype, not yet approved.** It asks: how does the host record eliminations, fix the finishing order, handle rebuys and late entry, and get from a derived winner to Payments, reusing the approved cash-game screens?

Decision ticket: [Design tournament play, corrections, and Payments](https://github.com/quirinbrandl/poker-planner/issues/40). It builds on the approved [tournament setup](https://github.com/quirinbrandl/poker-planner/tree/e61c7eee6f2b3318aee99e8f2f6f5d0a8b573481/docs/prototypes/tournament-setup), [cash-game Play](https://github.com/quirinbrandl/poker-planner/tree/36fec5037c1fd878bb2cbdeac673a9cf5a72370b/docs/prototypes/cash-game-play), [results/corrections](https://github.com/quirinbrandl/poker-planner/tree/64553733318a53b37abcb5f0b4c8e2714b964056/docs/prototypes/cash-game-results) and [Payments/lifecycle](https://github.com/quirinbrandl/poker-planner/tree/d005d10b346dd532e4e2f0655d14613408a4a677/docs/prototypes/cash-game-payments) prototypes. No production code, functional specification or implementation-ticket criteria are changed by this branch.

## Run

From this branch's repository root:

```sh
python3 docs/prototypes/tournament-play/serve.py
```

Open <http://127.0.0.1:4192/>. Opening `index.html` directly works offline too. All data is in memory; reload resets it.

URL parameters:

- `variant=B|A|C`: Play layout (also the floating bar, or ← / → keys). B is the recommendation.
- `walk=<scenario>`: jump to a state (also listed in the side panel): `open`, `midway`, `bubble`, `heads`, `winner`, `withdrawn`, `reopenedEntry`, `resultsMid`, `undoAll`, `edit`, `backin`, `forgotten`, `completed`, `completedResults`, `reopened`, `history`.
- `scale=1.5|2`: app text size. `open=<popup>[:<name>]`, `page=` and `name=` open a popup or page for captures.
- `checks=1`: runs `checks.js` and prints the results under the page.

## The question for review: three Play layouts

Same records, same actions; only the Play hierarchy differs. All three keep the approved Blinds / Rebuy / Stack panel and put **+ Rebuy** and **Out** beside every player still in.

- **A · Rows**: the cash-game list. A prize-pool line (“Prize pool EUR 140.00 · 1st 98.00 · 2nd 42.00 ↗”), **Still playing · N**, then **Out · N** with place badges and payouts.
- **B · Standings** (recommended): a prize-pool hero with one rung per paid place (share bar and amount, “Open” until someone finishes there). Then a **Still in · N** card (“Playing for 1st–4th · next out 4th · no payout”), then the unpaid places on a short ladder. When one player is left, the 1st rung shows the winner and the card disappears.
- **C · Field**: a prize-pool hero with one initial per player (filled = still in), player tiles in two columns, and an **Out** rail of place pills.

## Shared design (all layouts)

### Recording an elimination

- **Out** opens **<name> is out?**: “<name> finishes 4th.”, rows Finishing place and Payout (or No payout). The first elimination adds **Late entry · Closes**. With two left it adds **Winner · Alice · EUR 98.00** and “Alice is the last player left and wins.”
- One line, “Buying back in? **Rebuy instead**”, opens the approved rebuy popup instead, so a temporary bust is not recorded as an elimination.
- **Several out in the same hand…** (three or more left) opens **Out in the same hand**: tick the players, then order them with ↑ / ↓ beside their place badges. No shared places. One hint: “Usually whoever started the hand with more chips finishes higher.” **Record 2 eliminations**.
- Eliminations return no chips to the bank.

### Late entry

- **Add player** is available only while nobody is out. With any elimination recorded it shows a lock and “Late entry closed: someone is out.”; tapping it explains **Can’t add a player now**. Undoing every elimination reopens it; undoing some does not.
- The entry and rebuy popups are the approved ones plus one row: **Prize pool EUR 140.00 → EUR 160.00**. Late entry never adds paid places.

### Results and the finishing order

- Status card: **4 still playing** with a `2/5` ring, the names and a progress bar; or **Alice wins ✓ · All 5 eliminations recorded**.
- **Finishing order**: the open places as one line (“1st–4th · Still playing”), then everyone out, best place first, with payout.
- **Calculate Payments…** is primary only with a winner; otherwise unavailable with “Record eliminations until one player is left.” Activating it explains and changes nothing. A derived winner never completes the game.

### Correcting the order

- **Edit order** opens **Finishing order** as a draft (“Changes not saved yet”). Each row has ↑ / ↓ (move one place; the accessible alternative to dragging) and an undo icon. **Add a missed elimination…** asks who and when (“5th · between Felix and David”). Moved rows show “was 5th”; added rows a **missed** tag.
- **Save order…** opens **Save the new order?** listing only what changes: “David 5th → 4th”, “Emma Out · 5th · no payout”, “Winner ~~Alice~~ · none yet”, “Late entry Opens again”. **Cancel** with changes asks **Discard order changes?**.

### Back in the game versus a forgotten rebuy

- An eliminated player's page shows the place, Won / Lost, Payout and contributions, the buy-ins with their mixes, **Add forgotten rebuy** and **Back in the game…**. There is no fresh Rebuy for an eliminated player.
- **Back in the game?** removes the elimination only: “To buy back in, give <name> a rebuy afterwards.” It lists the place shifts, a withdrawn winner and reopened late entry. The player then has **Out…** and **+ Rebuy** again.
- **Add forgotten rebuy** uses the approved forgotten-rebuy flow (simplified picker here) with “<name> stays out · 6th.”. The confirmation adds **Prize pool** and **Payouts** before → after rows and **<name> · Stays out · 6th**. Inventory and reserve warnings are the approved ones.

### Completed, reopen, history

- Payments is approved layout A. Balances add the place badge and read “Payout EUR 98.00” / “No payout” and “Buy-ins EUR x” instead of “Final result”.
- Completed Results is the finishing order read-only. Reopen reads “Places and buy-ins stay. These Payments stop being final.”; the reopened Results shows the approved “Reopened · calculate Payments again” line. Return to Planning clears “N eliminations · N rebuys · all handed-out stacks” and keeps the payout schedule. History uses the approved tournament card.

## Checks run

`checks.js` (39 checks) passed headless at 390px and 320px, at 100% and 200% app text: entry open → closed → still closed after a partial undo → reopened after all undone; late entry keeps two paid places; cancelled popups change nothing; same-hand order is the host's; missed elimination insert and reorder stay a draft until saved, and discarding keeps the saved order; the winner is previewed, derived without completing, and withdrawn after Back in the game; blocked Calculate explains and changes nothing; an eliminated player has no fresh Rebuy; a forgotten rebuy keeps the place and raises pool and payouts (70/30 of EUR 160 → 112.00 / 48.00); leftover cents go to 1st first; Calculate, read-only Completed, Completed menu without Return to Planning, Reopen; and no horizontal overflow in every scenario and layout. Fixture evidence only: the Payments settlement here is a greedy stand-in, not the production solver.
