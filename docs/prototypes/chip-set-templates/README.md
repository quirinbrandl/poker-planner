# Chip sets and templates — throwaway interaction prototype

**Status: behavior agreed in conversation; interactive/visual review pending.** Do not treat this artifact as final design approval or production code.

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

The approved Current/Lavender foundation, navigation and inline-editing decision stay fixed. Three inline layouts compare field hierarchy within those boundaries on the same route:

- `?variant=paired`: **A · Paired rows**, grouped denomination cards with value and quantity alongside each other. Recommended starting point.
- `?variant=ledger`: **B · Open ledger**, unboxed inventory rows and a continuous scan path.
- `?variant=stacked`: **C · Quantity first**, full-width quantity-first inventory strips for counting, with inline denomination editing underneath.

The floating bar is an external review control, not a product setting. It changes the URL and retains draft state. Left/right shortcuts leave inputs, native radios/selects, dialogs and walkthrough tabs alone. Palette stays Lavender; color selection is not reopened. Feedback stays in chat.

Expand **Review controls & guided walkthroughs** for populated/empty/dense fixtures, text scaling, a simulated restart, source-template deletion and six repeatable scenarios. The readable state panel shows accepted reusable templates, independent game copies, raw inputs and unaccepted optional operations.

## Agreed behavior represented

- Show this game’s chip set immediately. An empty library does not require a management detour. Choose template opens a staged single-choice picker; **Use template** applies it. **New template → Save and use** creates/captures explicitly.
- Positive whole-number chip-unit values, nonnegative whole-number quantities. Empty quantity is missing, not zero. At least one denomination is required to advance/save. Duplicate numeric values (including differently padded forms) are rejected with a combine-quantities instruction; no automatic merge or rounding.
- Zero-quantity rows, including an entirely zero-quantity set, are structurally valid. Saving/checking chip inputs does not prove a feasible distribution. No arbitrary numeric/denomination cap is introduced.
- Keep raw invalid game fields and correction-return context across Back/Games/simulated restart. Validate edited fields on leaving them, untouched requirements on Continue/Save, and update displayed errors during correction. Native implementation still needs durable persistence and keyboard checks.
- Add appends a row and focuses its first field (Value in A/B, Quantity in C). Rows do not sort themselves during entry. Remove an entirely blank row immediately; removing populated data requires a named confirmation. An empty result is a retained incomplete game draft.
- Require a template name, trim outer spaces, preserve capitalization and reject case-insensitive duplicate names. Picker summaries identify denominations and physical quantity without colors or decorative chip metadata.
- Game changes are retained as drafts. **Only this game** is the default. **Also update chip set template** is explicit and takes effect on successful Continue/Return to preview only; other games keep their copies. The optional operation resets on leaving/completing the step and never replays after restart.
- If there is no source, or it has been deleted, offer **Save as new template**, using the current rows plus an explicit name. Never automatically recreate a deleted source. Leaving an entered new-template name warns that the name is being discarded but game changes remain retained.
- Reusable editors require valid name/rows to Save, but not feasible stacks. **Save** in management; **Save and use** from the setup picker. Existing accepted templates/game copies stay effective until explicit acceptance. A populated game’s replacement is confirmed *before* either the new template or game is changed.
- Deliberate dirty reusable-editor dismissal offers Keep editing / Discard changes. Unsaved reusable-editor text need not survive a full restart; accepted templates and raw game draft fields do. Cancellation never partially applies operations.
- Deleting a template is confirmed and preserves Planning/In progress/Completed copies. Editing a template changes future selections only. Started setup is readable data, not a disabled editable form; it explains the separate reset route, and Completed requires reopening before reset. No lifecycle action actually executes here.

## Review-specific details, not yet approved by hands-on review

The three layouts, precise field/scope placement, continuous summary, picker summaries including chip units, Add-focus behavior, modal copy, management-list ordering and the visual treatment of handoff/lock guidance are concrete proposals to review. Do not silently interpret behavioral agreement as approval of an unseen screen.

## Fixtures and boundaries

- `g1`: cash Planning, six captured names, Weeknight set copy; `g2`: tournament Planning, two names, an independent copy; `g3`: cash In progress; `g4`: tournament Completed. Later setup values are readable in the inspector and never reset by chip edits.
- Weeknight set: 1 × 200, 5 × 150, 25 × 100, 100 × 50. Travel set: 1 × 100, 5 × 100, 25 × 60.
- No templates: keeps the prepared setup context, clears the library and current chip rows. It is explicitly a Chip set boundary fixture, not a complete first-launch implementation.
- Dense: 12 denomination rows to exercise scrolling and keyboard navigation; this is not a product cap.
- Mode/Players/Game settings are labelled neighboring-step handoffs to [approved #33 assets](https://github.com/quirinbrandl/poker-planner/tree/1753f00fdc36c3a68dd1d7529b736200a933dcd2/docs/prototypes/cash-game-planning). New game opens an explicit prepared-fixture handoff, not a fake roster-creation workflow.
- Distribution is a labelled handoff to #35: input status only; no solver, blind derivation, alternative-depth approval or working Start. Preview correction returns directly and retains later fields. This study issues no chips and calculates no money.
- Reset/reopen/history/Payments are not implemented; locked details only demonstrates chip-set inspectability and the already-required explanation.

## Verification

Chrome browser review passed all six guided walkthroughs and targeted free-play checks:

- Raw blank/malformed quantity retention through Games/resume/simulated restart, untouched versus edited-field timing, zero quantities, padded duplicate numeric values, and an all-zero structurally valid set without claiming distribution feasibility.
- Only-this-game versus explicit one-shot source propagation, reset of the optional choice on leaving/completing, unchanged captured copies in other phases, staged picker selection and cancelled/accepted replacement.
- Save and use changes neither the new template nor the game before replacement acceptance. Deleted-source recovery, case-insensitive/space-trimmed template-name collision, and deliberate dismissal of an entered new-template name were checked.
- Dirty reusable-editor cancellation/Keep editing, interruption without applying unsaved changes, exact invoking-row focus after Escape, default Cancel focus, numeric Next behavior, native radio navigation and retained malformed inputs through layout changes.
- Locked In progress/Completed setup has no editable fields; the Completed explanation calls for reopen before the separate reset. Standalone offline `file://` opening and URL/layout switching worked.

At **320px viewport / 200% app text**, the three chip-row layouts, picker, template management, empty/invalid reusable editor and a removal confirmation had no measured horizontal overflow. Checked chip-screen button targets were at least **48×48**. Quantity-first layout uses matching visual/DOM field order. Eight measured semantic text/background pairs had a minimum contrast of **7.36:1**. No browser exceptions remained in these checks.

These are browser-reference checks, not native certification. Native keyboards, native text scaling, VoiceOver/TalkBack, real durable restart, actual allocations and production integration remain implementation checks.

## Captured screens

Captures isolate the phone surface at a 390px browser viewport; the external layout switcher is hidden for the images, not removed from the interactive prototype.

- Layout comparison: [A · Paired rows](previews/chips-paired.png), [B · Open ledger](previews/chips-ledger.png), [C · Quantity first](previews/chips-stacked.png).
- [Picker](previews/picker.png), [separate template management](previews/templates.png), [explicit-save editor](previews/template-editor.png).
- [No chip rows/templates](previews/empty.png), [invalid raw input](previews/invalid.png), [deleted source / Save as new template](previews/deleted-source.png), [12-denomination list](previews/dense.png).
- [Games](previews/games.png), [locked setup](previews/details.png), [preview handoff](previews/preview.png).
