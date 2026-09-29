# Mobile smoke check

## Automated wiring check

`npm run test:mobile -- tests/planning.smoke.tsx` mounts the React Native Planning screen with the real game-management module and isolated file-backed SQLite. It checks create/edit/list/select wiring, field-level feedback, invalid drafts after remount/reopen, independent games, reserve zero, recommendations, and the absence of Start/settlement actions. Native control plumbing comes from Jest Expo; persistence is real Node SQLite, not a mocked store.

## Device check before release

Use a **bundled release build**, not a Metro-dependent debug app. Run on both an iPhone/iOS 15.1+ and an Android/API 24+ phone or emulator, including a small phone viewport. Record exact device/OS/build and results below.

1. Install while connected, stop Metro, enable airplane mode, and launch.
2. Create a cash game; leave fields blank. Return to the list, force-stop the app, relaunch, and select the saved Untitled game. It must still be Planning with defaults 100 BB and coverage 4.
3. Name it Friday, add Alice and Bob, then temporarily rename Bob to `alice`. Both names must show unique-name feedback. Correct Bob; identities/order must not change.
4. Enter buy-in `2000` cents, a fractional chip denomination or quantity (paste `1.5` if the keyboard lacks a separator), clear stack depth, and set coverage `0`. Force-stop/relaunch. Exact invalid text and field-level feedback must return. Correct the fields; feedback clears without changing other inputs.
5. Add three participants in total: Automatic reserve must show 2. Choose Explicit, enter 0, add another participant, and restart: it must still be explicit 0. Switch Automatic back on and add a fifth participant: target becomes 3.
6. Create a separate tournament. Verify the 100-BB recommendation, no chip-to-money value, and the explanation that buy-ins fund the prize pool. Edit chips and preference. Switch between both plans: nothing leaks between them.
7. Remove a Planning participant and chip row, then restart: only those entries are gone. No Start, chip issuance, or settlement action is available, even if all fields are valid.
8. Verify labels, screen-reader selection states, error readability, 48-point touch targets, scrolling with the keyboard, safe areas, and editing the bottom reserve field. No keyboard should permanently cover an input.
9. Repeat offline restart without Metro running. No login, account, network request, or loading dependency may be required for game operations.

## Execution record

- Automated native-control wiring smoke: run during #11 implementation with a real isolated Node SQLite store.
- iOS/Android JS bundle exports: checked during #11 implementation; this is not proof of native runtime behavior.
- Device/emulator run: **not yet performed**. The implementation environment lacks full Xcode and an Android SDK/emulator. The native SQLite bridge, OS restart, keyboard, and visual checks above remain a release gate; do not mark them passed based on Jest.
