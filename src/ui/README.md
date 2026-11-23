# `src/ui` — design system

Everything screens need to look like the approved prototypes (Current / Lavender, always dark). Import from `@/ui`:

```tsx
import { Screen, TopBar, ScreenHeader, Button, TextField, colors, space } from '@/ui';
```

Rules of use:

- Colours, spacing, radii and type sizes come from the tokens below. Never hard-code them in `src/features`. If a screen needs something the primitives cannot express, add or extend a primitive here instead of styling locally.
- Components take plain, already-formatted data (`"EUR 20.00"`, `"+EUR 13.00"`, `"1 / 2"`) and callbacks. Formatting comes from `src/domain/money.ts` or game management; `src/ui` has no game rules and imports nothing from `game-management`, `state` or `features`.
- Same idea, same prop name: `label`, `title`, `subtitle`, `description`, `value`, `unit`, `tone`, `icon`, `onPress`, `onCancel`, `onConfirm`, `unavailable`, `selected`, `accessibilityLabel`.
- Every control is at least 48×48, has a role and a name, and exposes its state. Never carry meaning by colour or icon alone: badges, notices, amounts and statuses always include words.
- Font scaling stays on. Rows and button groups wrap instead of clipping. Motion is only press feedback (`usePressFeedback`), removed under Reduce Motion.
- The gallery at `/dev/gallery` shows every component and rebuilds approved screen blocks under `/dev/gallery/compositions`. Copy from there.

## Tokens — `theme.ts`

| Export | What |
| --- | --- |
| `colors` | Semantic roles: `background`, `surface`, `surfaceOverlay` (dialogs/sheets), `surfaceSunken` (inputs, inset wells), `surfacePressed`, `text`, `textSupporting`, `divider` (decorative), `controlBorder` (control boundaries), `primary` / `onPrimary`, `selectedTint`, `highlightBorder`, `error` / `errorBackground`, `warning` / `warningBackground`, `confirmed` / `confirmedBackground`, `even`. |
| `toneColors[tone]` | `{ text, background, border }` for `Tone = 'neutral' \| 'primary' \| 'confirmed' \| 'warning' \| 'error'`. |
| `space` | `xxs 2, xs 4, sm 8, md 12, lg 16, xl 20, xxl 24, xxxl 32, gutter 20, card 18, section 28`. |
| `radii` | `sm 10, control 14, field 16, tile 16, card 22, sheet 24, pill 999`. |
| `type` | `pageTitle` 41, `cardTitle` 30, `dialogTitle` 24, `sectionTitle` 18, `title` 17, `body` / `bodyStrong` 16, `label` / `supporting` 14, `caption` / `overline` 12, `amount` 22, `amountLarge` 32, `amountHero` 44 (tabular). |
| `touchTarget` | `48`. |
| `palette` | Raw reference hex values. Prefer `colors`. |
| `tabularNums`, `svgFontFamily` | Font variant for amounts; system sans-serif for SVG text. |

## Text and icons

**`Text`** — the only text primitive. `variant` (a `type` key, default `body`), `tone` (`main`, `supporting`, `primary`, `onPrimary`, `error`, `warning`, `confirmed`, `even`), `tabular`, `strong`, `strike`, `align`. Heading variants get the header role.
`<Text variant="supporting">EUR 20.00 contribution · 1 rebuy</Text>`

**`Icon`** — 24-grid stroke icons: `back`, `forward`, `chevronLeft/Right/Up/Down`, `arrowUp/Down`, `external`, `more`, `plus`, `minus`, `removeCircle`, `close`, `check`, `edit`, `trash`, `warning`, `error`, `info`, `clock`, `players`, `user`, `userPlus`, `templates`, `chip`, `play`, `lock`, `undo`, `reopen`, `wallet`, `shield`, `reserve`, `list`, `calculator`, `exit`, `home`, `count`. Decorative unless `accessibilityLabel` is set. Props `name`, `size` (22), `color`.
`<Icon name="clock" />`

## Layout

