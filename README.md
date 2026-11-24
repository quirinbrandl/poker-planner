# Poker Planner

Offline app for hosting home poker games on one phone: plan a cash game or tournament, get an exact chip distribution, record rebuys, results and eliminations, and work out who pays whom.

## Install on Android

Download the APK of the [latest release](https://github.com/quirinbrandl/poker-planner/releases/latest) on the phone, open it and allow the installation when Android asks. Android 7 or newer. The app works offline and keeps its games on the phone.

## Development

Requires Node 22 or newer, and for device builds JDK 17 plus the Android SDK.

```sh
npm install
npm run android     # development build on a running Android emulator or device
npm run phone       # release build onto the Android phone plugged in by USB (needs USB debugging)
npm start           # Metro dev server for an installed development build
npm run web         # browser preview for quick layout checks
npm run typecheck
npm run lint
npm test
```

The module layout and conventions are in [docs/architecture.md](docs/architecture.md); domain vocabulary is in [CONTEXT.md](CONTEXT.md).

## Releases

`npm run release` builds the APK for 64-bit and 32-bit phones, signs it with the release key and publishes it as a GitHub release named after the version in `app.json`. Before a new release, raise `version` in `app.json` and `package.json` and `android.versionCode` in `app.json`, then commit and push `main`. `npm run release -- --build-only` only builds and signs into `dist/`.

The release key is not in the repository; [scripts/release.mjs](scripts/release.mjs) says where it is expected. Updates can only be installed over a published version when they are signed with the same key, so it needs a backup. Builds from `npm run phone` are signed with the Android debug key and cannot replace a published build on a phone, or the other way round, without removing the app first.
