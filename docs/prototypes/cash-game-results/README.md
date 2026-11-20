# Cash-game results & correction recovery · Approved (Review v5)

**Throwaway UI prototype. The human approved the whole workflow in Review v5.** It asks: how can the host count final chips, inspect/correct actual records, and recover from dependent inventory without confusing a draft, confirmed result, physical chip movement, or final Payments?

Decision ticket: [Design cash-game result entry and correction recovery](https://github.com/quirinbrandl/poker-planner/issues/37). Approved: count editor **B**, the simplified result confirmation, blocked-correction fix **3 · One step at a time**, and the v5 player page, forgotten-rebuy editor, return-to-play popup and results status. Earlier sections are kept as the review history. No production code, functional specification, or implementation-ticket acceptance criteria are changed by this branch.

## Run

From this branch's repository root:

```sh
python3 docs/prototypes/cash-game-results/serve.py
```

Open <http://127.0.0.1:4189/?variant=A&walk=count>.

Count editor: <http://127.0.0.1:4189/?walk=count>. Result confirmation: <http://127.0.0.1:4189/?walk=confirm>. Blocked-correction fix: <http://127.0.0.1:4189/?walk=dependency>. Player page: <http://127.0.0.1:4189/?fixture=normal> → tap Alice or Bob. Forgotten rebuy: <http://127.0.0.1:4189/?walk=history>. Return to play: <http://127.0.0.1:4189/?walk=return>. Missing chip: <http://127.0.0.1:4189/?walk=shortage>. B and fix 3 are the defaults; `variant=A|C` and `fix=1|2` open the archived alternatives.

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

## Review v5 · Approved

The human confirmed **B · One denomination** as the count editor (A and C archived), then asked for the four remaining screens to be redone in the same simple style as the chosen fix flow, and approved all four: “Yeah, everything approved.”

### 1. Player page holds every record

The separate Rebuy records page is gone. A player page shows, in order: the approved win/loss summary (result players only), **Final chips · <units>** with the denomination pills and a **Correct** button, **Buy-ins · <total>** listing the initial buy-in and every rebuy with its actual mix, then **+ Add forgotten rebuy** and, for a player with a result, **Return to play…**. Each rebuy row has **Correct mix** and **Undo**. Tags mark a rebuy as *added later* or *corrected*, and a reduced-coverage mix as *c of 4 coverage*. Zero-quantity denominations are hidden in these compact rows. A player still playing gets **Count final chips** / **+ Rebuy** instead of the result sections. There is no standalone Remove final result button: removal is only reached through Return to play.

Screens: [Alice with a result](previews/review-v5-player-alice.png), [after adding a forgotten rebuy](previews/review-v5-player-after-history.png), [Bob still playing](previews/review-v5-player-bob.png).

### 2. Forgotten rebuy and Correct mix

Same B chip picker as the count editor. One line: “Enter the chips <name> actually got. They must add up to 200.” (plus “<name>’s result stays.” when one exists). A bar fills toward **200 chip units**: “N to go”, “N over” in red, “Exactly 200 ✓” in green. A wrong total on review shows “N chip units, not 200 · Check the quantities you entered.” The confirmation popup (**Add <name>’s forgotten rebuy?** / **Correct <name>’s rebuy k?**) shows the mix, “<name>’s buy-ins EUR 20.00 → EUR 40.00” for an addition, and one ⚠ line per problem: “Covers only c of 4 blind payments with separate chips.” and “Leaves chips for only x of y reserve stacks (was z).” With a warning the buttons are **Decline / Accept & add** (or **Accept & save**); otherwise **Cancel / Add rebuy** (**Save correction**). If the bank doesn’t have the chips, the popup **Not enough chips for this mix** shows the chip with −N, “The bank is N White chips short. Check the quantities you entered.”, “Nothing was saved.” and **Back to editing** only.

Screens: [editor](previews/review-v5-history-ready.png), [wrong total](previews/review-v5-history-incomplete.png), [confirm](previews/review-v5-history-confirm.png), [reduced coverage](previews/review-v5-history-reduced.png), [weakened reserve](previews/review-v5-history-weaken.png), [not enough chips](previews/review-v5-history-impossible.png), [correct mix](previews/review-v5-history-correct-confirm.png).

### 3. Return to play is one popup

**<name> back in the game?** “Hand <name> back these chips:” with the confirmed mix (or “cashed out with no chips, so there’s nothing to hand back”), then **Final result · Removed** and **Buy-ins · EUR x · unchanged**. **Cancel / Back in the game**. Afterwards the player is playing again and can rebuy or be counted. A removal that later records depend on uses the approved One-step-at-a-time fix flow.

Screens: [popup](previews/review-v5-return.png), [after](previews/review-v5-return-after.png).

### 4. Results status card

One card above the player list: **N still to count** (names, progress, `done/total` icon), **N chip unit(s) missing** / **too many** (“EUR x · counted of issued. Recount, or correct a result.”), or **Everything adds up ✓** (“All N counted · units”). **Calculate Payments…** is primary only when everything adds up; otherwise it is disabled with “Count everyone first.” / “Find the missing chips first.” / “Fix the extra chips first.” A count that would return more chips than the game has is blocked with **More chips than the game has**, the chip with +N and **Back to editing**.

Screens: [still to count](previews/review-v5-results-incomplete.png), [chip missing](previews/review-v5-results-shortage.png), [adds up](previews/review-v5-results-balanced.png), [completed](previews/review-v5-results-completed.png), [too many chips blocked](previews/review-v5-surplus-blocked.png), [count editor B](previews/review-v5-count-editor-B.png).

Successful actions show a short ✓ toast (“Result confirmed”, “Forgotten rebuy added”, “Rebuy corrected”, “Rebuy undone”, “Back in the game”) instead of an explanation box.

V5 headless checks drove every new screen with correct records (forgotten rebuy added with the result retained, Bob’s rebuy corrected in place, Alice back in the game with buy-ins unchanged, impossible/too-many blocked with nothing saved), reran all three fix flows and the A/B/C editors, and found no page exceptions and no overflow at 320px/390px with 100%/200% text. Fixture evidence only.

## Archived review v4 · Simpler confirmation; blocked correction redesigned

### Result confirmation · human decisions

- **No “provisional” label anywhere.** The human asked why chip value and win/loss were marked provisional, heard the reason (final cents are allocated across the whole table at Payments, and Payments needs every count and balanced chips), and decided the label is not needed in any place. Removed from the confirmation popup, count-editor totals, finished-player rows, player detail and the post-confirmation message; the player-detail line about final cents/Payments is gone too. Monetary behavior is unchanged: exact values are kept and cents are still allocated only at Payments, which stays a separate step. This supersedes the “Won · provisional” wording approved in the cash-game Play decision.
- **No consequence note** on first-time Confirm result. The popup is the chip mix, final chip units, chip value, all contributions and win/loss, then Cancel / Confirm result. (The Replace result note for corrections is untouched.)
- **Chip pills show only the chip image and the quantity** (`×15`). The image carries value and color; screen readers still hear e.g. “15 × 1 White”.

Screen: [result confirmation](previews/review-v4-confirm-result.png).

### Blocked correction · three new designs, 3 chosen

The human rejected the v1 “Correction blocked” popup (three stacked colored notices) and asked for a complete redesign. Three structurally different designs were built on the same explicit operations: undo the dependent rebuy → save the corrected count → review and accept a new rebuy. Nothing cascades; each step keeps its own confirmation. Switch with `&fix=1|2|3` or the bottom arrows while the dependency fixture is open.

| Design | Structure | Status |
| --- | --- | --- |
| **1 · Chip trail** | Popup with an Alice → ×5 White → Bob diagram, then a timeline page. | Archived comparison |
| **2 · Fix plan** | No separate blocked screen: the popup is the 3-step checklist, re-shown after each step. | Archived comparison |
| **3 · One step at a time** | Full page showing only the current step, large; 3-segment progress bar; done screen. | **Chosen by the human** |

Design 3 flow:

1. **Can’t save Alice’s count yet** — big White chip with **−5**, “Bob’s rebuy 2 is using 5 of these White chips”, Bob’s rebuy 2 card, **Undo Bob’s rebuy 2…** / Back to count. Back to count keeps the correction and abandons nothing else.
2. **✓ Bob’s rebuy undone · Now save Alice’s corrected count** — the retained mix, **Save Alice’s count…** (opens Confirm/Replace result directly) / Edit count first.
3. **✓ Alice’s count saved · Give Bob a new rebuy** — opens the approved rebuy popup with a newly computed mix; reduced coverage still needs explicit Accept & issue.
4. **All fixed** — three ticked operations, Back to Play.

Shared simplifications: no “inventory / reserve consumption” wording; the physical-chip rule appears as one practical line where it matters (undo: “Bob keeps the chips until the new rebuy”; new rebuy: “Swap Bob’s chips so they match this stack”). The Undo rebuy popup is chips, “Bob’s contributions EUR 60.00 → EUR 40.00” and that line. Leaving mid-fix shows a compact **Fixing Alice’s count · Step n of 3** button on Play.

Screens: [step 1](previews/review-v4-fix3-step1-undo.png), [undo popup](previews/review-v4-undo-confirm.png), [step 2](previews/review-v4-fix3-step2-save.png), [step 3](previews/review-v4-fix3-step3-rebuy.png), [new rebuy popup](previews/review-v4-fix3-new-rebuy.png), [done](previews/review-v4-fix3-done.png); archived: [1 · Chip trail](previews/review-v4-fix1-chip-trail.png), [2 · Fix plan](previews/review-v4-fix2-plan.png).

V4 headless checks (390×844) drove all three designs end to end: Alice’s result becomes `[10, 3, 5, 1, 0]`, Bob keeps rebuy 1 and receives a new `[10, 3, 3, 1, 0]` rebuy, the recovery completes, no page exceptions and no horizontal overflow. Switching designs mid-fix keeps progress. Fixture evidence only, not device/accessibility certification.

## Archived review v3 · Approved compact captions; next is result confirmation

The human requested **0x** instead of Not counted, and **12x / 0x** instead of 12 chips / 0 chips, explicitly authorizing this change without another review. Those compact captions are applied to B's chip-image picker. The blank-caption fallback is presentation only: existing blank/raw draft inputs are retained, the accessible name identifies a quantity not entered, and an untouched player remains uncounted until explicit result confirmation. A caption never confirms a result or returns inventory. Explicitly entered zero remains a real quantity; malformed text remains available for correction.

No further label approval is requested. The next prototype link opens Clara's **Confirm result** review directly, with a prepared but unconfirmed `[15, 2, 5, 1, 0]` count: 250 chip units, provisional EUR 25 chip value, EUR 20 contributions and a provisional EUR 5 win. Opening the link changes no accepted result or bank inventory. Cancel keeps the draft; only Confirm result records the return. The review layout/content remains a proposal for live reaction, not an approved final workflow.

Screens: [compact picker](previews/review-v3-picker.png), [result confirmation](previews/review-v3-confirm-result.png). Earlier screenshots and notes below preserve their original review versions; the Not counted / chips captions in v2 are superseded.

V3 browser checks passed compact captions with retained blank/zero/raw distinctions, unchanged records on preview/cancel, the correct 250-unit / EUR 25 / EUR 20 / +EUR 5 review, explicit single-return acceptance without auto-completion, and 320px/390px at 100%/200% text with no measured horizontal overflow or checked targets below 48×48px. The earlier workflow smoke checks passed again.

## Archived review v2 · Chip-image denomination buttons

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
