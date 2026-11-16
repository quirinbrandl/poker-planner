# Cash-game results & correction recovery · Review v2

**Throwaway, unapproved UI prototype.** It asks: how can the host count final chips, inspect/correct actual records, and recover from dependent inventory without confusing a draft, confirmed result, physical chip movement, or final Payments?

Decision ticket: [Design cash-game result entry and correction recovery](https://github.com/quirinbrandl/poker-planner/issues/37). The ticket remains open for live human review. Neither these proposed UI choices nor the earlier questionnaire have been approved. No production code, functional specification, or implementation-ticket acceptance criteria are changed by this branch.

## Run

From this branch's repository root:

```sh
python3 docs/prototypes/cash-game-results/serve.py
```

Open <http://127.0.0.1:4189/?variant=A&walk=count>.

For the latest requested refinement, open <http://127.0.0.1:4189/?variant=B&walk=count&review=v2>.

No packages or build. `index.html` also opens directly offline. All state is in memory: reload resets it. The interruption control simulates retaining accepted records and count drafts, without replaying a pending acceptance. It does not demonstrate durable production storage.

## Three concrete alternatives

The approved **A · Refined rows** Play workspace and Current/Lavender foundation are preserved. Only the count-entry treatment varies:

| Treatment | Structure | Try it |
| --- | --- | --- |
| **A · Count sheet** | Full screen, all denomination quantities visible together, followed by the live units/money summary and review. | <http://127.0.0.1:4189/?variant=A&walk=count> |
| **B · One denomination** | One large denomination/quantity at a time, explicit ±1 controls, Previous/Next and direct denomination navigation. Totals and final review remain separate. | <http://127.0.0.1:4189/?variant=B&walk=count> |
| **C · Count popup** | Scrollable count dialog over the unchanged Play workspace; the same complete denomination list and confirmation boundary. | <http://127.0.0.1:4189/?variant=C&walk=count> |

Use the floating comparison arrows, or the dropdown in **Prototype controls & scenarios**. In a modal the same comparison bar sits at the end of its scrollable content so the native modal does not make it inert or cover the actual actions. Switching treatments retains raw draft quantities and cancels a pending confirmation; it never confirms a result. Left/right keys switch outside editable fields/modals.

Screens: [Count sheet](previews/count-A.png), [one denomination](previews/count-B.png), [count popup](previews/count-C.png).

## Review v2 · Chip-image denomination buttons

The human found B's text labels such as `5 · —` awkward for unentered quantities and requested chip images instead of repeating denomination values as separate numbers. B now uses the configured chip image, with its value on the face and its color, as the denomination selector. A short caption underneath says **Not counted**, **0 chips**, or the entered quantity; invalid text gives **Check entry** while the raw input stays available in the editor. No dash or duplicate denomination number is used outside the image.

The selected chip has a checkmark as well as the border/tint. Accessible button names retain the exact denomination, color name and count/status, so identifying the chip does not depend on color alone. Typing updates the caption without removing the chip image. The picker reflows at larger text sizes and keeps 48×48 minimum targets. Switching chips still only navigates the draft; it never confirms a result or turns blanks into zeroes.

This is a requested refinement for review, not final approval of B or the whole ticket. A/C, accounting, confirmation, historical correction and recovery behavior are unchanged. Screens: [partial/unentered quantities](previews/review-v2-picker-partial.png), [zero versus uncounted](previews/review-v2-picker-zero.png), [entered quantities](previews/review-v2-picker-entered.png), [narrow screen at 200% text](previews/review-v2-picker-large-text.png). The earlier `count-B.png` preserves the v1 text-button comparison.

V2 browser checks passed chip-image retention during typing, live blank/zero/entered/invalid captions, selected/accessibility labels, unchanged records on navigation, cancelled review/raw retention, 320px/390px at 100%/200% text without measured horizontal overflow, and picker targets at least 48×48px. The previous count/correction/history/recovery smoke checks also passed again without overwriting the archived v1 captures.

## Proposed workflow defaults—not decisions

- Blank is uncounted, not zero. **Set remaining quantities to zero** explicitly fills only blank quantities, never changes entered values, and never confirms the result.
- An editor is labelled **Count draft** or **Correction draft · unconfirmed**. “Retained in this demo” is deliberately not a production saved-state claim. The existing confirmed result stays effective while its correction is drafted.
- Quantities use whole-number mobile keyboards, persistent denomination/color/quantity labels, and raw invalid text. No input, focus change, Next key, navigation, or review returns chips. Review identifies missing/invalid fields with the raw text retained.
- **Review result → Confirm result** records exactly that denomination return once. The review shows units, provisional chip value, all contributions and signed provisional win/loss. All-zero results get an explicit zero notice. Corrections use **Review correction → Replace result**, replacing rather than duplicating the old return.
- Confirmed-result summaries and **Rebuy records / corrections** are the inspection/edit routes. A forgotten historical rebuy uses the actual mix already handed out; a fresh Rebuy has no manual mix override.
- Blocked dependency recovery uses a visible checklist linking ordinary record operations. Each undo/correction/new issuance requires its own explicit acceptance. Nothing cascades automatically.

## Walkthroughs

### 1. Finish a count, leave it, or explicitly record zero

The default Clara draft contains only `12` White chips. Enter `[15, 2, 3, 1, 0]` for denominations `[1, 5, 25, 100, 500]`: 200 units, EUR 20 chip value, EUR 20 contribution, provisional break-even. Leave/resume, compare treatments, or cancel the review: no bank change. Confirm explicitly to move Clara into Finished playing and record the return once.

**Prototype controls → Explicit zero vs untouched** starts with no confirmed results. Review the missing quantities, explicitly set them to zero, then review/confirm. Clara becomes a confirmed zero result; Bob remains uncounted. Zero quantities are not absence and vice versa.

### 2. Alice's return supplied Bob's rebuy

Open <http://127.0.0.1:4189/?variant=A&walk=dependency>.

The proposed Alice correction is prefilled `[10, 3, 5, 1, 0]` instead of her effective `[15, 2, 5, 1, 0]`. Both total 250 units, but the five fewer White chips would leave negative bank inventory because Bob's second rebuy used those returned chips. The blocker names that record and retains the proposed correction.

1. **Show recovery steps → Inspect Bob's blocking rebuy → Review undo → Undo recorded rebuy.** This removes only Bob's second rebuy, including its EUR 20 contribution, actual mix and reserve consumption. Initial buy-ins and the other three rebuy records remain.
2. **Resume Alice's proposed count → Review correction → Replace result.** The retained actual counts replace her return once.
3. **Review a new rebuy for Bob.** The corrected bank proposes `[10, 3, 3, 1, 0]`, not the old mix. It is an exact 200-unit stack with coverage **3 of 4**, so the ordinary approved reduced-coverage warning requires **Accept & issue**. Declining records nothing.

The completed checklist confirms each explicit step. Record editing does not physically retrieve/exchange chips; the host must reconcile the chips before following the new allocation.

Screens: [blocked correction](previews/blocked-dependency.png), [recovery checklist](previews/recovery-steps.png), [new allocation](previews/recovery-new-allocation.png), [completed recovery](previews/recovery-complete.png).

### 3. Forgotten or incorrect actual rebuy history

Open <http://127.0.0.1:4189/?variant=A&walk=history>, or open a player → Rebuy records / corrections → Record a forgotten rebuy / Correct mix.

Enter actual quantities rather than accepting a recommendation from today's bank. The fixed value is 200 units and the fixed contribution is EUR 20. History-entry totals describe the actual issuance and contribution, not a fictitious final result or win/loss. Alice's existing result stays recorded when adding a forgotten rebuy; her total contributions and provisional net balance update after acceptance.

The editor's labelled **Example mixes · prototype controls** offers:

| Actual mix | Review behavior |
| --- | --- |
| `[15, 2, 3, 1, 0]` | Exact 200 units, full coverage, ordinary explicit record confirmation. |
| `[10, 3, 3, 1, 0]` | Exact 200 units, coverage 3 of 4; visible warning and explicit accept/decline. |
| `[0, 0, 0, 2, 0]` | Exact 200 units, coverage 0 of 4; visible zero-coverage warning. |
| `[40, 2, 2, 1, 0]` | Exact and fully covered, but leaves only 5 White chips. Review explains **0 of 1** still-targeted qualifying stacks simultaneously achievable, compared with 2 of 2 before the historical addition. Explicit acceptance is required. |
| `[200, 0, 0, 0, 0]` | Exact value but inventory-impossible. Explain the denomination shortfall; no acceptance control and no record changes. |

Incorrect total value is a separate editor error; no substitute mix is invented. Replacing a recorded rebuy keeps one issuance and one contribution, not two. Undo uses its actual mix and can itself be blocked by recorded returns. Decline/cancel changes no accepted records. Existing initial contributions, other rebuys/results and mixes remain intact.

Screens: [normal history](previews/history-ordinary.png), [reduced coverage](previews/history-reduced.png), [zero coverage](previews/history-zero.png), [weakened reserve](previews/history-weaken.png), [inventory-impossible history](previews/history-impossible.png).

### 4. Actual return to play is different

Open <http://127.0.0.1:4189/?variant=A&walk=return>.

Return to play first explains the existing final result. **Review result removal** is navigation, not removal. Only **Remove final result** makes Alice uncounted and reverses that recorded return; initial buy-in and earlier rebuys remain. She can then request a fresh rebuy. Removal can be inventory-blocked and use the same explicit dependency recovery. Adding a forgotten historical rebuy does not remove her result.

### 5. Whole-game accounting and finality

- Normal/empty fixtures name uncounted players and show counted versus **cumulative issued** units. The outstanding remainder is not a confirmed shortage. Count drafts are excluded.
- **All counted · exactly balanced** has 1,400 counted / 1,400 cumulative issued units. Still In progress; the last result does not calculate Payments.
- **All counted · 1 unit missing** has 1,399 / 1,400 units. Show a precise 1-unit / EUR 0.10 shortage, retain the inventory-valid counts, and explain why Calculate Payments is unavailable.
- **Attempt a surplus** proposes one extra White chip after all inventory has been returned. It reports the proposed 1-unit / EUR 0.10 surplus **and blocks confirmation** because the bank would exceed configured inventory. No impossible effective history is installed just to illustrate a surplus: with the spec's inventory identity and bounded bank, accepted aggregate returns cannot exceed cumulative issuances. The generic accounting display can describe either sign of discrepancy; this fixture demonstrates the reachable rejection boundary.
- **Sub-cent valuation** uses EUR 20.01 / 200 units. Alice's exact 250-unit chip value is EUR 25.0125 and provisional win EUR 5.0025. Display does not independently allocate final cents or authorize payment.
- **Completed · read-only** presents accepted results/mixes as data with no editable forms or correction actions. Reopen, reset, deletion and final Payments are labelled handoffs, not implemented or newly approved flows.

Screens: [confirmed shortage](previews/all-counted-shortage.png), [all counted/balanced](previews/all-counted-balanced.png), [blocked surplus proposal](previews/surplus-proposal-blocked.png), [exact provisional money](previews/sub-cent-provisional.png).

## Fixture boundaries and verification

Six initial players receive `[15, 2, 3, 1, 0]`, exactly 200 units each, at 1 / 2 blinds and coverage 4. The physical chip set is `[135, 24, 27, 12, 1]`; preference is Fewer chips; started reserve is 3. The normal fixture has Bob's one rebuy and Alice's 250-unit return, giving current bank `[45, 12, 11, 6, 1]` and 2 of 2 still-targeted reserve capacity. Bank is derived from actual issuance mixes and confirmed returns, never from count drafts. The dependency fixture adds David/Emma's rebuys and Bob's second rebuy, which uses Alice's returned White chips.

The bounded allocation/capacity demonstration is intentionally limited to these denominations, 200-unit stacks and 1 / 2 blinds. Coverage here is `min(4, floor(White / 3))`; simultaneous reserve search uses disjoint actual quantities. It is not a general production solver. The dependency checklist is specific to the named fixture, not a selected persistence/history architecture. No new domain term or functionality is introduced.

Temporary headless Chrome smoke checks (outside the repository, not a production test suite) covered all three count editors; raw partial/invalid retention; leave/resume and simulated interruption; explicit zero; returns beyond a player's own issuance; impossible table-wide returns; confirmation/cancellation; replacement without duplicate return; the full Alice/Bob recovery with a new mix; historical full/reduced/zero coverage and weakened-reserve acceptance/decline; wrong-value/inventory rejection; actual-mix replacement/undo; result removal versus historical correction; incomplete/balanced/shortage/proposed-surplus states; exact sub-cent display; read-only records; comparison switching; and direct offline opening.

Checked count editors/review dialogs passed 320px and 390px with 100%/200% app text without measured horizontal overflow or checked buttons below 48×48px. Representative recovery/history/shortage/surplus/removal screens also passed narrow/large-text overflow checks. No page exceptions. These checks do **not** certify durable persistence, native keyboard behavior, VoiceOver/TalkBack, device accessibility or general solver correctness.

## Context and next decision

The prior [approved cash-game Play prototype](https://github.com/quirinbrandl/poker-planner/tree/36fec5037c1fd878bb2cbdeac673a9cf5a72370b/docs/prototypes/cash-game-play) is the visual/workspace primary source. This branch reuses its hierarchy/palette/chip vocabulary, not production components or a chosen application stack. Existing late-entry and lifecycle designs remain elsewhere rather than being silently redesigned here.

Human review should choose/combine A/B/C and react to the concrete confirmation, records and recovery flows. Until that live approval, the decision remains open and [Record cash-game final chip counts and accounting status](https://github.com/quirinbrandl/poker-planner/issues/18), [Correct cash-game results and undo mistaken rebuys safely](https://github.com/quirinbrandl/poker-planner/issues/22), [Record and correct actual historical rebuy mixes](https://github.com/quirinbrandl/poker-planner/issues/23), and shared approved spec sections remain unchanged.
