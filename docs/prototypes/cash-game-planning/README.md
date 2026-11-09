# Cash-game planning — throwaway interaction prototype

**Status: live-discussion choices incorporated; interactive review and final approval pending.**

Decision: [Design cash-game planning and reusable player selection](https://github.com/quirinbrandl/poker-planner/issues/33). Parent map: [MVP user experience and visual design](https://github.com/quirinbrandl/poker-planner/issues/30).

This single HTML file explores the Planning workflow in **Current's always-dark slate foundation**. Following live feedback, this revision adds a single prefilled reserve field, shorter copy, functional icons, direct return from preview-originated corrections, and an accent-color comparison. The human requested different accent options; no replacement color has been approved yet.

Everything in this directory is throwaway, including the in-memory state model. Do not promote it into the application. It selects no framework, storage approach or production module interface.

## Open

Double-click `index.html`. It needs no build, packages, internet connection or server.

Alternatively, from this branch's repository root:

```sh
python3 -m http.server 4174 --bind 127.0.0.1 --directory docs/prototypes/cash-game-planning
```

Open <http://localhost:4174>. All changes are in memory; reloading resets the fixtures. “Simulate restart” only demonstrates the resume contract in memory. It does **not** verify durable local persistence. Inspect the readable state panel to see current raw values and independent saved/captured names.

For the updated settings and accent comparison, open <http://localhost:4174/?screen=settings&variant=blue>. The floating **Accent preview** bar offers Blue, Mint, Lavender, Coral, and Original citron as a reference. Its arrows cycle with wraparound; the dropdown names every option. The URL preserves the selected color. Left/right keyboard shortcuts leave text fields, radios/checkboxes, selects, tab navigation and dialogs alone. Colors change without resetting draft values or navigation. This is an external review control, not a proposed product appearance setting. Feedback is given in chat, not submitted from the page.

## Review

- Open the six-player cash-game draft from Games. It resumes **Game settings**. All five settings are visible; there is no Advanced section.
- Use **Setup steps** to revisit Players. Add/select saved players, create a new player with **Save and add**, remove a participant, then follow the ordinary Continue sequence. Later fields stay filled in.
- Enter `20.005` in Buy-in, leave the field, try Continue, then Games and resume. The raw invalid value and correction need remain. `20,50` and `20.50` are both valid; neither sub-cent amounts nor malformed text are rounded into validity.
- **Chip reserve** is a numeric field prefilled with the automatic count. Typing a value makes it an explicit override, including zero or a value equal to the current automatic count. A custom value stays fixed through roster changes. **Use automatic (N)** restores roster-following behavior; focusing the field alone does not override it. Blank/invalid edits stay visible and require correction.
- Visit **Games → Saved players**, rename or delete a saved entry, and return to the game. Captured names stay unchanged. There is no per-game rename action.
- Cancel an edited reusable name: the discard confirmation preserves the old record until explicit Save. A simulated interruption discards unfinished reusable-editor text; Planning fields remain retained.
- From the preview handoff, edit Players. The primary action becomes **Return to preview**: validate the current step, then directly revisit the whole-plan check. The first setup pass stays sequential. Corrections preserve later values; leaving/resuming also preserves the return context. This explicitly supersedes the earlier sequential-correction decision after the human tried the prototype.
- Change mode through the first setup step. Shared values remain; a tournament payout fixture can be retained while switching away and back. This is only the mode-change boundary, not the tournament editor design.
- Expand **Review controls & guided walkthroughs** for five repeatable scenarios: first use; invalid/resumed input; independent names/collision; mode/reserve retention; and direct return to preview. Each step drives the same in-memory actions as free play.
- Review narrow portrait layout, keyboard interaction and 150%/200% app text. The prototype starts with two independent Planning games; First use clears both the games and saved-player list.

## Decisions incorporated from the live discussion

- Roster-first Players; searchable multi-selection picker; New player creates a reusable entry and game participant explicitly.
- All settings visible together; tappable setup-step list; direct return after a correction opened from preview, with entered values retained.
- Cash games need at least two players to pass Players / Start and a positive whole-cent buy-in of at least EUR 0.01. Incomplete plans can still be left and resumed.
- New buy-in blank; 100 BB; Fewer chips; coverage 4 (minimum 1); automatic reserve `ceil(players / 2)`. Custom reserve is a nonnegative integer, including zero, and stays fixed through roster changes.
- Case-insensitive duplicate-name checking ignores leading/trailing spaces. There is no per-game rename feature. A collision produces a simple error; the host supplies a distinct name through the ordinary new/saved-name editor.
- Errors appear on leaving edited fields; untouched required fields are checked on Continue; displayed errors update during correction. Invalid text is retained.
- EUR decimal dot or comma accepted. Decimal keyboard for money; whole-number keyboard for depth/coverage/reserve; text keyboard for names. Enter advances through numeric fields, then focuses Continue; Enter in the name editor invokes its explicit Save action. No hidden keyboard shortcut starts a game.
- Switching mode edits the same Planning game immediately and retains shared values plus any previously entered tournament payout settings.
- Restart recovery of unfinished **reusable-player editor text** was declined for now. Explicit Save/discard semantics remain; this exception does not weaken retention of raw Planning fields.
- Following hands-on review, the host requested less explanation for self-explanatory controls and more symbols. The revision uses consistent inline stroke icons: labelled primary/navigation actions and fields, plus accessible icon-only row edit/remove/delete controls with named confirmations. Short helper text remains for blind-payment coverage, reserve semantics, the 100-BB recommendation and the independence of saved/game names where editing occurs. Errors, required units, save boundaries and prototype handoff labels remain explicit.

## Concrete interaction proposals to judge in the prototype

These details make the flow clickable and remain subject to the live prototype review:

- Picker selections are staged until Add. An already-added saved player is marked unavailable, even if that saved entry has since been renamed. A collision rejects the entire addition without partially creating records.
- The picker has ordinary **Edit saved player** controls. These edit reusable entries, never game-captured names. Collision errors do not automatically rename, navigate or add a special recovery workflow.
- If New player is opened with existing names selected, **Save and add N players** visibly includes those selections and the new player in one accepted operation. Cancelling returns to the picker. No entered-name data is deliberately discarded without the existing discard confirmation.
- Planning roster removal uses a specific confirmation and leaves the reusable player intact. Saved-player/game deletion also names its scope and has Cancel. The fixture reset is an external review tool, not a product undo feature.
- The step list allows reached steps, preserving the guided first pass. “Complete” describes local input validity, not allocation feasibility or game start. The preview marks earlier edits for renewed review.
- A preview-originated correction validates its current step before returning and rechecks the whole plan. If switching mode introduces a missing payout step, the preview exposes its correction route even if that step was not previously reached. Back still moves to the preceding setup step; no navigation accepts a distribution or starts a game.
- The single reserve field replaces the earlier Automatic / Custom selector. The small **Use automatic (N)** reset action and brief automatic/custom status are proposed details of the requested input treatment, retaining the established reserve rules.
- Valid saved names are trimmed at explicit Save while preserving their capitalization. Blank/whitespace-only names are invalid. No arbitrary player/name/count cap is proposed.
- Money entry supports ungrouped digits with up to two decimal digits after a dot or comma. Grouping separators, scientific notation and currency symbols pasted into the field produce retained invalid input. Canonical production money parsing must use exact cents; this fixture-only UI is not financial calculation code.

## Handoffs and scope boundaries

The **Chip set** screen is a clearly labelled editor-return stub: complete fixture versus incomplete editor state, same game/step on return, later settings retained. Selecting the fixture copies chip data for this game only. Detailed chip rows, template selection and propagation choices belong to [Design chip-set editing and template reuse](https://github.com/quirinbrandl/poker-planner/issues/34).

The **Distribution preview** is a clearly labelled input-review handoff, with whole-plan input validation and links to source steps. It never computes a distribution or claims feasibility. No blind pair, chip-money conversion, alternative-depth acceptance or working Start is faked. Those belong to [Design distribution preview, alternative depth, and Start](https://github.com/quirinbrandl/poker-planner/issues/35). Start remains an explained, discoverable unavailable control. In-progress/read-only setup belongs to subsequent lifecycle designs, not an editable Planning fixture.

Tournament payouts are a retained `50 / 30 / 20` fixture for exercising mode switching. Their editor and validation belong to [Design tournament payout setup and starting](https://github.com/quirinbrandl/poker-planner/issues/39). The shared two-player and positive-buy-in validation already applies to that mode; no tournament implementation is introduced here.

## Accent options

These are deliberately color comparisons of the same revised layout, as requested by the human. The base slate surfaces and hierarchy stay consistent so the accents can be compared directly. The original citron is retained only as a reference; Blue is the initial review option, not an approved winner.

| URL variant | Accent | Text on primary | Selected surface |
| --- | --- | --- | --- |
| [`blue`](previews/settings-blue.png) | `#8EC5FF` | `#10263D` | `#203347` |
| [`mint`](previews/settings-mint.png) | `#7EE0C3` | `#103126` | `#203B34` |
| [`lavender`](previews/settings-lavender.png) | `#C9B5FF` | `#2B1E45` | `#322B45` |
| [`coral`](previews/settings-coral.png) | `#FFB39C` | `#3B2119` | `#422F2A` |
| [`citron`](previews/settings-citron.png) | `#DAF587` | `#1E2910` | `#2C3823` |

## Browser review

The first revision's Chrome smoke review covered its four walkthroughs and free-play flow: edited-field validation; invalid raw-value retention through Games/resume; blocked Continue and correction focus; decimal-comma input; retained payout/shared values on mode switches; explicit custom zero; case-insensitive duplicate names; captured-name independence and collision rejection; already-added identity feedback; batch addition; cancel/discard behavior; and simulated interruption of reusable editing. No browser exceptions remained in those checks. Confirmation initially focused Cancel, and Escape returned focus to the invoking control. Follow-up checks for the revised reserve control, return route, icon treatment and palette comparison are recorded with the updated assets.

The revised prototype passed all five walkthroughs and targeted browser checks:

- Reserve prefill; focus without overriding; explicit zero; invalid text retained across a color change; reset to automatic; roster-following defaults; and an explicitly typed value equal to the default remaining fixed after roster changes.
- Direct correction return, including leaving/resuming the correction, rejecting a one-player roster, and reaching a newly required payout step from the whole-plan preview check.
- All five accent options, URL/reload retention, preserving invalid fields during a palette change, native input/radio arrow-key behavior, and standalone `file://` use.
- Accessible names on icon-only row actions, at least 48×48 checked roster controls, and Escape returning focus to the invoking icon after cancelling removal.

No browser exceptions occurred in these revised checks. Across eight checked semantic text/background pairs for each palette, the minimum contrast was **6.51:1**. The checked pairs include primary text on accent, accent on background/selected tint, primary and supporting text on selected tint, primary/supporting text on base surfaces, and error text on its error surface.

At a **320px viewport / 200% app text**, the original revision's Games/settings/step-list/Players/picker/name-editor/error screens had no measured horizontal overflow. The revised settings and color bar were checked in all five palettes, plus invalid reserve, preview, correction footer, removal dialog, picker and saved-name editor; all also had no horizontal overflow. Native text scaling, keyboards, VoiceOver/TalkBack and actual restart persistence remain implementation-time checks.

Captures use a 390px browser viewport, with the app surface isolated from the external review controls:

- [Games](previews/games.png)
- [All-visible game settings](previews/settings.png)
- [Invalid setup](previews/invalid-settings.png)
- [Players](previews/players.png)
- [Saved-player picker](previews/picker.png)
- [Distribution handoff](previews/preview-handoff.png)
