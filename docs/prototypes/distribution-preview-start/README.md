# Distribution preview, alternative depth, and Start — throwaway interaction prototype

**Status: Review v2 — three low-text visual starting-stack designs for human comparison.**

Decision: [#35 — Design distribution preview, alternative depth, and Start](https://github.com/quirinbrandl/poker-planner/issues/35).
Parent: [#30 — Wayfinder: MVP user experience and visual design](https://github.com/quirinbrandl/poker-planner/issues/30).
Affected implementation tickets: [#14](https://github.com/quirinbrandl/poker-planner/issues/14), [#15](https://github.com/quirinbrandl/poker-planner/issues/15), [#16](https://github.com/quirinbrandl/poker-planner/issues/16), [#17](https://github.com/quirinbrandl/poker-planner/issues/17).

## Run

Open `index.html` directly offline, or run from the `prototype/distribution-preview-start` worktree root:

```sh
python3 docs/prototypes/distribution-preview-start/serve.py
```

Open:

- **A · 3D Chip Towers (Spotlight Plinth):** <http://127.0.0.1:4187/?review=v2&variant=towers>
- **B · Dealer’s Spread (Fanned Cascades):** <http://127.0.0.1:4187/?review=v2&variant=fanned>
- **C · Precision Rack & Case Toggle:** <http://127.0.0.1:4187/?review=v2&variant=tray>

Switch variants at any time using the floating bottom bar (`?variant=`) or Left/Right arrow keys.

## Three low-text visual stack designs (`Review v2`)

Following feedback on v1 ("a visual overview where you can quickly understand how many chips are in one stack… only need how many total units and then for each chip how many"), Review v2 strips away the prose paragraphs and repeated per-denomination unit subtotals, putting a visual hero card at the top that displays only:
- **Total chip units** (`200 chip units`) with a 1-tap `1 player` / `All N players` scope toggle.
- **For each chip denomination, how many chips** (`×15`, `×2`, `×3`, `×1`):
  1. **A · 3D Chip Towers (`?variant=towers`):** Isometric 3D stacked chip columns on a radial-lit plinth, with individual grooved chip discs, edge spots, 5-chip highlight rings, and the denomination value on the top chip face, paired with a bold `×15` count below each column.
  2. **B · Dealer’s Spread (`?variant=fanned`):** Horizontal dark-glass lanes where each denomination spreads out as an overlapping cascade of individual chips grouped in 5s, with the colored chip symbol on the left and a bold `×15` count pill on the right.
  3. **C · Precision Rack & Case (`?variant=tray`):** Calibrated vertical acrylic tray wells with 5-chip gauge marks (`5 · 10 · 15 · 20`), topped by the chip symbol and a glowing Lavender `×15` badge at the base, plus a 1-tap toggle to view the remaining open poker-chip case.
