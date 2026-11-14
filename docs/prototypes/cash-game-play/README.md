# Cash-game Play · Review v2

**Throwaway, unapproved, fixture-only prototype.** This asks which Play hierarchy makes rebuys, late entry and player status understandable at the table. It does not implement the app or approve the later result/correction/Payments editors.

## Run

From this branch's repository root:

```sh
python3 docs/prototypes/cash-game-play/serve.py
```

Open <http://127.0.0.1:4188/?review=v2&variant=A> or <http://127.0.0.1:4188/?review=v2&variant=D>. No packages, build, network or persistence. `index.html` also opens directly offline. Reload resets the fixture; the interruption review button simulates leaving without accepting an action.

## Compare

- **A · Refined rows:** the human's preferred starting point, now with a large three-part Blinds / Rebuy / Stack panel, direct Result (or Resume) beside each Rebuy, and signed provisional win/loss on confirmed-result rows.
- **D · Spotlight:** a deliberately bolder editorial direction: oversized Play typography, a high-contrast Lavender blind display with diagonal light planes, asymmetric player plaques, stronger action contrast and prominent result amounts. It keeps the same terms, status, money and action rules—no casino imagery, timer, hand tracking or decorative poker motifs.
- **B · Player cards** and **C · Action hub** remain earlier layout explorations in the dropdown. C was **not** selected; the human retracted the accidental messages before providing feedback favoring A.

The floating arrows compare **A ↔ D**. Switching preserves fixture records. Prototype controls expose independent histories, text scaling and a live record/inventory inspector. Scenarios are review controls, not MVP settings.

## Feedback incorporated, not final approval

The human asked to see how much a player won/lost when opening a confirmed result and directly in the Play overview; preferred A while asking for more prominent blinds/rebuy/stack terms, a result-entry shortcut beside Rebuy, and at least one more extravagant visual alternative. Review v2 implements those requests for comparison. The whole ticket is still open, and the issuance-review treatment and final visual selection remain unapproved.

Confirmed-result detail leads with **Won / Lost / Break-even · provisional**, a signed EUR amount, and the arithmetic: confirmed chip value minus **all** initial/rebuy contributions. The example Alice has EUR 25 of final chips and EUR 20 contributed, so her provisional win is **+EUR 5**, not EUR 25. These are provisional player balances, not final rounded Payments or money-transfer receipts. Active/uncounted players have no invented profit/loss amount. Opening a result or using the new result-entry shortcut never confirms anything or changes bank inventory.

## Fixture facts and boundaries

Six initial players receive `[15, 2, 3, 1, 0]` chips of denominations `[1, 5, 25, 100, 500]`: exactly 200 units each. Buy-in/rebuy is EUR 20, blinds 1 / 2, depth 100 BB, coverage 4, preference Fewer chips. Alice's confirmed final result is `[15, 2, 5, 1, 0]` (250 units, provisional EUR 25 chip value); Clara has an unconfirmed count draft. There are no live stack estimates.

The normal bank is `[45, 12, 11, 6, 1]` after Alice's return and Ben's first rebuy. Configured physical quantities are `[135, 24, 27, 12, 1]`. The initial unissued bank can simultaneously cover the started target of 3 stacks; one rebuy consumes a reserve unit, a chip return does not replenish it.

Reduced/zero/impossible scenarios extend the same history with actual historical mixes. The exact-mix search is deliberately bounded to this one 200-unit, 1 / 2-blind example, for which coverage is `floor(number of 1-unit chips / 3)`, capped at 4. The mix ranking seeks full coverage first, then best available reduced coverage, then fewest chips and smaller-denomination ties. Simultaneous reserve checks protect remaining capacity in these fixtures. This is not reusable solver code or evidence of general production allocation correctness.

- **Reduced:** two more historical rebuys leave ten 1-unit chips; the best exact mix covers 3 of 4 payments of each blind.
- **Zero:** an accepted 3-of-4 mix leaves only larger denominations; an exact 2×100 stack has coverage 0.
- **Impossible:** a further zero-coverage rebuy leaves only 180 units in usable denominations plus one indivisible 500-unit chip. Total bank value 680 is not enough to prove an exact 200-unit allocation.
- **Shortage:** the same history with no configured 500-unit chip leaves only 180 units total.
- **Exhausted / zero target:** feasible qualifying stacks remain allowed; reserve is not a rebuy limit.
- **Mixed confirmed results:** Alice's 250 units show +EUR 5; Felix's 150 units show −EUR 5. Felix's confirmed mix `[15, 2, 1, 1, 0]` is returned once to the bank; other records remain unchanged.
- **Break-even:** Alice returns the original 200-unit mix; bank inventory is adjusted by replacing her prior return. Her provisional balance is EUR 0, still explicitly confirmed—not an untouched zero result.

Entry selection is staged. Saving a reusable name is explicit and separate from adding a game participant; a failed allocation adds neither participant nor contribution. New requests show the actual proposed mix; historical corrections are separate labelled handoffs. Confirmed-result players cannot issue a fresh rebuy; Return to play leads to explicit result removal without clearing anything here.

`Results`, count entry, result removal, historical correction, completion and deletion deliberately mark the seam to later decisions. Setup is readable and locked; the reset popup reuses the previously approved destructive boundary. No payment collection, bank exchange, partial withdrawal or hand-tracking controls are introduced.

## Browser review evidence

Review v1's headless Chrome checks exercised full/reduced/zero-coverage acceptance and decline; qualifying requests after exhausted/zero reserve; exact-mix and total-value failure; blocked late-entry fallback; atomic successful entry; confirmed-result participation blocking; duplicate reusable names and dirty-name dismissal; pending-proposal interruption; cancelled reset and modal focus restoration. Review v2 repeats those checks and additionally checks direct Result/Resume routing, signed win/loss/break-even amounts in overview/detail, deduction of all contributions, no balances for active players, and A ↔ D switching. Native VoiceOver/TalkBack and durable persistence remain implementation work, not certified by this prototype.

All four available layouts and the checked Play/Results/locked details/bank/selection/player-detail/stack-review screens passed at 320px and 390px with 100% and 200% app text: no measured horizontal overflow, checked screen buttons at least 48×48px, and no page exceptions. Direct offline opening of Spotlight also passed.

Latest captured screens use the `previews/review-v2-` prefix, particularly `play-A.png`, `play-D.png`, `mixed-results-A.png`, `mixed-results-D.png`, and the won/lost detail screens. Unprefixed captures belong to Review v1. The floating prototype switcher is hidden in captures, not part of the proposed app.

## Human decision still required

No variant or workflow is approved. Compare action placement and information density, then review accepted/declined/blocked proposals, late entry and explicit result-removal routing before updating implementation requirements.
