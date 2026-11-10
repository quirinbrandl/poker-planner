# Chip sets and templates — throwaway interaction prototype

**Status: Review v5 — open physical chip case requested instead of pile charts; revised illustration pending review.** Paired rows, optional colors and the Continue scope popup are retained. Do not treat unseen refinements as final design approval or production code.

Decision: [#34 — Design chip-set editing and template reuse](https://github.com/quirinbrandl/poker-planner/issues/34). Parent: [#30 — MVP UX/design map](https://github.com/quirinbrandl/poker-planner/issues/30). Affected implementation tickets: [#11](https://github.com/quirinbrandl/poker-planner/issues/11) and [#13](https://github.com/quirinbrandl/poker-planner/issues/13).

## Run

Open `index.html` directly. No build, packages, network, or installation needed.

For a live review, from this branch’s repository root:

```sh
python3 docs/prototypes/chip-set-templates/serve.py
```

Open <http://127.0.0.1:4186/?review=v5>. The visible page badge and browser title identify **Review v5 · Open chip case**. Default: a populated, mixed-color cash-game Planning fixture. Scroll the case sideways to reveal its right-hand side. For a single-denomination example, open <http://127.0.0.1:4186/?review=v5&fixture=forty>, then change quantity 40 → 100 → 101 → 240 to fill/add storage channels. Use `?screen=games`, `?screen=templates`, `?screen=picker`, `?screen=preview`, or `?screen=details` for other review shortcuts.

The small review server always serves its own absolute artifact directory and sends no-store/no-cache headers. Port 4186 is a fresh origin rather than relying on the earlier 4175 page. When the human reported the old screen, the agent verified that 4175’s response matched the revised on-disk file, but could not reproduce or establish the cause of the human’s stale view. A fresh origin, explicit revision badge and cache-disabled serving make the current version verifiable; they are not a claim that a particular browser-cache fault was proven. `--port N` selects another local port if required.

Everything, including the state model, is throwaway and in memory. Reload resets all fixtures. “Simulate restart” shows the agreed retention boundary in memory; it does **not** prove real local persistence. No application framework, persistence technology or production API is selected. Nothing should be promoted into the app.

## What to review

The human chose **A · Paired rows**, then requested functional chip symbols and optional colors to help match their physical set. The approved Current/Lavender foundation, navigation and inline-editing decision stay fixed. Tap a chip symbol to open its named color palette; **Apply color** accepts that visual choice and **Cancel/Escape** leaves it unchanged.

- **Selected / default:** Paired rows, grouped denomination cards with value and quantity alongside each other. No layout switcher appears by default.
- **Archive comparison only:** `?compare=layouts` exposes the earlier row-layout switcher; `?variant=ledger` and `?variant=stacked` also expose it for the previously shared alternatives. They are not product layout settings or reopened design choices.

The archived comparison bar changes the URL and retains draft state. Its left/right shortcuts leave inputs, native radios/selects, dialogs and walkthrough tabs alone; they are inactive outside comparison mode. The **app accent** stays Lavender. Choosing a physical chip color does not change the app theme. Feedback stays in chat.

Expand **Review controls & guided walkthroughs** for populated/40-White/empty/dense/seven-color fixtures, text scaling, a simulated restart, source-template deletion and nine repeatable scenarios. The readable state panel shows accepted reusable templates, independent game copies/colors, raw inputs and unaccepted optional operations.

## Open physical chip case — for review

The human clarified that the earlier pile charts were not the intended direction. They want an **open poker-chip case** at the top, with storage channels holding one denomination each, roughly 100 chips per channel, multiple channels for larger quantities, a growing width and horizontal scrolling. They explicitly prefer a cool-looking overall impression rather than numeric labels in the graphic.

- Replace both the v4 chart-like overview and per-row pile views with **one open case illustration** in game-specific and reusable-template editing. The case has a padded lid, hinges, metallic rim, recessed storage channels, clasps and handle, using restrained dark materials rather than casino decoration.
- A channel holds up to **100 physical chips of one denomination**. Forty occupies part of one channel; 100 fills it; 101 adds a second; 240 uses two full channels plus part of a third. Never mix denominations in a channel or merge entries just because they share a color. These are illustration groupings, not player starting stacks, reserve capacity, actual prepackaging rules or a new chip-set constraint.
- Add channels side by side as quantities grow, keeping the case height stable and expanding its width. Only the illustration scrolls horizontally; the form/page retains narrow-screen vertical reflow. The focusable scroll region supports native touch/trackpad/scrollbar/keyboard movement; an overflow hint appears when needed. Archived-layout arrow shortcuts leave it alone.
- No quantities, denomination values, legends or labelled chart tiles appear **inside** the case. Exact editable values, quantities and names remain below, including the already-approved row chip symbols and optional color picker. Assistive technology gets a labelled illustration scroll region and the exact form fields, not hundreds of decorative shapes.
- Quantities/colors, template selection, row changes and resumed drafts redraw the case from existing records. Partial input, zero and malformed quantities never produce guessed/stale chips or accepted records. Unfinished numeric work stays in the form under the existing validation rules. New rows/colors remain optional as before.
- Preserve horizontal position while changing a quantity or accepting a color in the same editing context; clamp naturally when the case shrinks. Input focus/caret and all save/update/return boundaries stay unchanged.
- For enormous quantities, render at most **32 channels per denomination**, mark continuation visually and say the preview is schematic. This is an illustration/performance bound only: no input cap, changed numeric quantity, new field or physical inventory rule. Ordinary home sets are represented directly; large exact values remain available below.
- This is a **setup illustration**, not an evolving bank/player-holdings view. There is no solver, inventory movement, animation, durable store or production implementation behind it.

The direction and channel-based interaction come from the human’s correction. Material treatment, exact dimensions, scroll presentation and the large-quantity guard are still concrete proposals for hands-on review. The superseded v4 pile proposal remains archived in commit history and its captures below, not in the current interactive UI.

## Continue popup refinement

After reviewing the earlier approach, the human explicitly requested that game/template scope **not remain a selector on the editing screen**, but instead appear as a popup when Continue is pressed. This supersedes the earlier agreed on-screen placement, not the underlying independence/save rules.

- Continue / Return to preview first validates the chip rows. Invalid/incomplete rows retain their raw text and receive field feedback; do not open the scope popup until these inputs are valid.
- The popup offers direct actions: **Only this game** (visually primary and initially focused), **Also update template** when the source exists, and **Cancel**. Name the source and explain that updating affects future games only. There is no scope radio selector on the step or in the popup.
- Cancel/Escape stays on Chip set with the game draft retained, restores Continue focus, and updates no template. Explicitly choosing an action applies that one finishing operation, then follows the normal Continue or direct preview-correction return. No optional update is remembered or replayed after restart.
- With no source or a deleted source, replace Update with **Save as new template**. That opens name entry using the current rows/colors. Validate the required unique name; **Save template and continue** (or Save and return to preview) explicitly creates it and navigates. No new template exists before acceptance.
- Back from the name popup preserves entered name text and returns to the scope choice. Trying to cancel or continue game-only with that name pending offers Keep editing / Leave without template. Discarding the name never discards the game’s chip draft. Simulated restart discards unaccepted popup/name work without applying it.
- Separate template management’s explicit Save and setup creation’s atomic Save and use remain unchanged. Scope is prompted when finishing the game chip-set step, not when saving a reusable editor that already has explicit scope.

## Approved color refinement

The human explicitly approved this extension after choosing Paired rows (“yeah refine on that basis”):

- Optional colors: **White, Grey, Red, Blue, Green, Yellow, Purple, Black, Orange, Pink and Brown**, plus **No color**. New rows and records without a color use No color; never infer color from a numeric denomination. Repeated colors are allowed. Denomination values remain unique regardless of color.
- Functional chip symbols in editable rows, compact set previews in the picker/management and input-review handoff, and readable symbols with values/quantities/color names in locked details. These identify physical chips, rather than introducing decorative poker/casino imagery.
- A labelled palette opens from the row’s chip symbol. Its radio choice is staged until **Apply color**; cancellation applies nothing. An accepted color in a Planning game is retained as draft data; in a reusable editor it is still an unsaved edit until Save. Optional source propagation remains separate and explicit.
- Colors are copied/saved/deleted under the existing independent game/template rules, including Only this game, explicit source update, Save as new template and one-shot scope reset. The existing post-Start chip-set lock includes color; there is no color-only editing bypass.
- Colors do not affect values, quantities, totals, eligibility, distributions, money or validation. Choosing one is possible even while numeric game fields are incomplete/invalid and must not coerce those fields. No color is required to advance/save.
- Explicit values, quantities and color names remain available without relying on color or the symbol. The chip face repeats short values for recognition; long or malformed raw inputs are never shortened into a different value and remain fully available in their input/text labels.
- Carry this same representation into later distribution, issuance and final-count workflows as those designs are approved. This study does not implement or approve those workflows.

This explicitly supersedes the earlier “no chip metadata/customization added” checkpoint **only for optional chip color**. No custom hue picker, automatic standard color/value mapping, chip artwork, material, label, photo or additional denomination identity is introduced.

## Agreed behavior represented

- Show this game’s chip set immediately. An empty library does not require a management detour. Choose template opens a staged single-choice picker; **Use template** applies it. **New template → Save and use** creates/captures explicitly.
- Positive whole-number chip-unit values, nonnegative whole-number quantities. Empty quantity is missing, not zero. At least one denomination is required to advance/save. Duplicate numeric values (including differently padded forms) are rejected with a combine-quantities instruction; no automatic merge or rounding.
- Zero-quantity rows, including an entirely zero-quantity set, are structurally valid. Saving/checking chip inputs does not prove a feasible distribution. No arbitrary numeric/denomination cap is introduced.
- Keep raw invalid game fields and correction-return context across Back/Games/simulated restart. Validate edited fields on leaving them, untouched requirements on Continue/Save, and update displayed errors during correction. Native implementation still needs durable persistence and keyboard checks.
- Add appends a row and focuses its first field (Value in A/B, Quantity in C). Rows do not sort themselves during entry. Remove an entirely blank row immediately; removing populated data requires a named confirmation. An empty result is a retained incomplete game draft.
- Require a template name, trim outer spaces, preserve capitalization and reject case-insensitive duplicate names. Picker summaries identify denominations and physical quantity with functional chip symbols and explicit values/color names.
- Game changes are retained as drafts. After valid Continue/Return to preview, the popup defaults to **Only this game**. **Also update template** is an explicit finishing action; other games keep their copies. The optional operation resets on dismissal/completion and never replays after restart.
- If there is no source, or it has been deleted, offer **Save as new template**, using the current rows plus an explicit name. Never automatically recreate a deleted source. Leaving an entered new-template name warns that the name is being discarded but game changes remain retained.
- Reusable editors require valid name/rows to Save, but not feasible stacks. **Save** in management; **Save and use** from the setup picker. Existing accepted templates/game copies stay effective until explicit acceptance. A populated game’s replacement is confirmed *before* either the new template or game is changed.
- Deliberate dirty reusable-editor dismissal offers Keep editing / Discard changes. Unsaved reusable-editor text need not survive a full restart; accepted templates and raw game draft fields do. Cancellation never partially applies operations.
- Deleting a template is confirmed and preserves Planning/In progress/Completed copies. Editing a template changes future selections only. Started setup is readable data, not a disabled editable form; it explains the separate reset route, and Completed requires reopening before reset. No lifecycle action actually executes here.

## Review-specific details, not yet approved by hands-on review

The human liked v3’s paired rows, colors and Continue popup and corrected v4 toward an open physical case with sideways-growing, denomination-specific storage channels. The new case artwork, proportions, scrolling, density and guard behavior remain proposals for hands-on review. Do not silently interpret that direction as approval of an unseen implementation.

## Fixtures and boundaries

- `g1`: cash Planning, six captured names, Weeknight set copy; `g2`: tournament Planning, two names, an independent copy; `g3`: cash In progress; `g4`: tournament Completed. Later setup values are readable in the inspector and never reset by chip edits.
- Weeknight set: 1 × 200 (Grey), 5 × 150 (Red), 25 × 100 (Blue), 100 × 50 (Green). Travel set: 1 × 100, 5 × 100, 25 × 60, all No color. These are illustrative choices, not universal color/value mappings.
- Seven-color example: Grey, Red, Blue, Green, Yellow, Purple and Black, matching the colors named by the human. Denominations/quantities are illustrative, not a claim about their actual set.
- No templates: keeps the prepared setup context, clears the library and current chip rows. It is explicitly a Chip set boundary fixture, not a complete first-launch implementation.
- Dense: 12 denomination rows to exercise scrolling and keyboard navigation; this is not a product cap.
- Mode/Players/Game settings are labelled neighboring-step handoffs to [approved #33 assets](https://github.com/quirinbrandl/poker-planner/tree/1753f00fdc36c3a68dd1d7529b736200a933dcd2/docs/prototypes/cash-game-planning). New game opens an explicit prepared-fixture handoff, not a fake roster-creation workflow.
- Distribution is a labelled handoff to #35: input status only; no solver, blind derivation, alternative-depth approval or working Start. Preview correction returns directly and retains later fields. This study issues no chips and calculates no money.
- Reset/reopen/history/Payments are not implemented; locked details only demonstrates chip-set inspectability and the already-required explanation.

## Verification

The original interaction revision passed all six original Chrome walkthroughs and targeted free-play checks:

- Raw blank/malformed quantity retention through Games/resume/simulated restart, untouched versus edited-field timing, zero quantities, padded duplicate numeric values, and an all-zero structurally valid set without claiming distribution feasibility.
- Only-this-game versus explicit one-shot source propagation, reset of the optional choice on leaving/completing, unchanged captured copies in other phases, staged picker selection and cancelled/accepted replacement.
- Save and use changes neither the new template nor the game before replacement acceptance. Deleted-source recovery, case-insensitive/space-trimmed template-name collision, and deliberate dismissal of an entered new-template name were checked.
- Dirty reusable-editor cancellation/Keep editing, interruption without applying unsaved changes, exact invoking-row focus after Escape, default Cancel focus, numeric Next behavior, native radio navigation and retained malformed inputs through layout changes.
- Locked In progress/Completed setup has no editable fields; the Completed explanation calls for reopen before the separate reset. Standalone offline `file://` opening and URL/layout switching worked.

At **320px viewport / 200% app text**, the three chip-row layouts, picker, template management, empty/invalid reusable editor and a removal confirmation had no measured horizontal overflow. Checked chip-screen button targets were at least **48×48**. Quantity-first layout uses matching visual/DOM field order. Eight measured semantic text/background pairs had a minimum contrast of **7.36:1**. No browser exceptions remained in these checks.

The refined color version also passed those original checks, plus its new **Colors & scope** walkthrough and targeted browser checks:

- All eleven named colors and No color; repeated colors; neutral defaults for new/previously uncolored rows; staged selection/cancellation; current-radio focus; exact invoking-chip focus restoration.
- Game-only color retention, explicit template propagation, future selection capturing the changed color, and unchanged already-captured copies in other phases. Values, quantities, exact totals and numeric setup revision remained unchanged by color selection.
- A color-only reusable edit is dirty but unaccepted until Save; cancellation/Keep editing and simulated restart preserve accepted records. Save and use remains atomic through its replacement confirmation, including colors. Deleted-source Save as new template preserves the current colors.
- Incomplete/malformed numeric game fields survive color edits and simulated restart. Removing a color-only row asks for confirmation. In progress/Completed views have no color controls, and color-edit requests there do not mutate the records.
- At 320px / 200% app text, the palette, chip previews and locked details had no measured horizontal overflow; palette option labels provide at least 48×48 targets. Long values remain exact in adjacent text instead of clipping/abbreviating into another number. Offline color selection worked with no browser exceptions.
- Native palette-radio arrows stage the choice without applying it; Escape restores focus to the invoking chip. All twelve chip-face numeral/background pairs measured at least **5.65:1** contrast; the surrounding labels retain the shared slate/Lavender text roles.

Review v3 was checked at the **fresh 127.0.0.1:4186 origin**, not just against a local file. The HTTP response matched `index.html` byte-for-byte, included no-store headers, and rendered the v3 badge/title plus four visible chip symbols. Reload retained the current version. All eight walkthroughs and targeted free-play checks passed with no browser exceptions, including:

- Absence of the old inline scope selector; valid Continue opening the popup without updating a template; safe default focus/Enter on Only this game; Cancel/Escape retaining the game draft and restoring Continue focus; explicit source update affecting no other captured game.
- Invalid rows blocking before the popup; malformed raw input/resume, duplicate values and explicit/all-zero quantities retaining their existing semantics.
- Deleted/no-source popup, required/duplicate new-template-name errors, Back preserving the name, Keep editing/discard recovery, keyboard name submission, and Save as new template copying colors explicitly. Cancelling/restarting never applies a pending choice.
- All color options, staged palette cancellation, numeric invariance, repeated/no-color behavior, colored atomic Save and use, dirty reusable interruption, correction-return context, and started/completed locks.
- Scope, new-template-name and color popups, chip rows, picker, management and locked details had no horizontal overflow at 320px / 200% app text. Offline color editing plus the Continue popup also worked.

The **superseded v4 pile proposal** was verified against the actual no-cache URL and passed its nine walkthroughs plus the existing workflow checks. These are historical checks of that proposal, not requirements to retain its charts. Its additional checks covered:

- 40 White chips → four piles of ten in both views; 43 → four full piles plus a visibly shorter pile of three. Input focus/caret remained in place while typing.
- Explicit zero, blank, malformed and resumed invalid quantities; old piles disappear immediately rather than representing a stale or guessed count. Invalid denomination values keep the whole-set total marked incomplete.
- Exact accounting of displayed chips plus labelled remainder for every quantity from 0 through 1,000, at both drawing limits; very large integer text stays exact and rendering remains bounded.
- All **500** physical chips in the ordinary fixture are represented in the overview. Repeated colors remain distinct denomination groups. Unaccepted palette choices do not recolor the accepted view; accepted colors do.
- Collapsing/reopening the overall view changes no game/template state, and its disclosure choice survives numeric/color edits. Merely deriving/drawing piles does not mutate records or make a reusable editor dirty. Only actual input edits do; unsaved template previews never rewrite games/source records.
- The row view remains available while the overview is collapsed. Empty, partial, zero, huge, seven-color and dense views had no horizontal overflow at 320px / 200% app text. The live visualization worked offline without browser exceptions.

Review v5 was verified at the actual no-cache URL, with a matching file response and the visible **Open chip case** revision. All nine current walkthroughs and the existing validation/scope/color/reusable-save/correction/lock checks passed. New case-specific browser checks covered:

- 40 / 100 / 101 / 240 chips occupy `[40]`, `[100]`, `[100, 1]` and `[100, 100, 40]` within channels of the same denomination. Width grows with added channels; all 500 ordinary-fixture chips are represented. No numeric chart labels or per-row pile views remain.
- Same-color denominations never mix. Exact channel accounting was checked for quantities 0–3,200, and drawing bounds for 0–5,000 plus very large integer text. Schematic guards never change an input value or accepted record.
- Zero/blank/invalid/resumed quantities do not leave stale chips. Accepted colors recolor the case, staged/cancelled palette choices do not. Input focus/caret and horizontal position survive edits; reducing the width naturally clamps scrolling.
- Native keyboard and horizontal wheel/trackpad scrolling work, including in archive-comparison mode without hijacked arrow keys. Scrolling and deriving artwork change no game/template data. Reusable editor previews leave accepted templates/games intact until Save.
- At 320px / 200% text, the **case intentionally scrolls horizontally**, while the page, fields and other workflows do not overflow. Empty, dense, huge and seven-color views and offline operation passed with no browser exceptions.

These are browser-reference checks, not native certification. Native keyboards, native text scaling, VoiceOver/TalkBack, real durable restart, actual allocations and production integration remain implementation checks.

## Captured screens

Captures isolate the phone surface at a 390px browser viewport. The selected paired layout has no switcher by default; the archived comparison bar is hidden in comparison captures.

- **Selected:** [Paired rows with chip symbols](previews/chips-paired.png), [named color palette](previews/color-palette.png), [seven-color example](previews/seven-colors.png). Archived alternatives: [B · Open ledger](previews/chips-ledger.png), [C · Quantity first](previews/chips-stacked.png).
- **Review v3:** [visible revision badge and chip symbol in the browser](previews/review-v3.png), [Continue scope popup](previews/continue-popup.png), [no-source choice](previews/no-source-popup.png), [Save as new template popup](previews/new-template-popup.png).
- **Review v4:** [visible revision badge](previews/review-v4.png), [complete 500-chip set](previews/whole-set.png), [40 White chips](previews/forty-white.png), [43 with a partial pile](previews/partial-pile.png), [live row preview](previews/live-row-preview.png), [large-count labelled remainder](previews/large-count.png).
- **Review v5:** [visible revision badge](previews/review-v5.png), [open case](previews/open-case.png), [scrolled to its right-hand side](previews/open-case-scrolled.png), [unclipped illustration](previews/open-case-full.png), [40 White chips](previews/case-40-white.png), [240 White chips in three channels](previews/case-240-white.png). The unclipped illustration capture temporarily widens the review surface to show the same artwork without its phone viewport; it is not a separate desktop layout.
- [Picker](previews/picker.png), [separate template management](previews/templates.png), [explicit-save editor](previews/template-editor.png).
- [No chip rows/templates](previews/empty.png), [invalid raw input](previews/invalid.png), [deleted source / Save as new template](previews/deleted-source.png), [12-denomination list](previews/dense.png).
- [Games](previews/games.png), [locked setup](previews/details.png), [preview handoff](previews/preview.png).
