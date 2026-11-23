# Architecture

How the Poker Planner app is put together and where code belongs. The product rules live in the [MVP spec](https://github.com/quirinbrandl/poker-planner/issues/10) (body and its "Approved shared UX requirements" comments) and the implementation tickets #11–#29; the vocabulary lives in [`CONTEXT.md`](../CONTEXT.md). The stack decision is recorded in [ADR 0001](adr/0001-expo-react-native-with-local-sqlite-documents.md).

## Stack

- Expo SDK 58, React Native 0.88, React 19, TypeScript (strict), Expo Router with routes in `src/app`.
- `expo-sqlite` for persistence, `react-native-svg` for chip graphics and icons, `expo-crypto` for ids.
- Jest with `jest-expo` and React Native Testing Library.
- Android phone in portrait first; iOS shares the code. English UI. Always dark.

Expo changes between SDK releases. Before using an Expo or React Native API you are not sure about, read the versioned docs at `https://docs.expo.dev/versions/v58.0.0/` (index of all docs: `https://docs.expo.dev/llms.txt`). Add libraries with `npx expo install <package>`, and only when the task needs them.

## Layout and boundaries

```
src/
  app/               Routes only. Each file re-exports a screen from src/features.
  domain/            Pure TypeScript. No React, React Native, Expo or storage imports.
    types.ts         Shared vocabulary (GameMode, ChipMix, Cents ...).
    money.ts         EUR input parsing and formatting.
    distribution/    Blinds, qualifying stacks, initial recommendation, later stacks, reserve capacity.
    settlement/      Cent allocation, player balances, debt simplification.
    payouts/         Payout presets, suggestion, share validation, prize amounts.
  game-management/   The public application-level interface. See below.
    storage/         DocumentStore port and its adapters.
  state/             React binding to game management (provider and hooks).
  ui/                Design system: theme tokens, primitives, chip graphics. No game rules.
  features/          Screens and feature components: games, planning, play, results, payments, history, players, templates.
tests/               Integration tests through the game-management interface, and screen smoke tests.
```

Dependencies point one way: `features → state → game-management → domain`, and `features → ui`. `ui` never imports `game-management`; `domain` imports nothing outside `domain`.

### Game management is the only door

`src/game-management` exposes one application-level interface (`createGameManagement(...)`) for every host operation and everything the host can observe. Screens and integration tests use this interface and nothing beneath it.

- Screens never compute game rules, validation, allocations, inventory or money. If a screen needs a derived value, game management returns it as part of a view.
- Screens never talk to storage. Each accepted operation computes the new documents in memory and commits them in one transaction. A rejected, declined or cancelled operation changes nothing.
- Operations return discriminated unions that distinguish: accepted state, a saved-but-invalid draft, a proposal that needs confirmation, and a rejection with an actionable reason. Previews and proposals never issue chips or record contributions.
- Raw Planning input is stored exactly as typed (text), with validation derived from it. Empty is not zero. Nothing is rounded or coerced.
- Each game is one JSON document. Reusable players, chip set templates and the app's working location are separate documents. A game owns independent copies of its participants and chip set.
- Participants have a stable id and a fixed joining order; names and screen sorting never decide a calculation.

### Money and chips

- Money is whole EUR cents (`Cents`). Chip-unit values and quantities are whole numbers.
- No floating-point arithmetic in accounting. The cash-game rate is the exact fraction buy-in / stack value; keep exact values until the explicit Calculate Payments step allocates cents.
- A `ChipMix` has one entry per chip-set denomination in ascending value order, zero counts included.
- Recorded mixes are facts. Never replace an issued or returned mix with a recalculated recommendation.

## Routes

Route files stay thin (`export { default } from '@/features/...'`).

| Route | Screen |
| --- | --- |
| `/` | Games |
| `/new-game` | New game: choosing the mode creates the plan |
| `/history` | History |
| `/players` | Saved players (`?from=planning` when opened from the Players step) |
| `/templates`, `/templates/[templateId]` | Chip set templates, template editor |
| `/templates/choose?gameId=` | Template picker for a game's Chip set step |
| `/game/[gameId]/planning/{mode,players,chip-set,settings,payouts,preview}` | Planning wizard steps |
| `/game/[gameId]/{play,results,details,payments}` | In progress and Completed workspaces |
| `/game/[gameId]/player/[participantId]` | Player page |
| `/game/[gameId]/count/[participantId]` | Final chip count editor |
| `/game/[gameId]/rebuy-mix/[participantId]` | Forgotten rebuy / correct mix editor |
| `/game/[gameId]/fix` | One-step-at-a-time fix for a blocked correction |
| `/game/[gameId]/add-player` | Late entry |
| `/game/[gameId]/order` | Tournament finishing order editor |
| `/dev/gallery`, `/dev/<screen>?state=` | Design-system gallery and fixture states of single screens (development only) |

## UI

- Use the design system in `src/ui`. Colours, spacing, radii and type sizes come from the theme tokens; do not hard-code them in feature code. If a primitive is missing, add it to `src/ui` rather than restyling locally.
- The visual reference is the approved prototypes (throwaway HTML, never copied into the app as code) and their `previews/*.png` screenshots. Match hierarchy, grouping, density, copy and action placement.
- Baseline for every screen: touch targets at least 48×48, text scaling to 200% without clipping, accessible names and roles on every control, state never carried by colour alone, no stacked explanation boxes, concise copy.
- Motion is limited to subtle press feedback. Amounts and statuses never animate.

## Commands

```sh
npm run typecheck      # tsc --noEmit
npm run lint           # expo lint
npm test               # jest
npm run web            # Expo web dev server, for quick visual checks in a browser
npm run android        # development build on the Android emulator
```

Run typecheck, lint and the tests before calling work done.

## Tests

- The main test surface is the game-management interface: realistic host operations, then assertions on observable state, proposals, rejections and reloaded state. Use the real file-backed document store in a temporary directory and recreate the application on the same store to check restart behaviour.
- Pure domain modules (`distribution`, `settlement`, `payouts`) also get direct unit tests, including independent brute-force oracles for small cases where the spec asks for them.
- Do not test private helpers, storage layout or call counts. A refactor that keeps behaviour must not break tests.
- Keep screen tests to wiring and confirmation flows; combinatorial coverage belongs at the game-management seam.
