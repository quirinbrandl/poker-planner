# Application interface

How screens use game management. Everything here is exported from `@/game-management` (types) and
`@/state` (provider and hooks). Screens never import anything beneath those two paths, never compute
validation or totals, and never talk to storage. Vocabulary follows [`CONTEXT.md`](../CONTEXT.md).

Covers Planning (#11), saved players (#12) and chip set templates (#13). Later work adds
distribution preview, Start, play, results and Payments to the same object.

## Basics

### Setup

```tsx
// src/app/_layout.tsx
<GameManagementProvider loading={<Splash />} renderError={(e) => <DataError message={e.message} />}>
  <Stack />
</GameManagementProvider>
```

The provider opens the platform store (SQLite on Android/iOS, `localStorage` on the web preview),
loads everything once, then renders its children. `renderError` receives
`UnsupportedDataVersionError` (data written by a newer app) or `CorruptDataError`; in both cases
nothing was written. Tests and galleries pass `store={createMemoryStore()}`.

```ts
const app = useGameManagement();          // operations
const games = useGames();                 // reads, re-render on change
const plan = usePlanningView(gameId);     // PlanningView | null
```

Hooks: `useGames`, `usePlanningView(gameId)`, `usePlayerPicker(gameId)`, `useSavedPlayers`,
`useTemplates`, `useWorkingLocation`, `usePersistenceStatus`. For any other read, call the method
on `app` inside the component; reads are cheap, memoized and return the same object until
something relevant changes.

### Reads and writes

- Reads are synchronous and reflect every operation immediately, including one whose commit is
  still running. That is what lets a controlled `TextInput` bind straight to `FieldView.text`.
- Writes return a `Promise` of a result. They resolve after the change is committed to the phone.
  They reject (throw) only if storage itself fails; `usePersistenceStatus()` then reports
  `{ state: 'failed', message }`, the change stays in memory and is retried with the next commit.
  Use `saving` / `saved` / `failed` for truthful local-draft feedback ("Saved on this phone").
- You may fire edits without awaiting them (typing). Commits are serialized in call order.

### Result variants

Every write returns a discriminated union on `status`:

| `status` | Meaning | Changed anything? |
| --- | --- | --- |
| `accepted` | Applied and committed. May carry ids (`gameId`, `rowId`, ...). | yes |
| `savedInvalid` | A Planning edit was saved exactly as typed; `problems` are the edited field's problems. | yes |
| `stepInvalid` | Continue did not advance; `problems` are the step's problems, now `revealed`. | only the "Continue attempted" flag |
| `needsConfirmation` | Nothing changed. Show `confirmation` (its `kind` says which dialog); on accept call again with `{ confirmed: true }` (or the follow-up operation named below). | no |
| `rejected` | Nothing changed. `reason: { code, message, problems? }`; show `message`. | no |

A `Problem` is `{ code, field, message }`. `code` is stable (for logic and tests), `message` is the
English copy to display, `field` says where: `'roster' | 'buyIn' | 'depth' | 'coverage' | 'reserve'
| 'chipSet' | 'chipValue:<rowId>' | 'chipQuantity:<rowId>' | 'payoutSchedule' |
'payoutShare:<rowId>' | 'name'`.

Every game-scoped operation can be rejected with `gameNotFound` or `setupLocked` (not in Planning).

### Showing errors

Problems are always reported; the screen decides when to show them. Each input is a `FieldView`:

```ts
interface FieldView { text: string; problem: Problem | null; edited: boolean; revealed: boolean }
```

`revealed` is true once the host edited the field or Continue failed on its step (both persist
across restart). Show `problem` when `revealed` and the field is not being typed into for the
first time in this session (that is: after blur, or immediately for restored fields and after a
failed Continue). Once shown, keep it updating while the host corrects it.

## Games

| Operation | Result |
| --- | --- |
| `games.list(): GameCard[]` | In progress first, then Planning, each newest-created first. Completed games are not listed (History comes later). |
| `games.get(gameId): GameCard \| null` | |
| `games.create(mode)` | `accepted { gameId, location }`. Choosing the mode creates the autosaved game and opens Players. |
| `games.open(gameId)` | `accepted { location }` (Planning: its last visited step) \| `rejected gameNotFound`. Records the working location. |
| `games.delete(gameId)` | `accepted` \| `rejected gameNotFound`. Permanent; confirm in the screen first. Touches only that game. |

```ts
interface GameCard {
  id: string; mode: 'cash' | 'tournament'; phase: 'planning' | 'inProgress' | 'completed';
  createdAt: string;                 // ISO 8601; format it for the card
  participantNames: string[];        // captured names, joining order
  lastStep: StepId | null; lastStepTitle: string | null;   // Planning only
}
```

## Planning

`planning.getView(gameId): PlanningView | null` (or `usePlanningView`) is everything a Planning step
shows. `null` means the game is gone or no longer in Planning.

```ts
interface PlanningView {
  gameId; mode; phase: 'planning'; createdAt;
  steps: StepView[];        // this mode's steps: { id, title, status, statusLabel, reached, current }
  currentStep: StepId;      // last visited step
  returnToPreview: boolean; // label the primary action "Return to preview"
  players:  { participants: { id, name, savedPlayerId, joinOrder }[]; problems; continueAttempted };
  chipSet:  { rows: ChipRowView[]; summary: ChipSetSummary; setProblem; problems;
              source: { kind: 'none' } | { kind: 'template', templateId, templateName }
                    | { kind: 'deletedTemplate', templateId };
              hasEnteredRows; continueAttempted };
  settings: { buyIn: FieldView; depth: FieldView; recommendedDepthBb: 100;
              preference: 'fewer' | 'more'; coverage: FieldView;
              reserve: FieldView & { mode: 'automatic' | 'custom'; automaticCount: number };
              problems; continueAttempted };
  payoutSchedule: { rows: { id, place, share: FieldView }[]; problems; continueAttempted };
  preview: { blockers: { step, title, problems }[]; setupComplete: boolean };
}
interface ChipRowView { id; value: FieldView; quantity: FieldView; color: ChipColor | null; blank: boolean }
type ChipSetSummary = { kind: 'empty' | 'incomplete' | 'valid'; label: string; /* valid: */ denominations, chips, chipUnits }
```

Step ids: `'mode' | 'players' | 'chipSet' | 'settings' | 'payouts' | 'preview'` (`payouts` only for
tournaments). Status is `'notFilledIn' | 'needsAttention' | 'complete'` with `statusLabel`
"Not filled in" / "Needs attention" / "Complete". Complete means valid input, not a feasible
distribution. `summary.label` is the ready-made "N denominations · M chips · K chip units",
"Incomplete chip set" or "No denominations yet".

### Wizard

| Operation | Result |
| --- | --- |
| `continueFromStep(gameId, step)` | `accepted { nextStep }` \| `stepInvalid { problems }` \| `needsConfirmation { confirmation: ChipSetScopeConfirmation }` (valid Chip set only) \| `rejected stepNotInMode \| noNextStep` (preview: Start is not available yet). During a correction a valid step returns `nextStep: 'preview'`. |
| `completeChipSetStep(gameId, scope)` | `accepted { nextStep: 'settings' \| 'preview', templateId? }` \| `stepInvalid` \| `rejected sourceTemplateMissing \| invalidTemplate` (name problems in `reason.problems`). |
| `goBack(gameId)` | `accepted { step }` \| `rejected noPreviousStep` (on Choose mode; Back there is the screen's exit to Games). Keeps the correction context. |
| `goToStep(gameId, step, { fromPreview? })` | `accepted { step }` \| `rejected stepNotReached \| stepNotInMode`. Only reached steps, except `fromPreview: true` (a preview correction link), which may open any step of the mode and sets `returnToPreview`. Opening `preview` clears it. |
| `changeMode(gameId, mode)` | `accepted`. Same plan; participants, chip set, settings and payout entries kept. |

Wizard operations record the working location themselves. The return-to-preview context survives
leaving and restart; it ends when the host arrives on the preview.

```ts
type ChipSetScope = { kind: 'onlyThisGame' } | { kind: 'updateSourceTemplate' } | { kind: 'saveAsNewTemplate'; name: string };
interface ChipSetScopeConfirmation {
  kind: 'chipSetScope';
  options: ('onlyThisGame' | 'updateSourceTemplate' | 'saveAsNewTemplate')[]; // first = default
  sourceTemplate: { id; name } | null; sourceTemplateDeleted: boolean; returnsToPreview: boolean;
}
```

The scope choice is one-shot and never stored: Cancel in the popup just closes it.

### Players

| Operation | Result |
| --- | --- |
| `getPlayerPicker(gameId)` | `{ savedPlayerId, name, inGame, capturedName }[]`, alphabetical. `inGame` matches by identity, so a renamed saved player already in the game stays unavailable. |
| `addSavedPlayers(gameId, savedPlayerIds)` | `accepted { participantIds }` \| `rejected noPlayersSelected \| savedPlayerNotFound \| alreadyInGame \| nameTakenInGame`. All or nothing. |
| `createSavedPlayerAndAdd(gameId, name, alsoAddSavedPlayerIds?)` | `accepted { savedPlayerId, participantIds }` \| `rejected nameRequired \| duplicateName \| …as above`. "Save and add (N players)"; all or nothing. |
| `removeParticipant(gameId, participantId)` | `accepted` \| `rejected participantNotFound`. Confirm in the screen first. Keeps the saved player. |

### Chip set

| Operation | Result |
| --- | --- |
| `addChipRow(gameId)` | `accepted { rowId }`: blank row, No color, appended. |
| `setChipValueText(gameId, rowId, text)` / `setChipQuantityText(...)` | `accepted` \| `savedInvalid` \| `rejected rowNotFound`. |
| `setChipColor(gameId, rowId, color \| null)` | `accepted` \| `rejected invalidColor \| rowNotFound`. `null` = No color. |
| `removeChipRow(gameId, rowId, { confirmed? })` | blank row: `accepted`; otherwise `needsConfirmation { kind: 'removeChipRow', index, valueText, quantityText }` until `confirmed`. |
| `applyTemplate(gameId, templateId, { confirmed? })` | `accepted` \| `needsConfirmation { kind: 'replaceChipSet', templateName }` (game has entered rows) \| `rejected templateNotFound`. Copies rows and colours, links the source. |
| `createTemplateAndApply(gameId, { name, rows }, { confirmed? })` | "Save and use": `accepted { templateId }` \| `needsConfirmation replaceChipSet` \| `rejected invalidTemplate`. |
| `saveChipSetAsTemplate(gameId, name)` | `accepted { templateId }` (linked as source) \| `stepInvalid` \| `rejected invalidTemplate`. |

### Game settings

| Operation | Result |
| --- | --- |
| `setSettingText(gameId, 'buyIn' \| 'depth' \| 'coverage' \| 'reserve', text)` | `accepted` \| `savedInvalid`. Typing into `reserve` makes it custom (also `''`, `'0'` or the automatic value). |
| `useAutomaticReserve(gameId)` | `accepted`. "Use automatic (N)" with N = `settings.reserve.automaticCount`. |
| `setDistributionPreference(gameId, 'fewer' \| 'more')` | `accepted`. |

While automatic, `settings.reserve.text` is the live automatic count. Focusing the field must not
call anything; only typing does.

### Payout schedule (placeholder)

`addPayoutRow(gameId)` → `accepted { rowId }`, `setPayoutShareText(gameId, rowId, text)` →
`EditResult`, `removePayoutRow(gameId, rowId)`. Rows are raw share text per place. The only rule so
far is "at least one paid place" (`noPaidPlaces`); presets and share validation arrive with
`src/domain/payouts` and may change these operations.

## Saved players

| Operation | Result |
| --- | --- |
| `savedPlayers.list(): SavedPlayerView[]` | `{ id, name }`, alphabetical. |
| `savedPlayers.create(name)` | `accepted { savedPlayerId }` \| `rejected nameRequired \| duplicateName` (`reason.problems[0].field === 'name'`). |
| `savedPlayers.rename(id, name)` | `accepted` \| `rejected nameRequired \| duplicateName \| savedPlayerNotFound`. |
| `savedPlayers.delete(id)` | `accepted` \| `rejected savedPlayerNotFound`. Confirm in the screen first. |

Names are trimmed on save, keep their capitalization, and are unique ignoring case and outer spaces.
No game ever changes when a saved player is renamed or deleted. Editor text is not persisted until
Save (approved exception), so the editor keeps its own unsaved text in component state.

## Chip set templates

| Operation | Result |
| --- | --- |
| `templates.list(): TemplateView[]` | `{ id, name, denominations, summary }`, alphabetical. `denominations` (value, quantity, color, in row order) feed the compact chip tray. |
| `templates.get(id)` | `TemplateView \| null`. |
| `templates.getEditorDraft(id)` | `{ name, rows: ChipRowInput[] } \| null`: starting point for the editor. |
| `templates.describeRows(rows)` | Live validation of unsaved editor rows: `{ rows: Record<rowId, { value, quantity }>, setProblem, problems, summary }`. Stores nothing. |
| `templates.create({ name, rows })` | `accepted { templateId }` \| `rejected invalidTemplate` with every name/row problem in `reason.problems`. |
| `templates.update(id, { name, rows })` | `accepted` \| `rejected invalidTemplate \| templateNotFound`. |
| `templates.rename(id, name)` | as `update`, rows kept. |
| `templates.delete(id)` | `accepted` \| `rejected templateNotFound`. Games keep their copies. |

`ChipRowInput` is `{ id, valueText, quantityText, color }`; the editor chooses row ids (a counter is
fine). Template rows follow the same rules as a game's chip set.

## Working location

`location.get(): WorkingLocation` is where to reopen the app:
`{ kind: 'games' | 'history' | 'savedPlayers' | 'templates' }` or
`{ kind: 'planning', gameId, step }`. It falls back to Games when the game is gone. Reading it never
applies anything. Call `location.set({ kind: ... })` when the host navigates to Games, History,
Saved players or Chip set templates; wizard operations and `games.open` record Planning locations.
Editors and pickers are not locations: after restart the host lands on the screen they came from.

## Examples

Typing into the buy-in field:

```tsx
const plan = usePlanningView(gameId)!;
const field = plan.settings.buyIn;
const [typing, setTyping] = useState(false);   // first edit in progress, not yet left
const showError = field.revealed && (!typing || plan.settings.continueAttempted);
<TextField
  label="Buy-in per player" unit="EUR" keyboardType="decimal-pad"
  value={field.text}
  onChangeText={(text) => { if (!field.edited) setTyping(true); void app.planning.setSettingText(gameId, 'buyIn', text); }}
  onBlur={() => setTyping(false)}
  error={showError ? field.problem?.message : undefined}
/>
```

Pressing Continue (or Return to preview) on Game settings:

```ts
const result = await app.planning.continueFromStep(gameId, 'settings');
switch (result.status) {
  case 'accepted': router.replace(`/game/${gameId}/planning/${routeFor(result.nextStep)}`); break;
  case 'stepInvalid': focusField(result.problems[0].field); break;   // errors are now revealed
  case 'rejected': showMessage(result.reason.message); break;
}
```

Continue on Chip set, then "Also update template":

```ts
const result = await app.planning.continueFromStep(gameId, 'chipSet');
if (result.status === 'needsConfirmation') {
  const choice = await showScopePopup(result.confirmation);   // undefined on Cancel
  if (choice) {
    const done = await app.planning.completeChipSetStep(gameId, choice); // e.g. { kind: 'updateSourceTemplate' }
    if (done.status === 'accepted') router.replace(stepRoute(gameId, done.nextStep));
    else if (done.status === 'rejected') showNameError(done.reason.problems?.[0]?.message ?? done.reason.message);
  }
}
```

Choosing a template in the picker:

```ts
let result = await app.planning.applyTemplate(gameId, templateId);
if (result.status === 'needsConfirmation' && (await confirmReplace(result.confirmation.templateName))) {
  result = await app.planning.applyTemplate(gameId, templateId, { confirmed: true });
}
```

## Extending game management

- `src/game-management/application.ts` assembles the areas; `index.ts` only re-exports.
- Each area keeps its own folder: `games/`, `planning/`, `reusable/`, `location/`, plus `core/`
  (documents, results, runtime, persistence) and `shared/` (names, numbers, chip rows).
- `planning/validation.ts` → `validatePlan(game)` returns the parsed `ValidPlan` (participant ids,
  denominations, buy-in cents, requested depth, preference, coverage, reserve) for distribution.
- New game sections (accepted setup, play, completion) are new fields on `GameDocument` in
  `core/documents.ts`; incompatible changes bump `SCHEMA_VERSION` with a migration in
  `core/persistence.ts`.
- An operation reads `rt.state()`, validates, builds the next immutable state and calls
  `rt.apply(next)` once; changed documents are found by identity and committed together.
