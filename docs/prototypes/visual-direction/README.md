# MVP visual direction — throwaway prototype

**Status: awaiting human comparison; no direction or interaction pattern is approved.**

Question: which visual/layout direction makes a distinctive, legible phone app for a host operating a home poker game?

Decision: [Choose the MVP visual direction and core interaction patterns](https://github.com/quirinbrandl/poker-planner/issues/32). This lives only on `prototype/mvp-visual-direction`; it must not be promoted into application code. The repository has no current app route or production styling system, so this is a self-contained browser study under `docs/prototypes/`.

## Run

From the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory docs/prototypes/visual-direction
```

Open <http://localhost:4173/?variant=A>. No packages, build step, external fonts, network calls, or storage are needed. Stop with Ctrl+C. The original HTML file also opens directly for offline review.

## Compare

- `?variant=A` **Margin** — warm editorial typography, open ledger rows, generous vertical fields.
- `?variant=B` **Current** — deep slate and citron, active-game surface, grouped form controls and lower action area.
- `?variant=C` **Contour** — lilac agenda, explicit next-action rows, compact label/value alignment and step marker.
- `&screen=settings` opens the second screen directly. The floating arrows and keyboard left/right cycle variants while preserving raw draft values. Arrow shortcuts leave text fields, selects, radio groups and dialogs alone.
- Compare populated **Games** and **Game settings** at the same phone width. The other destinations are explicitly labelled previews, not implemented journeys.
- Try **Invalid buy-in**: `20.005` remains unchanged; Continue explains the error while Back and Games remain available. Advanced controls provide a dense state.
- Try **Empty / incomplete**, 150% / 200% app text, both appearances, keyboard navigation, and **Core patterns**. Cancel deletion, then accept it and reset fixtures to see the difference.
- The state inspector exposes the relevant in-memory settings. Reload resets fixtures; this prototype does not implement durable autosave.

## Proposed foundations to discuss

All directions use persistent labels, 48px-minimum controls, explicit EUR / BB / chip-unit labels, tabular numerals, non-color status text, field-level errors and a retained invalid draft. One primary action per task; outlined secondary actions; destructive actions live behind a menu and confirmation. Blocked actions remain focusable with their reason attached. A confirmed chip result can still have provisional money; only validated Completed Payments are final. These are distinct concepts, never one green check meaning all three.

For light/dark comparison, **As designed** means A/C light and B dark. **System**, **Light**, and **Dark** allow the same composition to be judged under other lighting. This review selector does not approve an in-app appearance setting. The proposed MVP choice is system appearance with both palettes; confirm with the human before handing off.

Typography is offline system sans; Margin adds an offline serif heading stack. The actual cross-platform production typeface/assets and styling implementation are not selected. Base app text is 16px, supporting copy is approximately 12–14px at default scale, and all app text scales. Margins are 20–24px; content grows and scrolls instead of truncating. No fixed-height fields or status rows. At larger text the compact form becomes stacked. Native labels, fieldsets, radios, dialogs, focus outlines, DOM reading order and validation descriptions provide browser accessibility semantics. Native iOS/Android behavior still needs implementation-time device checks.

Motion is limited to 100ms control-color feedback and a 1px press response; reduced motion removes displacement. No count-up money, celebration, auto-advancing content or motion-dependent meaning.

## Captured previews

These captures use a 390px browser viewport (374px app surface). The floating review switcher is hidden in the captures, but present in the interactive study.

| Direction | Games | Game settings | Dense / invalid |
| --- | --- | --- | --- |
| Margin | [Games](previews/A-games.png) | [Settings](previews/A-settings.png) | [Invalid](previews/A-invalid.png) |
| Current | [Games](previews/B-games.png) | [Settings](previews/B-settings.png) | [Invalid](previews/B-invalid.png) |
| Contour | [Games](previews/C-games.png) | [Settings](previews/C-settings.png) | [Invalid](previews/C-invalid.png) |

### Browser review performed

Chrome smoke checks covered variant navigation, editable-field arrow keys, invalid-input preservation across screen/variant switches, validation focus, delete cancellation/acceptance/reset, and JavaScript errors. Each direction was checked at 320px viewport width / 200% app text for horizontal overflow in both screens and the core-pattern dialog. Measured app controls have at least 48px target height; accessible numeric-field names and their validation descriptions are exposed in Chrome's accessibility tree. Across the eight semantic text/background pairs checked per appearance, the lowest contrast ratio was 5.36:1. This is browser-prototype evidence; native text scaling and VoiceOver/TalkBack checks belong to implementation.

## Fixture facts and boundaries

- Games list: six-player active cash game with six €20 buy-ins and two €20 rebuys → €160 contributions; separate six-player Planning cash game and eight-player Planning tournament. Date/time/mode/participants identify each; no custom game names.
- Settings: step 4 of 5 after mode selection, €20, 100 BB, coverage 4 and automatic reserve 3 for six players. Continue validates only the displayed fixture fields; it never claims to solve distribution.
- Pattern-only starting stack: 20 × 1 + 6 × 5 + 6 × 25 = 200 chip units. At 1/2-unit blinds it supports at least four separate payments of each blind. €20 at 100 BB gives €0.10 per chip unit. This example is not presented as the optimizer's winning allocation.
- Monetary status examples are separate fixtures, not sequential state mutations of the six-player game. A two-player example with €20 contributions each and results €30/€10 yields Jonas → Maya €10.
- No prototype control issues chips, persists data, starts/completes a real game or selects a production stack. The switcher belongs only to this standalone throwaway artifact; there is no production build.

## Review still needed

Choose or combine the direction, density, typography, palette and surface treatment; approve the default appearance strategy and interaction/accessibility/motion foundations. Then refine the selected sample if necessary. Record only the human-approved answer in the decision ticket and shared spec, with workflow-specific references in the affected implementation ticket. Detailed setup/play/Payments workflows belong to later map decisions.