**`Screen`** — page scaffold: dark background, safe areas, vertical scroll, keyboard avoidance, 20 gutters. `topBar`, `footer` (part of the scroll content, pushed to the bottom when short), `gap` (16), `scrollRef`.
`<Screen topBar={<TopBar … />} footer={<FooterActions>…</FooterActions>}>…</Screen>`

**`TopBar`** — `backLabel` ("Games", "History", "Back") + `onBack`, optional `backIcon` (`back` arrow default, `chevronLeft`, `home`), `onMore` for ⋯ (`moreAccessibilityLabel`, default "Game actions"), `trailing`.
`<TopBar backLabel="Games" onBack={goGames} onMore={openActions} />`

**`ScreenHeader`** — `context` ("Cash game · 23 Nov, 19:30"), `badges` (a `BadgeRow`), `title`, optional `eyebrow`; `children` go under the title (a `StepLink`, a lead line). Planning uses `badgesFirst` (badges, then the context line) and `beforeTitle` (the `StepLink` between identity and title).
`<ScreenHeader context="Cash game · 23 Nov, 19:30" badges={<BadgeRow><Badge label="In progress" tone="primary" /></BadgeRow>} title="Play" />`

**`FooterActions`** — the task dock at the end of a `Screen`: full-bleed raised band, optional `note` (draft/blocker line, `noteTone`), buttons in a wrapping row; the last button takes the remaining width.
`<FooterActions note="Draft saved · no chips issued"><Button label="Back" icon="chevronLeft" onPress={back} /><Button label="Continue" variant="primary" trailingIcon="chevronRight" onPress={next} /></FooterActions>`

**`Card`** — surface. `variant`: `raised` (default group), `highlight` (active game card), `inset` (page-coloured well, e.g. game identity in a dialog), `showcase` (radial stage). `padding` (18), `gap`, `onPress` + `accessibilityLabel` for a whole-card button.
`<Card gap={space.xl}>…fields…</Card>`

**`ListRow`** — players, links, balances. `title`, `subtitle` (string or lines), `leading`, `trailing` (e.g. `SignedAmount`), `tags` (badges under the text), `actions` (separate buttons beside the row, wrap under it at large text), `onPress`, `chevron`, `divider` (true), `density`.
`<ListRow title="Ben" subtitle="EUR 40.00 contribution · 1 rebuy" onPress={open} actions={<><Button label="Rebuy" … /><Button label="Result" … /></>} />`

**`SectionHeading`** — `title`, `meta` ("1 draft"), `action` `{ label, icon, onPress }` (tertiary text button), `size="large"` with `aside` for "3 payments · EUR 21.00 in total".
`<SectionHeading title="Playing · 5" action={{ label: 'Add player', icon: 'plus', onPress: addPlayer }} />`

**`Divider`** — decorative hairline. `spacing`, `inset`.

**`Stack`** — flex container with token `gap`; `direction="row"` wraps by default. **`Columns`** — equal columns that reflow to one column below `minColumnWidth` (130), e.g. Value | Quantity.
`<Columns><TextField label="Value (chip units)" … /><TextField label="Quantity (chips)" … /></Columns>`

## Controls

**`Button`** — `label`, `onPress`, `variant`: `primary` (the one dominant action, Lavender pill), `secondary` (outlined, default), `tertiary` (text), `destructive` (coral, never Lavender), `tonal` (Lavender-tinted row action such as + Rebuy). `size="compact"` inside rows. `icon`, `trailingIcon`, `fullWidth`, `alignStart` (tertiary under a field). `unavailable` keeps it focusable, reports disabled and never calls `onPress`; `onUnavailablePress` may explain the blocker. `loading` + `loadingLabel` ("Calculating…") reports busy. `accessibilityLabel` when the label needs context ("Rebuy for Ben").
`<Button label="Calculate Payments" variant="primary" unavailable={!ready} onUnavailablePress={explain} onPress={calculate} />`

