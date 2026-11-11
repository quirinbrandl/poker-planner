# Distribution preview, alternative depth, and Start — throwaway interaction prototype

**Status: Review v3 — selected A · 3D Chip Towers with combined-stack toggle removed.**

Decision: [#35 — Design distribution preview, alternative depth, and Start](https://github.com/quirinbrandl/poker-planner/issues/35).
Parent: [#30 — Wayfinder: MVP user experience and visual design](https://github.com/quirinbrandl/poker-planner/issues/30).
Affected implementation tickets: [#14](https://github.com/quirinbrandl/poker-planner/issues/14), [#15](https://github.com/quirinbrandl/poker-planner/issues/15), [#16](https://github.com/quirinbrandl/poker-planner/issues/16), [#17](https://github.com/quirinbrandl/poker-planner/issues/17).

## Run

Open `index.html` directly offline, or run from the `prototype/distribution-preview-start` worktree root:

```sh
python3 docs/prototypes/distribution-preview-start/serve.py
```

Open:

- **Selected · 3D Chip Towers (Review v3):** <http://127.0.0.1:4187/?review=v3>
- **Archived layout comparison:** <http://127.0.0.1:4187/?review=v3&compare=layouts> (`?variant=fanned` and `?variant=tray` remain available for archive comparison only).

## Review v3 refinement

- Selected **A · 3D Chip Towers (Spotlight Plinth)** as the default visual starting-stack overview.
- Removed the `1 player / All N` combined-stack toggle: the showcase now focuses solely on **1 starting stack**, displaying **total chip units** (`200 chip units`) at the top and each denomination's 3D stacked chip tower, chip count (`×15`, `×2`, `×3`, `×1`), and denomination/color label below.
- Below the starting-stack showcase sit the compact **3-tile metrics strip** (`Blinds`, `Cash value` / `Prize pool`, `Reserve`) and the **Unissued bank** chip pill strip.
