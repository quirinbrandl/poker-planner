# Game-management interface

The approved primary seam is `GameManagement` from `src/game-management/index.ts`. Both `PlanningApp` and the main integration tests use it. The module owns validation, atomic persistence, and observable state; screens do not orchestrate those responsibilities.

## Host operations

- `createPlan(mode)`: immediately persist an empty Planning record with stable game identity and UTC creation date-time, before the first field edit.
- `listPlans()`: independent snapshots, newest-created first.
- `getPlan(id)`: current snapshot, or `null` if absent.
- `editPlan(id, edit)`: change shared setup, add/rename/remove a participant, or add/edit/remove a chip row. Field updates are partial; stable identity and lifecycle metadata are not editable fields.
- `close()`: release the owned database connection; safe to repeat. Do not use the instance afterward.

`openLocalGames()` provisions the native database and UUID source. Tests provision an isolated real SQLite adapter with `createGameManagement(database, newId)`. This is composition-time dependency wiring, not per-operation storage orchestration.

## Results and invariants

- `saved-invalid`: the exact draft is durably saved, with `game.fieldErrors` identifying fields that need attention. This is **not a rejected operation**.
- `saved`: the exact draft is durably saved and current field validation passes. This does **not** promise a feasible distribution or authorize Start.
- `rejected`: the operation targets a missing game, participant, or chip row, with an actionable `reason`. No state changes, including after reopening the store.
- Storage/opening failures throw, never masquerade as a saved result. Transactions roll back. The UI retains failed text on screen, blocks leaving/editing, and offers retry; it does not claim that failed writes survive process termination.

There are deliberately no Start, reset, reopen, delete-game, allocation, contribution, or settlement operations yet. No Planning operation records chip issuance or monetary results. Confirmation proposals and validated final results must become distinct result variants **when those capabilities are introduced**; do not turn `saved` into implicit confirmation or completion. There is currently no destructive game operation to decline.

Every edit reads the latest stored game inside an immediate transaction, so separate connections cannot overwrite unrelated saved fields with stale whole-game snapshots. Returned objects are detached snapshots; sorting or mutating them does not change persistence. A snapshot is not a command to save an entire game.

## Draft fields

Editable text is retained verbatim, including empty or malformed numeric strings. A field error does not erase, trim, round, truncate, or replace the draft. Validation is derived again on read.

- Monetary input is explicitly **EUR cents** (`2000` = EUR 20.00), positive for the shared buy-in. Fractional cents, decimal separators, signs, exponent notation, and surrounding whitespace are not accepted numeric formats.
- Denominations, depth, and coverage are positive whole numbers; physical quantities and explicit reserve are nonnegative whole numbers. Validated numeric values must be representable as safe integers (through 9,007,199,254,740,991), rather than silently losing precision.
- Denominations must be unique by numeric value. Both affected rows receive errors rather than being merged.
- Blank participant names and duplicates (Unicode-normalized, trimmed, case-insensitive comparison) receive errors; the original names remain untouched. Participant UUIDs and monotonically assigned joining order are never based on name, list position, or display sorting. Removing a participant does not reuse their joining order.
- Tournament roster feedback requires two participants. Empty cash rosters also receive feedback. There is no roster maximum.
- Requested depth starts at `100` in both modes and stays a recommendation. Coverage starts at `4`, minimum `1`.
- Automatic reserve is `ceil(roster count / 2)` including unfinished participant entries. Explicit reserve remains explicit across roster changes, including zero and invalid drafts. An invalid explicit reserve has `reserveTarget: null`, never an automatic fallback. Selecting Automatic deliberately relinquishes the override.

A positive quantity or field-valid chip set does not prove distribution feasibility. The app says so and exposes no working Start action. No currency conversion or tournament chip-to-money value is calculated.

## Extending this slice

Keep future solvers, inventory checks, and settlement behind this interface. Add migrations without dropping old drafts. Extend discriminated results for proposals/acceptance and lifecycle guards before exposing corresponding UI actions. Preserve atomic rejection, stable joining order, detached snapshots, and raw invalid Planning values. Later lifecycle, reset/reopen, and settlement rules are in issue #10; none are implemented or bypassed by this first Planning slice.
