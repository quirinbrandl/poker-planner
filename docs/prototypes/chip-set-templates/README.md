# Chip sets and templates — throwaway interaction prototype

**Status: Paired rows selected; optional chip-color policy approved; refined visual review pending.** Do not treat the unseen refinements as final design approval or production code.

Decision: [#34 — Design chip-set editing and template reuse](https://github.com/quirinbrandl/poker-planner/issues/34). Parent: [#30 — MVP UX/design map](https://github.com/quirinbrandl/poker-planner/issues/30). Affected implementation tickets: [#11](https://github.com/quirinbrandl/poker-planner/issues/11) and [#13](https://github.com/quirinbrandl/poker-planner/issues/13).

## Run

Open `index.html` directly. No build, packages, network, or installation needed.

Alternatively, from this branch’s repository root:

```sh
python3 -m http.server 4175 --bind 127.0.0.1 --directory docs/prototypes/chip-set-templates
```

Open <http://localhost:4175>. Default: a six-player cash-game Planning fixture at Chip set. Use `?screen=games`, `?screen=templates`, `?screen=picker`, `?screen=preview`, or `?screen=details` for review shortcuts.

Everything, including the state model, is throwaway and in memory. Reload resets all fixtures. “Simulate restart” shows the agreed retention boundary in memory; it does **not** prove real local persistence. No application framework, persistence technology or production API is selected. Nothing should be promoted into the app.

## What to review

The human chose **A · Paired rows**, then requested functional chip symbols and optional colors to help match their physical set. The approved Current/Lavender foundation, navigation and inline-editing decision stay fixed. Tap a chip symbol to open its named color palette; **Apply color** accepts that visual choice and **Cancel/Escape** leaves it unchanged.

- **Selected / default:** Paired rows, grouped denomination cards with value and quantity alongside each other. No layout switcher appears by default.
- **Archive comparison only:** `?compare=layouts` exposes the earlier row-layout switcher; `?variant=ledger` and `?variant=stacked` also expose it for the previously shared alternatives. They are not product layout settings or reopened design choices.

The archived comparison bar changes the URL and retains draft state. Its left/right shortcuts leave inputs, native radios/selects, dialogs and walkthrough tabs alone; they are inactive outside comparison mode. The **app accent** stays Lavender. Choosing a physical chip color does not change the app theme. Feedback stays in chat.

Expand **Review controls & guided walkthroughs** for populated/empty/dense/seven-color fixtures, text scaling, a simulated restart, source-template deletion and seven repeatable scenarios. The readable state panel shows accepted reusable templates, independent game copies/colors, raw inputs and unaccepted optional operations.

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
- Game changes are retained as drafts. **Only this game** is the default. **Also update chip set template** is explicit and takes effect on successful Continue/Return to preview only; other games keep their copies. The optional operation resets on leaving/completing the step and never replays after restart.
- If there is no source, or it has been deleted, offer **Save as new template**, using the current rows plus an explicit name. Never automatically recreate a deleted source. Leaving an entered new-template name warns that the name is being discarded but game changes remain retained.
- Reusable editors require valid name/rows to Save, but not feasible stacks. **Save** in management; **Save and use** from the setup picker. Existing accepted templates/game copies stay effective until explicit acceptance. A populated game’s replacement is confirmed *before* either the new template or game is changed.
- Deliberate dirty reusable-editor dismissal offers Keep editing / Discard changes. Unsaved reusable-editor text need not survive a full restart; accepted templates and raw game draft fields do. Cancellation never partially applies operations.
- Deleting a template is confirmed and preserves Planning/In progress/Completed copies. Editing a template changes future selections only. Started setup is readable data, not a disabled editable form; it explains the separate reset route, and Completed requires reopening before reset. No lifecycle action actually executes here.

## Review-specific details, not yet approved by hands-on review

Paired rows and the color policy are selected. The refined symbols, palette placement/appearance, set previews, precise copy and responsive treatment are concrete proposals for hands-on review. Do not silently interpret agreement to refine the prototype as approval of its unseen revised screens.

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

These are browser-reference checks, not native certification. Native keyboards, native text scaling, VoiceOver/TalkBack, real durable restart, actual allocations and production integration remain implementation checks.

## Captured screens

Captures isolate the phone surface at a 390px browser viewport. The selected paired layout has no switcher by default; the archived comparison bar is hidden in comparison captures.

- **Selected:** [Paired rows with chip symbols](previews/chips-paired.png), [named color palette](previews/color-palette.png), [seven-color example](previews/seven-colors.png). Archived alternatives: [B · Open ledger](previews/chips-ledger.png), [C · Quantity first](previews/chips-stacked.png).
- [Picker](previews/picker.png), [separate template management](previews/templates.png), [explicit-save editor](previews/template-editor.png).
- [No chip rows/templates](previews/empty.png), [invalid raw input](previews/invalid.png), [deleted source / Save as new template](previews/deleted-source.png), [12-denomination list](previews/dense.png).
- [Games](previews/games.png), [locked setup](previews/details.png), [preview handoff](previews/preview.png).