**`IconButton`** — 48×48, required `accessibilityLabel` naming the specific action. `icon`, `variant` (`outline` / `plain`), `tone` (`destructive`, `primary`), `unavailable`.
`<IconButton icon="trash" accessibilityLabel="Remove denomination 2 (value 5)" onPress={remove} />`

**`TextField`** — persistent `label`, `value` (raw text, kept as typed), `onChangeText`, `unit` (EUR, BB, payments, stacks, chip units, chips, %) with `unitSpoken`, `icon`, `helper`, `error` (shown in words under the field, spoken as the input's hint, announced), `keyboard` (`text` / `decimal` / `whole`), `onBlur`, `onSubmitEditing` + `returnKeyType`, `inputRef`, `footer` (e.g. "Use automatic (3)"), `editable`, `size="large"` / `size="compact"` (48-high box inside cards), `before` / `after`, `inputWidth` (fixed box width that grows with text size; `before` / `after` take the rest), `labelHidden` (spoken but not shown, only where visible context names the field, such as a payout place's share). Never placeholder-only.
`<TextField label="Buy-in per player" icon="wallet" unit="EUR" unitSpoken="euros" keyboard="decimal" value={raw} onChangeText={setRaw} error={buyInError} />`

**`StepperField`** — − / large quantity / +. Same text props as `TextField`; `onDecrement` / `onIncrement` are yours (no number rules inside), `decrementLabel` / `incrementLabel`, `decrementUnavailable`.
`<StepperField label="Quantity (chips)" value={raw} onChangeText={setRaw} onDecrement={dec} onIncrement={inc} />`

**`RadioRow`** / **`RadioGroup`** — whole-row single choice with visible indicator, border and tint; exposes checked state. `label`, `description`, `selected`, `onPress`, `unavailable`, `children` (extra content such as a chip preview). `RadioGroup` gives the set its visible `label` (`hideLabel` keeps it for screen readers only, when the title already names the choice).
`<RadioGroup label="Distribution preference"><RadioRow label="Fewer chips" selected={p === 'fewer'} onPress={…} />…</RadioGroup>`

**`CheckboxRow`** — whole-row multiple choice (the saved-player picker): visible box with tick, border and tint; exposes checked state. `label`, `description` (e.g. the reason it is unavailable), `checked`, `onPress`, `unavailable` (focusable, reports disabled, never toggles), `ref`.
`<CheckboxRow label="Chris" checked={selected.has(id)} onPress={toggle} />`

**`SegmentedTabs`** — workspace navigation. `tabs` `{ key, label }[]`, `selectedKey`, `onChange`. Tab roles with selected state; wraps at large text.
`<SegmentedTabs tabs={[{ key: 'play', label: 'Play' }, …]} selectedKey="play" onChange={go} />`

**`SelectButton`** — full-width button showing the current choice and a chevron; opens a `ChoiceSheet`. `label` ("Preset"), `value` ("Top 2" / "Custom"), `description` ("Suggested for 6 players: Top 2"), `onPress`, `ref` (return focus here when the sheet closes).
`<SelectButton label="Preset" value="Top 2" description="Suggested" onPress={openSheet} />`

**`StepLink`** — underlined "Step 5 of 5 · Setup steps" control. `label`, `onPress`.
**`StepList`** — `steps: { key, label, status: 'notFilled' | 'needsAttention' | 'complete', current?, onPress? }[]`; steps without `onPress` show as not reached. `stepStatusLabel` maps statuses to their words.

## Overlays

**`Dialog`** — modal confirmation. `visible`, `title`, `children` (body; scrolls when long), `confirmLabel` + `onConfirm` (the specific verb), `onCancel` (Cancel button, Android back and backdrop all call it), `cancelLabel`, `destructive` (coral confirm, screen-reader focus starts on Cancel), `confirmLoading` / `confirmLoadingLabel`, `secondaryAction` `{ label, onPress }` for a third choice. `actionOrder="confirmFirst"` stacks the confirm (default choice, initial focus) on top, then the secondary action, then a quiet Cancel ("Where should changes apply?"). Short pairs sit side by side; long verbs and large text stack Cancel above the action.
`<Dialog visible={open} title="Rebuy for Ben" confirmLabel="Issue rebuy · EUR 20.00" onConfirm={issue} onCancel={close}>…</Dialog>`

