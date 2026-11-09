# Cash-game planning — throwaway interaction prototype

**Status: live-discussion choices incorporated; interactive review and final approval pending.**

Decision: [Design cash-game planning and reusable player selection](https://github.com/quirinbrandl/poker-planner/issues/33). Parent map: [MVP user experience and visual design](https://github.com/quirinbrandl/poker-planner/issues/30).

This single HTML file explores the agreed Planning workflow in the approved **Current**, always-dark visual foundation. The design question is how navigation, player capture, explicit reusable-record saving, validation and incomplete Planning drafts fit together. It is a behavior prototype with guided walkthroughs, rather than another visual-direction comparison.

Everything in this directory is throwaway, including the in-memory state model. Do not promote it into the application. It selects no framework, storage approach or production module interface.

## Open

Double-click `index.html`. It needs no build, packages, internet connection or server.

Alternatively, from this branch's repository root:

```sh
python3 -m http.server 4174 --bind 127.0.0.1 --directory docs/prototypes/cash-game-planning
```

Open <http://localhost:4174>. All changes are in memory; reloading resets the fixtures. “Simulate restart” only demonstrates the resume contract in memory. It does **not** verify durable local persistence. Inspect the readable state panel to see current raw values and independent saved/captured names.

## Review

- Open the six-player cash-game draft from Games. It resumes **Game settings**. All five settings are visible; there is no Advanced section.
- Use **Setup steps** to revisit Players. Add/select saved players, create a new player with **Save and add**, remove a participant, then follow the ordinary Continue sequence. Later fields stay filled in.
- Enter `20.005` in Buy-in, leave the field, try Continue, then Games and resume. The raw invalid value and correction need remain. `20,50` and `20.50` are both valid; neither sub-cent amounts nor malformed text are rounded into validity.
- Switch reserve to Custom and enter `0`. Change the roster: the explicit value persists. Switch to Automatic: the count follows half the roster rounded up.
- Visit **Games → Saved players**, rename or delete a saved entry, and return to the game. Captured names stay unchanged. There is no per-game rename action.
- Cancel an edited reusable name: the discard confirmation preserves the old record until explicit Save. A simulated interruption discards unfinished reusable-editor text; Planning fields remain retained.
- From the preview handoff, edit Players. Return through Chip set and Game settings normally, with values retained. There is no special Return to preview shortcut.
- Change mode through the first setup step. Shared values remain; a tournament payout fixture can be retained while switching away and back. This is only the mode-change boundary, not the tournament editor design.
- Expand **Review controls & guided walkthroughs** for four repeatable scenarios: first use; invalid/resumed input; independent names/collision; and mode/reserve retention. Each step drives the same in-memory actions as free play.
- Review narrow portrait layout, keyboard interaction and 150%/200% app text. The prototype starts with two independent Planning games; First use clears both the games and saved-player list.

## Decisions incorporated from the live discussion

- Roster-first Players; searchable multi-selection picker; New player creates a reusable entry and game participant explicitly.
- All settings visible together; tappable setup-step list; sequential corrections with entered values retained.
- Cash games need at least two players to pass Players / Start and a positive whole-cent buy-in of at least EUR 0.01. Incomplete plans can still be left and resumed.
- New buy-in blank; 100 BB; Fewer chips; coverage 4 (minimum 1); automatic reserve `ceil(players / 2)`. Custom reserve is a nonnegative integer, including zero, and stays fixed through roster changes.
- Case-insensitive duplicate-name checking ignores leading/trailing spaces. There is no per-game rename feature. A collision produces a simple error; the host supplies a distinct name through the ordinary new/saved-name editor.
- Errors appear on leaving edited fields; untouched required fields are checked on Continue; displayed errors update during correction. Invalid text is retained.
- EUR decimal dot or comma accepted. Decimal keyboard for money; whole-number keyboard for depth/coverage/reserve; text keyboard for names. Enter advances through numeric fields, then focuses Continue; Enter in the name editor invokes its explicit Save action. No hidden keyboard shortcut starts a game.
- Switching mode edits the same Planning game immediately and retains shared values plus any previously entered tournament payout settings.
- Restart recovery of unfinished **reusable-player editor text** was declined for now. Explicit Save/discard semantics remain; this exception does not weaken retention of raw Planning fields.

## Concrete interaction proposals to judge in the prototype

These details make the flow clickable and remain subject to the live prototype review:

- Picker selections are staged until Add. An already-added saved player is marked unavailable, even if that saved entry has since been renamed. A collision rejects the entire addition without partially creating records.
- The picker has ordinary **Edit saved player** controls. These edit reusable entries, never game-captured names. Collision errors do not automatically rename, navigate or add a special recovery workflow.
- If New player is opened with existing names selected, **Save and add N players** visibly includes those selections and the new player in one accepted operation. Cancelling returns to the picker. No entered-name data is deliberately discarded without the existing discard confirmation.
- Planning roster removal uses a specific confirmation and leaves the reusable player intact. Saved-player/game deletion also names its scope and has Cancel. The fixture reset is an external review tool, not a product undo feature.
- The step list allows reached steps, preserving the guided first pass. “Complete” describes local input validity, not allocation feasibility or game start. The preview marks earlier edits for renewed review.
- Valid saved names are trimmed at explicit Save while preserving their capitalization. Blank/whitespace-only names are invalid. No arbitrary player/name/count cap is proposed.
- Money entry supports ungrouped digits with up to two decimal digits after a dot or comma. Grouping separators, scientific notation and currency symbols pasted into the field produce retained invalid input. Canonical production money parsing must use exact cents; this fixture-only UI is not financial calculation code.

## Handoffs and scope boundaries

The **Chip set** screen is a clearly labelled editor-return stub: complete fixture versus incomplete editor state, same game/step on return, later settings retained. Selecting the fixture copies chip data for this game only. Detailed chip rows, template selection and propagation choices belong to [Design chip-set editing and template reuse](https://github.com/quirinbrandl/poker-planner/issues/34).

The **Distribution preview** is a clearly labelled input-review handoff, with whole-plan input validation and links to source steps. It never computes a distribution or claims feasibility. No blind pair, chip-money conversion, alternative-depth acceptance or working Start is faked. Those belong to [Design distribution preview, alternative depth, and Start](https://github.com/quirinbrandl/poker-planner/issues/35). Start remains an explained, discoverable unavailable control. In-progress/read-only setup belongs to subsequent lifecycle designs, not an editable Planning fixture.

Tournament payouts are a retained `50 / 30 / 20` fixture for exercising mode switching. Their editor and validation belong to [Design tournament payout setup and starting](https://github.com/quirinbrandl/poker-planner/issues/39). The shared two-player and positive-buy-in validation already applies to that mode; no tournament implementation is introduced here.

## Browser review

Chrome smoke review covered all four walkthroughs and the free-play flow: edited-field validation; invalid raw-value retention through Games/resume; blocked Continue and correction focus; decimal-comma input; ordinary sequential correction; retained payout/shared values on mode switches; explicit custom zero; case-insensitive duplicate names; captured-name independence and collision rejection; already-added identity feedback; batch addition; cancel/discard behavior; and simulated interruption of reusable editing. No browser exceptions remained in these checks. Confirmation initially focused Cancel, and Escape returned focus to the invoking control.

At a **320px viewport / 200% app text**, Games, settings, the step-list dialog, Players, the picker, new-player editing and name-error states had no measured horizontal overflow. Native text scaling, keyboards, VoiceOver/TalkBack and actual restart persistence remain implementation-time checks.

Captures use a 390px browser viewport, with the app surface isolated from the external review controls:

- [Games](previews/games.png)
- [All-visible game settings](previews/settings.png)
- [Invalid setup](previews/invalid-settings.png)
- [Players](previews/players.png)
- [Saved-player picker](previews/picker.png)
- [Distribution handoff](previews/preview-handoff.png)
