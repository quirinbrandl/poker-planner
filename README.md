# Poker Planner

An offline, single-host mobile app for planning home poker games. This first slice implements [#11](https://github.com/quirinbrandl/poker-planner/issues/11), under [the product specification #10](https://github.com/quirinbrandl/poker-planner/issues/10).

## What works

- Create, list, select, edit, and resume independent cash-game and tournament plans.
- Autosave immediately, including empty, malformed, and duplicate field values. Field-level feedback returns after restart.
- Game-specific participants with stable identities and joining order; game-specific chip denominations and quantities.
- Shared EUR-cent buy-in, recommended 100 BB depth, coverage default 4/minimum 1, min/max chip preference, automatic or explicit reserve (including zero).

**Planning only:** no chip issuance, distribution solver, Start, play records, reusable-data management, or settlement yet. A field-valid saved plan is not a verified playable distribution. Tournament chips never acquire a monetary value.

## Run

Use Node **24 LTS** (minimum 22.13 for the real SQLite tests) and npm:

```sh
npm ci
npm start
```

The app uses **Expo SDK 55 / React Native 0.83 / TypeScript**. Target baseline: **iPhone with iOS 15.1+** and **Android phones with Android 7/API 24+**, portrait touch UI. Web, tablet-specific layouts, and desktop are not supported targets. These are new implementation choices, not pre-existing product decisions; see [ADR 0001](docs/adr/0001-mobile-planning-storage.md).

For native development, install full Xcode + an iOS simulator (macOS), or Android Studio + SDK/emulator, then run `npm run ios` or `npm run android`. A compatible SDK-55 Expo Go client can also be used, but it is a development tool, not the offline delivery artifact.

### Standalone offline builds

Development uses Metro. To test real offline startup, install a locally built app with its JavaScript bundled:

```sh
npx expo run:ios --configuration Release
# or, with an Android device/emulator connected:
npx expo run:android --variant release
```

Building initially downloads dependencies and iOS device installation requires local signing. Installed release builds need no account, server, Metro, or internet. OTA updates are disabled. Games live in app-private SQLite; uninstalling the app deletes them. There is no cloud sync or export.

## Checks

```sh
npm run typecheck
npm run test:integration -- tests/planning.test.ts
npm run test:mobile -- tests/planning.smoke.tsx
npm test
npm run format:check
npx expo install --check
npx expo-doctor
npx expo export --platform ios --platform android
```

Vitest integration tests and the Jest/React Native Testing Library smoke test exercise the **same application interface**, with isolated, real, file-backed SQLite stores (`node:sqlite`). Every test owns a temporary directory and never opens the phone's or host's saved games. The smoke test renders native controls with the real game-management module; it is not a physical-device test or a test of Expo's native SQLite bridge. See [device smoke steps](docs/testing/mobile-smoke.md).

Native JS bundles and component wiring can be checked without a simulator. Actual device compatibility, native SQLite restart behavior, keyboard, and visual checks still require the device smoke run; do not infer those from Jest or a successful bundle export.

## Code map

- `src/game-management/index.ts`: the public host-operation interface, raw Planning drafts, validation, and atomic SQLite persistence. UI and primary tests use it; there are no public calculation helpers.
- `src/game-management/native.ts`: production SQLite/UUID wiring.
- `src/mobile/PlanningApp.tsx`: accessible list and autosaving Planning form.
- `App.tsx`: native startup, storage-opening failure feedback, and safe-area layout.
- `tests/support/local-store.ts`: real Node SQLite adapter and isolated-store lifecycle.
- [Application interface contract](docs/application-interface.md).

## Dependency note

The lockfile pins the tested dependency set. `npm audit` currently reports moderate advisories through Expo's **build-time** `xcode → uuid` dependency chain. Application IDs use `expo-crypto`, not that package. No high/critical advisories were reported. Do not apply `npm audit fix --force`: its suggested Expo downgrade is incompatible with this app. Recheck on SDK upgrades.