**`BottomSheet`** — action sheet. `visible`, `title`, `subtitle`, `actions: { key, label, description, icon, destructive?, onPress }[]`, `onCancel`.
`<BottomSheet visible={open} title="Game actions" subtitle="In progress · Cash game · 23 Nov, 19:30" actions={…} onCancel={close} />`

**`ChoiceSheet`** — single-choice sheet (radio rows). `visible`, `title`, `choices: { key, title, detail, tag?, selected?, unavailable?, onPress }[]` (selected: tint + check; unavailable: dashed, reason in `detail`, never calls `onPress`), `footer` line under the list, `onCancel`, `cancelLabel` ("Close").
`<ChoiceSheet visible={open} title="Preset" choices={…} footer="Or type your own percentages on the ladder." onCancel={close} />`

**`focusView(view)`** — moves screen-reader focus to a rendered view (a correction target after a failed Continue, the invoking control after a sheet closes). Ref types: `ViewRef`, `TextInputRef`, `ScrollViewRef`.

**`ToastProvider`** / **`useToast()`** — one toast slot (already mounted in the root layout). `show(message, { tone?: 'confirmed' | 'error' })`, `hide()`. Announced to screen readers; disappears after `TOAST_DURATION_MS`.
`const toast = useToast(); toast.show('Result confirmed');`

**`focusView(view)`** — moves screen-reader focus to a rendered view (a heading, the step action after the last field).

## Status and data display

**`Badge`** / **`BadgeRow`** — pill with words. `label`, `tone` (`neutral` mode/count tags, `primary` Planning / In progress, `confirmed` Completed, `warning` open work like Count draft, `error`), `icon`, `size="small"`.
`<Badge label="Count draft" tone="warning" size="small" />`

**`PlaceBadge`** — round finishing-place badge ("1st"), Lavender ring with `highlight`; grows into a pill at large text. Decorative: the row or field speaks the place.

**`Avatar`** — initial in a circle, decorative (the name is always shown too). `name`, `size` (40).

**`ProgressBar`** — `value`, `max`, required `accessibilityLabel`, `tone`, `segments` for step progress.

**`ShareBar`** — proportional Lavender gradient bar for one share of a whole (`percent` 0–100). Decorative; the number sits beside it.
`<ShareBar percent={place.barPercent} />`

**`StatusCard`** — big centred status ("Everything adds up"). `tone`, `icon` or `ringText` ("4/6"), `title`, `description`, `progress` `{ value, max, accessibilityLabel }`, `children`, `ref` (to move focus here).
`<StatusCard title="Everything adds up" description="All 6 counted · 1,600 chip units" />`

**`MetricTile`** / **`MetricStrip`** — label / value / sub-label tiles that wrap. `adjustedFrom` gives the amber struck-through state; `adjusts="subLabel"` strikes the sub-label instead of the value (Blinds "1 / 2" over "~~100 BB~~ → 98 BB").
`<MetricTile label="Reserve" value="1 stack" subLabel="1 of 3 possible" adjustedFrom="3" />`

**`ChangePill`** — amber "⚠ ~~100 BB~~ → 98 BB". `from`, `to`.

**`TermsPanel`** — Play's Blinds / Rebuy / Stack panel. `items: { label, value, unit }[]`; first value in Lavender; stacks on narrow screens and large text.

**`InlineNotice`** — one quiet line (icon + words in tone colour) beside what it is about. `tone` (`warning`, `error`, `info`, `confirmed`), `title` (bold lead), `children` (the sentence), `announce`. Not a boxed callout.
`<InlineNotice tone="warning">Covers only 2 of 4 blind payments with separate chips.</InlineNotice>`

**`EmptyState`** — `icon`, `title`, `description`, `action` `{ label, onPress, icon }`.

