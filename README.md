# Poker Planner

Offline app for hosting home poker games on one phone: plan a cash game or tournament, get an exact chip distribution, record rebuys, results and eliminations, and work out who pays whom.

## Development

Requires Node 22 or newer, and for device builds JDK 17 plus the Android SDK.

```sh
npm install
npm run android     # development build on a running Android emulator or device
npm start           # Metro dev server for an installed development build
npm run web         # browser preview for quick layout checks
npm run typecheck
npm run lint
npm test
```

The module layout and conventions are in [docs/architecture.md](docs/architecture.md); domain vocabulary is in [CONTEXT.md](CONTEXT.md).
