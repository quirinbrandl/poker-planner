# Application interface

How screens use game management. Everything here is exported from `@/game-management` (types) and
`@/state` (provider and hooks). Screens never import anything beneath those two paths, never compute
validation or totals, and never talk to storage. Vocabulary follows [`CONTEXT.md`](../CONTEXT.md).

Covers Planning (#11), saved players (#12), chip set templates (#13), Distribution preview and
Start (#14–#17, tournament Start of #26), Return to Planning, the In progress read model, rebuys
and late entry (#19–#21), cash results (#18), corrections of recorded play (#22, #23 and the
historical corrections of #27), tournament eliminations and completion.

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

Hooks: `useGames`, `usePlanningView(gameId)`, `useDistributionPreview(gameId)`,
`usePlayView(gameId)`, `usePlayScreen(gameId)`, `useBankReserve(gameId)`, `useGameDetails(gameId)`,
`useAddPlayer(gameId)`, `useCashResults(gameId)`, `useCountEditor(gameId, participantId, showErrors?)`,
`useCashPlayer(gameId, participantId)`, `useCorrectionEditor(gameId, participantId, showErrors?)`,
`usePlayerBuyIns(gameId, participantId)`, `useRebuyMixEditor(gameId, participantId, options)`,
`useFix(gameId, start)`, `useTournamentPlay(gameId)`, `useTournamentResults(gameId)`,
`useTournamentPlayer(gameId, participantId)`, `useOrderEditor(draft)`, `usePlayerPicker(gameId)`,
`usePayments(gameId)`, `useHistory`, `useSavedPlayers`, `useTemplates`, `useWorkingLocation`,
`usePersistenceStatus`. For any other read, call the method
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

Every game-scoped operation can be rejected with `gameNotFound` or `setupLocked` (not in Planning;
message "Setup is locked. To change it, use ⋯ → Return to Planning.").

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
| `games.list(): GameCard[]` | In progress first, then Planning, each newest-created first. Completed games are not listed (they are on History). |
| `games.history(): HistoryGameView[]` | Completed games, most recently finished first (`useHistory`; its length is the Games row's "3 games"). See [Completion](#completion-calculate-payments-payments-reopen-and-history). |
| `games.get(gameId): GameCard \| null` | |
| `games.create(mode)` | `accepted { gameId, location }`. Choosing the mode creates the autosaved game and opens Players. |
| `games.open(gameId)` | `accepted { location }` (Planning: its last visited step; In progress: Play, a reopened game Results; Completed: `{ kind: 'payments', gameId, from: 'history' }`) \| `rejected gameNotFound`. Records the working location. Opening a tournament onto Payout schedule preselects like the wizard does. |
| `games.delete(gameId)` | `accepted` \| `rejected gameNotFound`. Permanent; confirm in the screen first. Touches only that game; a location in it falls back to History (Completed) or Games. |

```ts
interface GameCard {
  id: string; mode: 'cash' | 'tournament'; phase: 'planning' | 'inProgress' | 'completed';
  createdAt: string;                 // ISO 8601; format it for the card
  participantNames: string[];        // captured names, joining order (In progress: everyone who joined)
  startedAt: string | null;          // In progress / Completed: ISO 8601 of Start
  finishedAt: string | null;         // Completed: ISO 8601 of Calculate Payments
  reopened: boolean;                 // In progress after Reopen, until Payments are calculated again
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
  payoutSchedule: PayoutScheduleView;   // see Payout schedule below
  preview: { blockers: { step, title, problems }[]; setupComplete: boolean };  // recommendation: see below
}
interface ChipRowView { id; value: FieldView; quantity: FieldView; color: ChipColor | null;
                       chipCount: number | null /* valid quantity, for the chip case */; blank: boolean }
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
| `continueFromStep(gameId, step)` | `accepted { nextStep }` \| `stepInvalid { problems }` \| `needsConfirmation { confirmation: ChipSetScopeConfirmation }` (valid Chip set only) \| `rejected stepNotInMode \| noNextStep` (preview: use `start`). During a correction a valid step returns `nextStep: 'preview'`. |
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

### Payout schedule

Tournament step 5 of 6 (C · Prize ladder). Shares are typed percentages, stored exactly as typed;
the rules come from `src/domain/payouts`. While the mode is Cash game the step is hidden, its
schedule kept and never validated.

**Preselection.** Whenever a wizard operation opens the step (`continueFromStep`, `goToStep`,
`goBack`) in a tournament with at least two players and no schedule, the suggested preset
(2 players: Winner takes all, 3–6: Top 2, 7+: Top 3) becomes the plan's schedule and is saved.
After that only the operations below change it; roster changes and mode switches never do.

| Operation | Result |
| --- | --- |
| `choosePayoutPreset(gameId, presetId)` | `accepted` \| `rejected presetUnavailable` ("Top 4 needs at least 4 players."). Replaces every place and percentage; also the **Use <preset>** fix. |
| `setPayoutShareText(gameId, rowId, text)` | `accepted` \| `savedInvalid` (that field's problem) \| `rejected rowNotFound`. The schedule becomes Custom. |
| `addPayoutPlace(gameId)` | `accepted { rowId }` (empty place appended, Custom) \| `rejected tooManyPlaces` ("Can’t pay more places than players (N)."). |
| `removePayoutPlace(gameId, rowId)` | `accepted` (Custom) \| `rejected rowNotFound \| notLastPlace \| onlyPlace`. Only the last place, never the only one. |

`presetId` is `'winnerTakesAll' | 'top2' | 'top3' | 'top4' | 'top5'` (`PayoutPresetId`).

```ts
interface PayoutScheduleView {
  needsPlayers: boolean;          // no schedule and < 2 players: "Add players first" + Edit players
  playerCount: number;
  prizePool: { kind: 'amount'; cents; amountText: 'EUR 120.00'; detail: '6 × EUR 20.00 · rebuys add to it' }
           | { kind: 'noBuyIn'; label: 'Add a buy-in' };          // + Edit game settings
  preset: { id: PayoutPresetId | null; name: 'Top 2' | 'Custom' | …;
            suggestionLine: 'Suggested' | 'Suggested for 6 players: Top 2' | null };
  suggested: { id; name } | null;
  presets: { id; name; splitText: '70 / 30%'; suggested; current; available;
             unavailableReason: 'Needs 4 players' | null }[];     // the sheet, in order
  places: { id; place; placeLabel: '1st'; share: FieldView; shareLabel: '1st place share';
            barPercent: number /* 0–100 */; amount: { kind: 'amount'; cents; text } | { kind: 'none'; text: '—' };
            removable; removeLabel: 'Remove 3rd place' }[];
  addPlace: { available: boolean; reason: 'Can’t pay more places than players (N).' | null };
  total: { kind: 'exact' | 'under' | 'over' | 'incomplete'; text: 'Total 95% · 5% left';
           icon: 'check' | null; tone: 'ok' | 'warning' | 'error' } | null;   // error = after Continue
  equalSharesNote: string | null; // "Equal shares are fine. Places still come from the elimination order."
  tooManyPlaces: { problem: Problem /* "4 paid places, but only 3 players." */;
                   fix: { presetId; label: 'Use Top 2' } | null } | null;
  problems: Problem[];            // screen order: too many places, each share, total
  continueAttempted: boolean;
}
```

- Share fields follow the `FieldView` contract (`field: 'payoutShare:<rowId>'`): "Enter a percentage.",
  "Enter a number, like 30 or 12.5.", "Use at most 2 decimals, like 12.5.", "Must be more than 0%.",
  "Can’t be more than 100%.", "Can’t be more than 2nd place (20%).". Dot or comma decimals.
- Amounts appear only when the schedule is valid and the buy-in is valid: pool = buy-in × players,
  each share floored to cents, leftover cents from 1st place down (EUR 20.01 at 50 / 30 / 20 →
  10.01 / 6.00 / 4.00). Render `total.icon: 'check'` as the ✓ in “✓ Total 100%”.
- Step-level problem codes (`field: 'payoutSchedule'`): `payoutScheduleMissing` ("Not filled in yet."),
  `tooManyPaidPlaces`, `payoutTotalNotHundred` ("Total is 95%, needs 100%."). Continue returns them
  in `stepInvalid` and stays on the step; status is Not filled in (no schedule) / Needs attention /
  Complete.
- `preview.blockers` lists the step as "Payout schedule"; its first problem is the Setup incomplete
  reason, share problems prefixed with their place ("2nd place: Enter a percentage."). Use
  **Choose payouts** for `payoutScheduleMissing`, else **Fix payouts**, both via
  `goToStep(gameId, 'payouts', { fromPreview: true })`.
- `validatePlan(game).plan.payoutSchedule` (internal, for Start and results) is
  `{ shares /* basis points */, presetId, name: 'Top 2' | 'Custom' }`, `null` in cash games.

```tsx
const p = usePlanningView(gameId)!.payoutSchedule;
// Preset sheet row
<SheetItem title={o.name} detail={o.unavailableReason ?? o.splitText} tag={o.suggested ? 'Suggested' : undefined}
  checked={o.current} disabled={!o.available} onPress={() => app.planning.choosePayoutPreset(gameId, o.id)} />
// Ladder card
<Text>{place.amount.text}</Text>
<ShareBar percent={place.barPercent} />
<TextField label={place.shareLabel} unit="%" keyboardType="decimal-pad" value={place.share.text}
  onChangeText={(t) => void app.planning.setPayoutShareText(gameId, place.id, t)} error={/* as buy-in */} />
// Too many places
{p.tooManyPlaces?.fix && <Button label={p.tooManyPlaces.fix.label}
  onPress={() => app.planning.choosePayoutPreset(gameId, p.tooManyPlaces!.fix!.presetId)} />}
```

### Distribution preview and Start

`planning.getDistributionPreview(gameId): PreviewStepView | null` (or `useDistributionPreview`) is
the recommendation for the current draft. It is derived, never stored, and only worked out when
read (memoized until players, chip set, settings or payouts change): read it on the preview step
only, because an unusual chip set can take the solver a moment. It never changes the host's
requested depth or reserve configuration.

```ts
interface PreviewStepView {
  blockers: { step, title, problems }[];   // as PlanningView.preview.blockers
  setupComplete: boolean;
  distribution:
    | { kind: 'setupIncomplete' }
    | { kind: 'planned'; plan: DistributionPlanView }
    | { kind: 'noValidDistribution'; reason: 'insufficientValue' | 'unsuitableDenominations' | 'insufficientBlindChips';
        title: 'Not enough chip value' | 'Unsuitable denominations' | 'Not enough blind-paying chips';
        message: string /* names the shortfall with the game's numbers */ }
    | { kind: 'tooComplex'; message: string /* "…too large to work out on the phone. Simplify it…" */ };
  canStart: boolean;                       // distribution.kind === 'planned'
}
interface DistributionPlanView {
  players;                                 // N
  stack: { value /* T */, chips, mix: ChipCountView[] };    // one entry per denomination, ascending
  depth: { bb, requestedBb, adjusted };    // adjusted: "100 BB → 98 BB"
  blinds: { small, big, text: '1 / 2', rounded };           // rounded: "Rounded SB"
  money: { kind: 'cash'; buyIn; buyInText; rateText: 'EUR 0.10 / unit' }
       | { kind: 'tournament'; buyIn; buyInText; prizePool; prizePoolText };
  reserve: { stacks /* r */, target /* R */, reduced };     // reduced: "3 → 1 stack", "1 of 3 possible"
  bank: { chips, mix: ChipCountView[] };
}
type ChipCountView = { value; color: ChipColor | null; count };
```

| Operation | Result |
| --- | --- |
| `planning.start(gameId, { depthBb, reserveStacks })` | `accepted { location: { kind: 'play', gameId } }` \| `rejected setupIncomplete \| noValidDistribution \| tooComplex \| previewChanged \| setupLocked \| gameNotFound`. |

Pass the `depth.bb` and `reserve.stacks` the Start popup showed; Start recomputes the preview and is
rejected with `previewChanged` ("The preview changed. Check it and start again.") if they differ.
An accepted Start records, in one commit: In progress, the accepted terms, every player's buy-in
and the starting stack actually handed to them. A second Start is `setupLocked`, so nothing is
issued twice. Rejections change nothing.

## In progress

`play.getView(gameId): PlayView | null` (or `usePlayView`) is everything Play, the bank / reserve
view and Game details show; `null` unless the game is In progress. Texts are ready to render, the
raw numbers sit next to them. Later work (rebuys, late entry, results, eliminations) extends it.

```ts
interface PlayView {
  gameId; mode; phase: 'inProgress'; createdAt; startedAt;
  terms: { blinds: { small, big, text: '1 / 2', rounded };
           depth: { bb, requestedBb, adjusted, text: '100 BB' }; stack: { value, text: '200 chip units' };
           buyIn: MoneyView; rebuyPrice: MoneyView;            // MoneyView = { cents, text: 'EUR 20.00' }
           money: { kind: 'cash'; rate: ExactCents; rateText } | { kind: 'tournament'; text: 'No chip money value' };
           coverage: { payments, text: '4 payments of each blind' }; preference; preferenceText: 'Fewer chips' };
  players: { id; name; savedPlayerId; joinOrder; entry: 'initial' | 'lateEntry';
             contribution: { stacks, rebuys, cents, text: 'EUR 40.00 contribution · 1 rebuy' };
             handedOut: ChipsView; firstStack: ChipsView }[];  // ChipsView = { chips, value, mix: ChipCountView[] }
  totals: { contributions: MoneyView & { label: 'EUR 120.00 total contributions' }; buyIns; rebuys; stacks;
            inPlay: ChipsView; prizePool: MoneyView | null /* tournaments */ };
  bank: ChipsView & { label: '374 available chips'; valueText: '7,250 chip units' };
  reserve: { configured /* R */; startedTarget /* r at Start */; consumed; unconsumed;
             achievable: number | null /* formable at once; null if too complex */;
             achievableText: '2 of 2'; weakened; summaryText: '2 reserve stacks available' };
  details: { players; playersText: '6 players'; chipSet: { denominations, summaryText };
             startingStack: ChipsView & { text }; depth: { requestedBb, acceptedBb, adjusted, text: '98 BB (requested 100 BB)' };
             blindsText: '1 / 2 chip units · 100 BB'; buyInText: 'EUR 20.00 · rebuys the same';
             rateText: string | null; coverageText; preferenceText;
             reserve: { mode, configured, atStart, reduced, text: '3 stacks' | '1 of 3 stacks' };
             payouts: { name: 'Top 2'; places: { place, placeLabel, shareText: '70%', amount, amountText }[];
                        prizePool: MoneyView; prizePoolLine: 'Prize pool EUR 120.00 · 6 buy-ins. Rebuys raise every prize; the percentages stay.' } | null;
             lockedNote: 'Setup is locked. To change it, use ⋯ → Return to Planning.' };
}
```

| Operation | Result |
| --- | --- |
| `play.returnToPlanning(gameId, { confirmed? })` | `needsConfirmation { confirmation: ReturnToPlanningConfirmation }` until `confirmed` \| `accepted { location: { kind: 'planning', gameId, step: 'preview' } }` \| `rejected gameNotFound \| notInProgress \| gameCompleted`. |

```ts
interface ReturnToPlanningConfirmation {
  kind: 'returnToPlanning';
  clears: { rebuys; results; eliminations; handedOutStacks; parts: string[]; text: '2 rebuys · 6 results · all handed-out stacks' };  // zero parts omitted
  keeps: { players; payoutSchedule: boolean; parts: string[]; text: '6 players · buy-ins · settings' };  // + ' · payout schedule'
  note: 'Collect all chips. You’ll hand out new stacks after Start.';
}
```

Confirmed, it clears every play record and issuance and reopens Planning on Distribution preview
with the full current roster, the buy-in and every setting (requested depth, coverage, preference,
reserve configuration, payout schedule). An automatic reserve follows the roster, a custom one is
kept; the preview is recomputed and may be infeasible (the game then stays in Planning). Show
"✓ Back in Planning" after it. Cancel in the popup calls nothing.

**The In progress document** (internal; `GameDocument.play`, absent in Planning): `startedAt`;
`terms` (chip set ascending with colours, buy-in, requested and accepted depth, blinds, stack value,
coverage, preference, reserve `{ mode, configured R, target r }`, exact `cashRate` or `null`, locked
payout schedule or `null`); `roster` (participants in joining order with `entry`); `issuances`
(`{ id, participantId, kind: 'initial' | 'rebuy' | 'lateEntry', contribution, mix, recordedAt }`).
Only facts are stored: the bank (chip set − issuances, + returns later), contributions, reserve
consumption (rebuys + late entries) and totals are derived in `play/ledger.ts`. The Planning draft
stays untouched while In progress. Later record types become further fields of `play`, are cleared
by Return to Planning and counted in its confirmation.

### Cash-game final chip counts, results and accounting status

Reads (memoized; `null` unless the game is a started cash game with that participant; a Completed
game reads read-only with `phase: 'completed'` and its allocated cents, see Completion):
`play.getResults(gameId): CashResultsView` (`useCashResults`),
`play.getCountEditor(gameId, participantId, { showErrors? }): CountEditorView` (`useCountEditor`;
also `null` once the participant has a result), `play.getCashPlayer(gameId, participantId):
CashPlayerView` (`useCashPlayer`). The screen types re-export the plain data types (`QuantityEntry`,
`CountTotals`, `ResultConfirmationData`, `BlockedMixData`, `ResultsStatus`, `ResultsPlayerRow`,
`BuyInRecord`, `PlayerResult`, …); containers only add the context line and Back labels.

| Operation | Result |
| --- | --- |
| `play.setCountText(gameId, participantId, denominationValue, text)` | `accepted` \| `rejected gameNotFound \| notInProgress \| notCashGame \| participantNotFound \| resultExists \| denominationNotFound`. Saves the raw text exactly as typed; moves no chips. A draft whose every text is empty is removed (the player is uncounted again). |
| `play.setRemainingCountToZero(gameId, participantId)` | as above. Fills blank quantities with `0`; entered or invalid text stays. |
| `play.discardCountDraft(gameId, participantId)` | as above. Removes the draft. |
| `play.reviewCount(gameId, participantId)` (synchronous, changes nothing) | `needsConfirmation { confirmation: ResultConfirmationData }` \| `needsCorrection { firstDenominationValue, problem }` (read the editor with `showErrors: true`) \| `blocked { blocked: BlockedMixData }` ("More chips than the game has") \| `rejected` (access codes, `resultExists`). |
| `play.confirmResult(gameId, participantId, { counts })` | `accepted` \| `blocked { blocked }` \| `rejected …access \| resultExists \| countIncomplete \| countChanged`. Pass the counts of the confirmation the popup showed (`confirmation.mix[].count`). |

- One draft per participant (`PlayRecord.countDrafts`: raw text per denomination), kept across
  leaving the editor and restart. Empty is "not entered", never zero; quantities are digits only
  (outer spaces ignored), at most 999,999. Errors after a failed review: "Enter a quantity,
  including zero." / "Use a whole number, digits only." / "Enter a smaller number."; editor
  problem "Count incomplete. Your entries are kept. Fix the marked quantities." The review flag is
  screen state (`showErrors`), not stored.
- Confirm recomputes the review: it is rejected with `countChanged` ("The count changed. Review it
  again.") if the draft no longer gives `counts`. Accepted, it records the participant's one
  `ResultRecord` (the counted mix), removes the draft and returns the mix to the bank in one commit.
  The reserve target and its consumption are unchanged; the game stays In progress.
- A count may return at most the chips currently out at the table per denomination (chip set −
  bank), not the player's own stacks: table winnings are fine. Otherwise `blocked`, e.g.
  "That’s 1 White chip more than the game has. Check the quantities you entered." (several
  denominations joined with "and"; a chip without a unique colour is named "100-unit").
- Amounts are exact until Payments: chip value = units × `terms.cashRate` (`formatExactEur`),
  win / loss = chip value − all contributions (`formatSignedExactEur`, direction
  `gain | loss | even`).
- `CashResultsView.status`: `toCount` ("N still to count", uncounted names in joining order,
  counted / total), then once everyone has a result `missing` / `tooMany` ("1 chip unit missing",
  "EUR 0.10 · 1,199 of 1,200 counted. Recount, or correct a result.") or `addsUp` ("All 6 counted ·
  1,200 chip units"). Drafts never count; counted units are compared with cumulative issuance
  (`accounting.issuedUnits`), never the chip set or bank. `calculatePayments` is available only when
  everything adds up, else its one reason ("Count everyone first." / "Find the missing chips
  first." / "Fix the extra chips first."). Rows: `uncounted` / `countDraft` / `result` (no
  "Result confirmed" tag); `correctionDraft` marks a result with an unconfirmed correction draft.
- `CashPlayerView.buyIns` lists every issuance of the participant from `play.issuances` with its
  actual mix: the first stack as "Buy-in", then "Rebuy 1", …; `coverageText` for a reduced-coverage
  stack, `addedLater` / `corrected` tags, and each rebuy's `undo` popup while In progress.
  `returnToPlay` is the Return to play popup of a player with a result (In progress);
  `result.correctionDraft` marks a saved correction draft; `actions.countFinalChips` is true until
  a result exists.

### Corrections of recorded play

Corrections change records, never chips: each popup says what the host does with the physical
chips. Every accepted correction keeps each bank denomination (chip set − all issuances + confirmed
cash returns) between zero and the configured quantity; nothing cascades into another record, and
inventory-valid imbalance is saved (Results explains it). All of these are part of `app.play`, so a
Completed game rejects them with `gameCompleted` until Reopen.

Reads: `play.getPlayerBuyIns(gameId, participantId): PlayerBuyInsView` (`usePlayerBuyIns`; both
modes, Completed read-only: rows, `undo` popups, `actions.addForgottenRebuy` / `actions.rebuy`),
`play.getCorrectionEditor(gameId, participantId, { showErrors? }): CountEditorView` with
`kind: 'correction'` (`useCorrectionEditor`; the saved correction draft or the confirmed counts;
`null` without a result), `play.getRebuyMixEditor(gameId, participantId, { rebuyId?, texts?,
showErrors? }): RebuyMixEditorView` (`useRebuyMixEditor`; the screen holds the typed texts, omitted:
blanks or the recorded mix), `play.getFix(gameId, start?): FixView` (`useFix`), and
`PlayScreenView.fixText` ("Fixing Alice’s count · Step 2 of 3", or `null`).

| Operation | Result |
| --- | --- |
| `play.setCorrectionText(gameId, participantId, value, text)`, `play.setRemainingCorrectionToZero`, `play.discardCorrection` | `accepted` \| `rejected …access \| noResult \| denominationNotFound`. The correction draft is stored like a count draft (`PlayRecord.countDrafts`, for a participant with a result); a draft equal to the confirmed counts is dropped. The result stays in force. |
| `play.reviewCorrection(gameId, participantId)` (synchronous) | `needsConfirmation { confirmation }` (`kind: 'replace'`) \| `needsCorrection` \| `blocked` ("More chips than the game has", or "Those chips were handed out again" when later stacks use them and no single rebuy can be undone for it) \| `dependent { fix: FixStart }` \| `rejected`. |
| `play.replaceResult(gameId, participantId, { counts })` | `accepted` \| `blocked` \| `dependent` \| `rejected …access \| noResult \| countIncomplete \| countChanged`. Replaces the return once and drops the draft. |
| `play.returnToPlay(gameId, participantId)` | `accepted` \| `blocked` \| `dependent` \| `rejected`. Removes the result, its return and any correction draft; keeps every buy-in; issues nothing. Cash only. |
| `play.undoRebuy(gameId, rebuyId)` | `accepted { participantId, feedback: { title: 'Rebuy undone' } }` \| `blocked` ("Can’t undo this rebuy": a later result returned its chips) \| `rejected …access \| rebuyNotFound \| notARebuy` (the first stack). Both modes; reverses contribution, issuance and reserve consumption. |
| `play.reviewRebuyMix(gameId, participantId, { rebuyId?, texts })` (synchronous) | `needsConfirmation { confirmation: RebuyMixConfirmationData }` (warnings `reducedCoverage` "Covers only c of k blind payments with separate chips." / `weakenedReserve` "Leaves chips for only x of y reserve stacks (was z)."; notes "Alice’s result stays." / "Bob · Stays out · 6th"; tournament: Prize pool before → after) \| `needsCorrection { firstDenominationValue \| null, problem }` ("Quantities missing." / "180 chip units, not 200.") \| `blocked` ("Not enough chips for this mix") \| `rejected …access \| rebuyNotFound \| notARebuy \| tooComplex`. |
| `play.recordRebuyMix(gameId, participantId, { rebuyId?, counts, acceptedWarnings })` | `accepted { issuanceId, feedback }` ("Forgotten rebuy added" / "Rebuy corrected") \| `blocked` \| `rejected … \| wrongMix \| warningsNotAccepted`. A forgotten rebuy costs the buy-in, consumes reserve and is tagged `addedLater`; Correct mix replaces the mix in place (`corrected`); `reducedCoverage` follows the actual mix. Results and eliminations stay. |
| `play.undoFixBlocker(gameId, start, rebuyId)` | Step 1: `accepted` (records `PlayRecord.fix` at step 2, with the retained counts) \| `blocked` \| `rejected … \| fixChanged \| fixInProgress \| noResult`. |
| `play.saveFixStep(gameId, { counts? })` | Step 2: Replace result with the counts `FixView.correction` shows, or remove the result. `accepted` \| `blocked` \| `rejected … \| noFix \| countChanged`. Replace result in the count editor or Back in the game on the player page completes step 2 as well. |
| `play.finishFix(gameId)` | Forgets the fix (Done → Back to Play). Step 3 is the ordinary `proposeRebuy` / `issueRebuy` for `FixView.newRebuy.participantId`; issuing it marks the fix `done`. |

- The fix flow: `reviewCorrection`, `replaceResult` and `returnToPlay` answer `dependent` when the
  latest rebuy of another player whose undo would make the change valid exists. Step 1 is derived
  from the records (`getFix(gameId, start)`; nothing stored, so Back to count changes nothing); from
  the accepted undo on the fix is recorded and `getFix(gameId)` returns it at step 2, 3 or `done`
  across leaving and restart. One fix at a time.
- Weakened reserve compares the still-targeted stacks the bank can form at once after the
  historical record (`x of y`) with what it could form before (`z`), and warns when `x < min(y, z)`.
  Later ordinary allocations protect what is achievable (`proposeRebuy`).

## Rebuys and late entry

Ticket #19–#21. Every later stack is allocated from the current bank under the started terms
(stack value T, blinds, coverage k, preference). Proposals are **reads**: synchronous, memoized,
recording nothing. Confirming recomputes the proposal and issues only if it still matches what the
host saw.

| Operation | Result |
| --- | --- |
| `play.proposeRebuy(gameId, participantId)` | `needsConfirmation { confirmation: RebuyConfirmation }` \| blocked: `rejected insufficientValue \| unsuitableDenominations \| tooComplex` **with `blocked`** (the popup's blocked content) \| `rejected gameNotFound \| notInProgress \| participantNotFound \| finishedPlaying \| eliminated`. |
| `play.issueRebuy(gameId, acceptance)` | `accepted { participantId, issuanceId, feedback }` \| `rejected proposalChanged \| reducedCoverageNotAccepted \| …the request codes`. |
| `play.proposeEntry(gameId, savedPlayerId)` | `needsConfirmation { confirmation: EntryConfirmation }` \| blocked: `rejected coverageShortage \| insufficientValue \| unsuitableDenominations \| tooComplex` **with `blocked` and `declinedNotice`** \| `rejected gameNotFound \| notInProgress \| savedPlayerNotFound \| alreadyInGame \| nameTakenInGame \| eliminationsRecorded`. |
| `play.addLatePlayer(gameId, acceptance)` | `accepted { participantId, issuanceId, feedback }` \| `rejected proposalChanged \| …the request codes`. |

```ts
interface RebuyConfirmation { kind: 'rebuy'; popup: RebuyPopupData /* kind 'proposal' */; acceptance: RebuyAcceptance }
interface RebuyAcceptance { participantId; mix: number[]; newTotalCents; reserveAfter; acceptedCoverage: number | null }
interface EntryConfirmation { kind: 'lateEntry'; popup: EntryPopupData /* kind 'proposal' */; acceptance: EntryAcceptance;
                              declinedNotice: 'Nora has not joined.' }
interface EntryAcceptance { savedPlayerId; name; mix: number[]; reserveAfter }
interface IssueFeedback { title: 'Rebuy issued for Ben' | 'Nora joined';
                          message: '+EUR 20.00 contribution · 200 chip units issued.' /* + ' · covers 3 of 4 blind payments' */ }
```

- **Pass the `acceptance` back unchanged** on Issue rebuy / Accept & issue / Add player & issue stack.
  It identifies the reviewed proposal (mix, new total, reserve after, accepted coverage), so a stale
  proposal (`proposalChanged`: "The bank changed since this was proposed. Review it again.") and a
  repeated confirm never issue anything. After `proposalChanged`, propose again and show the new popup.
- **Rebuys** get the fully qualifying stack whenever one exists. Only if none exists: the exact-value
  stack with the highest coverage c < k (`popup.reducedCoverage: { achieved, required }`, may be 0),
  recorded only with `acceptance.acceptedCoverage === c` (else `reducedCoverageNotAccepted`); the
  issuance keeps `reducedCoverage: c`. No exact stack: blocked with the requirement in words ("An
  exact 200-unit stack is needed, but the bank holds only 180 chip units.", "No exact 200-unit stack
  can be formed. The smaller chips make only 180 units, and the 500-unit chip cannot be split.").
  A player with a confirmed result is `finishedPlaying` (Return to play removes the result first).
- **Late entry** never gets reduced coverage: `coverageShortage` blocks with
  `{ kind: 'coverage', achieved, required, stackUnitsText }`. Accepting appends the participant
  (captured, trimmed name; `entry: 'lateEntry'`; next joining position), its buy-in and its stack in
  one commit. Saving a new name is the separate `savedPlayers.create`. Candidates (`getAddPlayer`)
  are unavailable when the same saved player or the same name is already in the game.
- **Reserve.** Each rebuy and late entry consumes one unit of the started target. A proposal keeps
  `unconsumed − 1` still-targeted stacks formable (or what the bank actually still achieves) and
  never refuses a feasible request for the reserve; exhausted and zero targets still allow
  qualifying requests (`reserveNote`: "More rebuys are still allowed when another stack is
  possible." / "More players can join when …"). A weakened guarantee reads "1 of 2 still-targeted
  stacks can be supplied.". Returned chips never replenish consumption.
- Tournaments use the same operations with an extra `Prize pool` fact; an eliminated player cannot
  rebuy and late entry is closed while any elimination is recorded (rest of #27 comes later).

### Screen reads

`play.getPlayScreen(gameId): PlayScreenView | null` (cash only; `usePlayScreen`),
`play.getBankReserve(gameId): BankReserveScreenView | null` (`useBankReserve`),
`play.getGameDetails(gameId): GameDetailsScreenView | null` (In progress, both modes;
`useGameDetails`), `play.getAddPlayer(gameId): AddPlayerScreenView | null` (`useAddPlayer`). Each is
exactly the screen's data in `src/features/{play,entry,details}/types.ts` minus what the workspace
adds (context line, back label, formatted dates). Play rows read the shared records: a count draft
gives **Resume** / "Count draft"; a confirmed result moves the player to Finished playing with the
exact signed provisional balance (`+EUR 5.00`, Won / Lost / Break-even) and no Rebuy; a count
draft beside a result is a "Correction draft".

```tsx
const result = app.play.proposeRebuy(gameId, participantId);
if (result.status === 'needsConfirmation') open(result.confirmation.popup, result.confirmation.acceptance);
else if ('blocked' in result) open(result.blocked, null);          // no accept action
else toast.show(result.reason.message, { tone: 'error' });
// Issue rebuy / Accept & issue
const done = await app.play.issueRebuy(gameId, acceptance);
```

### Tournament eliminations and the finishing order

One elimination order is the only tournament result record (`play.eliminations`, earliest first;
internal). Places, the sole remaining winner, every payout and whether late entry is open are
derived from it, the roster, all contributions (the prize pool) and the locked schedule (leftover
cents to 1st first). For N players the first one out is Nth. Eliminations move no chips, need no
chip count, never change contributions or the schedule, and never complete the game. Late entry is
open only while no elimination is recorded (`isLateEntryOpen` in `play/ledger.ts` for the later
late-entry operation).

Reads (`null` unless an In progress tournament; hooks `useTournamentPlay`, `useTournamentResults`,
`useTournamentPlayer`, `useOrderEditor`). Each is the screen's data from
`src/features/tournament/types.ts` without the workspace frame or context line, which the container adds:

| Read | Returns |
| --- | --- |
| `play.getTournamentPlay(gameId)` | `TournamentPlayView`: terms, prize-pool rungs with holders, `stillIn` (players with the `EliminationPreview` the Out popup shows: place, payout, `closesLateEntry`, the winner with two left; `nextPlaceLabels` for the same hand) or `null` with a `winner`, `lateEntry: { status: 'open' } \| { status: 'closed', eliminationsText, message }`, unpaid finishers, `reserveText`. |
| `play.getTournamentResults(gameId)` | `TournamentResultsView`: `status` (`incomplete` with ring and names, or `winner`), `openPlaces`, `finishers` best first, `canEditOrder`, `calculate: { kind: 'ready' } \| { kind: 'blocked', stillPlayingText, message: 'Record eliminations until one player is left.' }`. |
| `play.getTournamentPlayer(gameId, participantId)` | `TournamentPlayerView`: `status: 'stillIn' \| 'out' \| 'winner'`, `buyIns` (shaped like the player page's `BuyInRecord`), `buyInsTotalText`, `result: TournamentPlayerResult \| null` (place, payout, balance), `backIn: BackInData \| null` (eliminated players only). |
| `play.describeOrderDraft(draft)` | `OrderEditorView` for any draft: rows with places, payouts, `was 5th` / `missed` markers and move labels; `missed` candidates and slots (or `null` with fewer than two left); `changes` against the saved order. Changes nothing. |

Operations:

| Operation | Result |
| --- | --- |
| `play.recordElimination(gameId, participantId)` | `accepted { place }` \| `rejected notPlaying \| alreadyOut \| lastPlayer` (+ access codes). The next open place from the bottom. |
| `play.recordSameHand(gameId, { bestFirst, stillIn })` | `accepted` \| `rejected stillInChanged \| tooFewPlayers \| notPlaying \| alreadyOut \| lastPlayer`. Two or more players out in one hand, recorded in one commit in the host's order (best place first); `stillIn` is the set the host saw. |
| `play.startOrderDraft(gameId)` | `OrderDraft \| null`: the saved order as a draft. Keep it in the editor screen; leaving discards it. |
| `play.moveUpInOrderDraft(draft, id)`, `moveDownInOrderDraft`, `undoInOrderDraft`, `addMissedToOrderDraft(draft, { playerId, slotId })` | A new `OrderDraft` (pure; nothing saved). Impossible edits return the draft unchanged. |
| `play.saveOrder(draft)` | `accepted` \| `rejected orderChanged` ("The order changed meanwhile. Nothing was saved.": the saved order or roster changed since the draft started) \| `invalidOrder`. Replaces the order in one commit. |
| `play.backInTheGame(gameId, participantId, { confirmed? })` | `needsConfirmation { confirmation: { kind: 'backInTheGame', name, changes } }` until `confirmed` \| `accepted` \| `rejected notPlaying \| notOut`. Removes that elimination only (never a contribution). |

Access codes on every tournament operation: `gameNotFound`, `notTournament`, `notInProgress`,
`gameCompleted`. Change rows (`OrderChangeRow { key, label, struck?, value, spokenValue? }`) list
only what changes: `5th → 4th` (plus ` · EUR 36.00` / ` · no payout` when the payout changes),
`Out · 5th · no payout`, `Back in (was 5th)`, the winner withdrawn (`struck: 'Alice'`,
`· none yet` or `→ Bob`) or new (`Alice · EUR 84.00`), `Late entry` `Closes` / `Opens again`;
Back in the game adds `Buy-ins · EUR 20.00 · unchanged`.

### Completion: Calculate Payments, Payments, Reopen and History

| Operation | Result |
| --- | --- |
| `play.calculatePayments(gameId, { confirmed? })` | `needsConfirmation { confirmation: CalculatePaymentsConfirmation }` until `confirmed` \| `accepted { location: { kind: 'payments', gameId } }` \| `rejected gameNotFound \| notInProgress \| gameCompleted \| notReady` (`notReady`: the one reason, e.g. "Count everyone first." / "Find the missing chips first."). |
| `play.reopen(gameId, { confirmed? })` | `needsConfirmation { confirmation: { kind: 'reopen', mode } }` until `confirmed` \| `accepted { location: { kind: 'results', gameId } }` \| `rejected gameNotFound \| notCompleted`. |
| `play.getPayments(gameId): PaymentsView \| null` | Completed only (`usePayments`). |
| `games.history(): HistoryGameView[]` | Completed games, newest finished first (`useHistory`). |

```ts
interface CalculatePaymentsConfirmation { kind: 'calculatePayments'; readyLine: 'All 6 counted · 1,600 chip units'; facts: CalculateFact[] /* tournament */ }
interface PaymentsView {
  gameId; mode: 'cash' | 'tournament'; finishedAt: string;   // ISO 8601; the screen adds the context line
  summary: { kind: 'payments'; countText: '3 payments'; totalText: 'EUR 21.00 in total';
             payments: { id; fromName: 'Bob'; toName: 'Clara'; amountText: 'EUR 8.00' }[] }
         | { kind: 'noPayments' };                             // No payments needed · Everyone broke even.
  balances: { participantId; name; placeLabel: null | '1st'; placeHighlight;
              lines: ['Final result EUR 33.00', 'Buy-ins EUR 20.00']; balanceText: '+EUR 13.00';
              direction: 'gain' | 'loss' | 'even' }[];         // joining order (cash)
}
interface HistoryGameView {
  gameId; mode; participantNames: string[];                   // captured names, never live saved players
  createdAt: string; finishedAt: string;                       // ISO 8601; the card formats "23 Nov 2026 · 19:30–23:41"
  facts: { label?: string; value: string }[];                  // Buy-ins EUR 160.00 · 3 payments (or No payments needed) · Top Alice +EUR 13.00
}
```

- Completion is explicit: only a confirmed `calculatePayments` completes a game, and it validates
  again at confirm time (cash: every player has a confirmed result and counted units equal the
  cumulative issued units exactly; the reason is the one `getResults` shows). Accepted, one commit
  allocates every exact result to whole cents (`allocateCashResults`: floors, then remaining cents
  by largest discarded remainder, joining order breaking ties), stores each participant's final
  result, contributions and balance (`final − contributions`, summing to zero) and the fewest direct
  payments (`settlePayments`), with the finishing time, as `GameDocument.completion`, and makes the
  game Completed. Show "✓ Game finished" and its Payments. Payments are instructions only; nothing
  records that money changed hands.
- Each mode supplies its final money results (`completion/modes.ts`: cash = allocated chip value;
  tournament completion, a later task, = payout by finishing place) plus its Balances lines and
  History facts; everything else is shared.
- Completed is read-only. Every play operation that is not a `get…` read answers
  `rejected gameCompleted` ("This game is completed. To change something, reopen it from ⋯.") —
  centrally in `play/index.ts`, also for operations added later, provided they take the game id as
  their first argument; a write to a Completed game through the play runtime never applies. Planning
  edits answer `setupLocked`, Return to Planning `gameCompleted` (reopen first). Reads stay:
  `getResults` / `getCashPlayer` give `phase: 'completed'`, the allocated cents (`+EUR 2.50`, chip
  value `EUR 12.51`) instead of exact amounts, `calculatePayments.available: false` and
  `actions.countFinalChips: false`; `getCountEditor` and `getView` give `null`.
- Reopen keeps every record (setup, results, buy-ins), withdraws the stored settlement and finishing
  time (nothing stale is kept), sets `PlayRecord.reopenedAt` and makes the game In progress again:
  `getResults().reopened` and `GameCard.reopened` are true until Payments are calculated again; the
  game leaves History and opens on Results from Games. Show "✓ Game reopened". Calculating again
  without changes gives identical Payments.

## Saved players

| Operation | Result |
| --- | --- |
| `savedPlayers.list(): SavedPlayerView[]` | `{ id, name }`, alphabetical. |
| `savedPlayers.checkName(name, { exceptId? }): Problem \| null` | Live check while typing: the problem `create` (or `rename` of `exceptId`) would reject with. Stores nothing. |
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
| `templates.describeRows(rows)` | Live validation of unsaved editor rows: `{ rows: Record<rowId, { value, quantity, chipCount }>, setProblem, problems, summary }` (`chipCount`: the valid quantity for the chip case, else `null`). Stores nothing. |
| `templates.create({ name, rows })` | `accepted { templateId }` \| `rejected invalidTemplate` with every name/row problem in `reason.problems`. |
| `templates.update(id, { name, rows })` | `accepted` \| `rejected invalidTemplate \| templateNotFound`. |
| `templates.rename(id, name)` | as `update`, rows kept. |
| `templates.delete(id)` | `accepted` \| `rejected templateNotFound`. Games keep their copies. |

`ChipRowInput` is `{ id, valueText, quantityText, color }`; the editor chooses row ids (a counter is
fine). Template rows follow the same rules as a game's chip set.

## Working location

`location.get(): WorkingLocation` is where to reopen the app:
`{ kind: 'games' | 'history' | 'savedPlayers' | 'templates' }`, `{ kind: 'planning', gameId, step }`
or `{ kind: 'play' | 'results' | 'details' | 'payments', gameId, from?: 'history' }` (`payments`:
Completed only; `from: 'history'` when the game was opened from History, so back leads there;
`locationHref` maps it to a route with `?from=history`). It falls back to History (opened from
there) or Games when the game is gone and to the game's current workspace when its phase changed
(Planning: its last step; In progress: Play, Payments → Results, `from` dropped; Completed: Play →
Payments). Reading it never applies anything. Call `location.set({ kind: ... })` when the host
navigates to Games, History, Saved players, Chip set templates or a started game's tab
(`rejected gameNotFound | wrongPhase`); wizard operations, Start, Return to Planning, Calculate
Payments, Reopen and `games.open` record their locations.
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
- Each area keeps its own folder: `games/`, `planning/`, `play/` (In progress), `reusable/`, `location/`, plus `core/`
  (documents, results, runtime, persistence) and `shared/` (names, numbers, chip rows).
- `planning/validation.ts` → `validatePlan(game)` returns the parsed `ValidPlan` (participant ids,
  denominations, buy-in cents, requested depth, preference, coverage, reserve) for distribution.
- New game sections (completion) and play records are new fields on `GameDocument` / `PlayRecord` in
  `core/documents.ts`; incompatible changes bump `SCHEMA_VERSION` with a migration in
  `core/persistence.ts`.
- An operation reads `rt.state()`, validates, builds the next immutable state and calls
  `rt.apply(next)` once; changed documents are found by identity and committed together.
