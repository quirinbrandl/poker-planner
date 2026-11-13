# Cash-game Play · Review v1

**Throwaway, unapproved, fixture-only prototype.** This asks which Play hierarchy makes rebuys, late entry and player status understandable at the table. It does not implement the app or approve the later result/correction/Payments editors.

## Run

From this branch's repository root:

```sh
python3 docs/prototypes/cash-game-play/serve.py
```

Open <http://127.0.0.1:4188/?variant=A>. No packages, build, network or persistence. `index.html` also opens directly offline. Reload resets the fixture; the interruption review button simulates leaving without accepting an action.

## Compare

- **A · Quick rows:** compact active roster, inline Rebuy, player details for count entry; terms/reserve at a glance.
- **B · Player cards:** prominent table summary, larger per-player cards with Rebuy and Count chips directly exposed.
- **C · Action hub:** large task entry points, select a player afterward, compact informational roster; bank/reserve on demand.

Use the floating arrows or `?variant=A`, `B`, `C`. Switching preserves fixture records. Prototype controls expose independent histories, text scaling and a live record/inventory inspector. Scenarios are review controls, not MVP settings.

## Fixture facts and boundaries

Six initial players receive `[15, 2, 3, 1, 0]` chips of denominations `[1, 5, 25, 100, 500]`: exactly 200 units each. Buy-in/rebuy is EUR 20, blinds 1 / 2, depth 100 BB, coverage 4, preference Fewer chips. Alice's confirmed final result is `[15, 2, 5, 1, 0]` (250 units, provisional EUR 25 chip value); Clara has an unconfirmed count draft. There are no live stack estimates.

The normal bank is `[45, 12, 11, 6, 1]` after Alice's return and Ben's first rebuy. Configured physical quantities are `[135, 24, 27, 12, 1]`. The initial unissued bank can simultaneously cover the started target of 3 stacks; one rebuy consumes a reserve unit, a chip return does not replenish it.

Reduced/zero/impossible scenarios extend the same history with actual historical mixes. The exact-mix search is deliberately bounded to this one 200-unit, 1 / 2-blind example, for which coverage is `floor(number of 1-unit chips / 3)`, capped at 4. The mix ranking seeks full coverage first, then best available reduced coverage, then fewest chips and smaller-denomination ties. Simultaneous reserve checks protect remaining capacity in these fixtures. This is not reusable solver code or evidence of general production allocation correctness.

- **Reduced:** two more historical rebuys leave ten 1-unit chips; the best exact mix covers 3 of 4 payments of each blind.
- **Zero:** an accepted 3-of-4 mix leaves only larger denominations; an exact 2×100 stack has coverage 0.
- **Impossible:** a further zero-coverage rebuy leaves only 180 units in usable denominations plus one indivisible 500-unit chip. Total bank value 680 is not enough to prove an exact 200-unit allocation.
- **Shortage:** the same history with no configured 500-unit chip leaves only 180 units total.
- **Exhausted / zero target:** feasible qualifying stacks remain allowed; reserve is not a rebuy limit.

Entry selection is staged. Saving a reusable name is explicit and separate from adding a game participant; a failed allocation adds neither participant nor contribution. New requests show the actual proposed mix; historical corrections are separate labelled handoffs. Confirmed-result players cannot issue a fresh rebuy; Return to play leads to explicit result removal without clearing anything here.

`Results`, count entry, result removal, historical correction, completion and deletion deliberately mark the seam to later decisions. Setup is readable and locked; the reset popup reuses the previously approved destructive boundary. No payment collection, bank exchange, partial withdrawal or hand-tracking controls are introduced.

## Browser review evidence

Headless Chrome checks exercised full/reduced/zero-coverage acceptance and decline; qualifying requests after exhausted/zero reserve; exact-mix and total-value failure; blocked late-entry fallback; atomic successful entry; confirmed-result participation blocking; duplicate reusable names and dirty-name dismissal; pending-proposal interruption; cancelled reset and modal focus restoration. All three layouts, Play/Results/locked details/bank/player selection and stack review were checked at 320px and 390px with 100% and 200% app text: no measured horizontal overflow, checked screen buttons at least 48×48px, and no page exceptions. Direct offline HTML opening also passed. These are prototype checks, not native VoiceOver/TalkBack or durable persistence verification.

Captured screens are in `previews/`: `play-A.png`, `play-B.png`, `play-C.png`, `rebuy-full.png`, `rebuy-reduced.png`, `rebuy-zero.png`, blocked allocation/entry states, accepted entry, confirmed player, bank/reserve and locked details. The floating prototype switcher is hidden in captures, not part of the proposed app.

## Human decision still required

No variant or workflow is approved. Compare action placement and information density, then review accepted/declined/blocked proposals, late entry and explicit result-removal routing before updating implementation requirements.