**`FactRow`** — read-only label / value line. `label`, `value`, `unit`, `emphasis="large"` for money rows in popups, `tone`, `divider`, `stacked` (value under the label, Game details).
`<FactRow label="New total contribution" value="EUR 60.00" emphasis="large" />`

**`SignedAmount`** — `amount` ("+EUR 13.00"), `direction` (`gain` / `loss` / `even`), `caption` (Won / Lost / Gets / Pays / Even), `size`, `align`.
`<ListRow title="Alice" subtitle="EUR 20.00 contribution" trailing={<SignedAmount amount="+EUR 13.00" direction="gain" caption="Won" />} />`

**`TransferCard`** — payment instruction card: `from`, `to`, `amount`, `verb` ("pays"), `onPress`. Spoken "Bob pays Clara EUR 8.00"; stacks vertically at large text / narrow widths.

## Chips

Colours are `ChipColor | null` from `src/domain/types.ts`; `null` is "No color".

**`paintFor(color)`**, **`chipColorName(color)`**, **`chipPaint`**, **`noColorPaint`**, **`chipColorChoices`** (the 12 palette choices in picker order).

**`ChipSymbol`** — round chip. `color`, `value` (printed on the face; omit for blank), `size` (20 bullet, 28 pill, 48 tray, 60 editor row, 96 count editor), optional `accessibilityLabel` (otherwise decorative).
`<ChipSymbol color="red" value={5} size={60} />`

**`ChipPill`** / **`ChipPillRow`** — symbol + `×N`; spoken "N × value color". `color`, `value`, `count`, `showValue` (adds "(value)" as in the bank strip), `size="compact"`, `delta` ("−5" badge).
`<ChipPill color="grey" value={1} count={110} showValue />`

**`ChipColorButton`** — tappable chip + "Chip color / Red" in a denomination row. `color`, `value`, `onPress`, specific `accessibilityLabel`. `ref` lets the palette return focus to it.

**`ChipColorPalette`** — the "Chip color" dialog: all twelve choices as labelled radio tiles, staged until **Apply color**; Cancel keeps the old colour. `visible`, `color`, `description`, `onApply(color)`, `onCancel`, `returnFocusRef` (the chip button that opened it).
`<ChipColorPalette visible={open} color={row.color} description="Value: 5 chip units. Match your physical chips." onApply={apply} onCancel={close} returnFocusRef={chipRef} />`

**`ChipTray`** — compact chip preview of a set (template picker and list): chip symbol, value and colour name per denomination, wrapping. `chips: { key, color, value }[]`, `accessibilityLabel`.

**`ChipCase`** — open chip case. `denominations: { key, color, quantity: number | null }[]`. One channel per started 100 chips, channels never shared, nothing for zero/blank, max 32 channels per denomination with a "•••" mark and a caption, scales down to fit with no horizontal scroll. One labelled image (`accessibilityLabel` overridable). `chipCaseLayout()` is the pure layout.
`<ChipCase denominations={rows.map((r) => ({ key: r.id, color: r.color, quantity: parsedQuantityOrNull }))} />`

**`ChipTowers`** — 3D towers for one stack. `columns: { value, color, count }[]` (zero counts skipped, sorted ascending), `size` (`showcase` / `compact` for popups), `accessibilityLabel`. Each column is a list item "15 chips of value 1 (White)"; at most `MAX_TOWER_DISCS` (20) discs drawn.

**`StackShowcase`** — radial stage with "label … value unit" header around `ChipTowers`. `label`, `value`, `unit`, `adjustment` (e.g. a `ChangePill`), `size`.
`<StackShowcase label="1 starting stack" value="200" unit="chip units"><ChipTowers columns={mix} /></StackShowcase>`

## Hooks

**`usePressFeedback()`** — `(pressed, pressedBackground?) => style` for custom pressables: immediate colour change plus a 1-unit offset unless Reduce Motion is on. **`useReduceMotion()`** — the platform setting.

**`ViewRef`**, **`TextInputRef`**, **`ScrollViewRef`** — ref types for `inputRef`, `scrollRef` and button `ref` (focus the next field, move focus to an action).
