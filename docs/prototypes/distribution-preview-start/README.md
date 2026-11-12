# Distribution preview, alternative depth, and Start — throwaway interaction prototype

**Status: Review v4 — 3D Chip Towers + Notice-Only Alternative Depth & Reduced Reserve.**

Decision: [#35 — Design distribution preview, alternative depth, and Start](https://github.com/quirinbrandl/poker-planner/issues/35).
Parent: [#30 — Wayfinder: MVP user experience and visual design](https://github.com/quirinbrandl/poker-planner/issues/30).
Affected implementation tickets: [#14](https://github.com/quirinbrandl/poker-planner/issues/14), [#15](https://github.com/quirinbrandl/poker-planner/issues/15), [#16](https://github.com/quirinbrandl/poker-planner/issues/16), [#17](https://github.com/quirinbrandl/poker-planner/issues/17).

## Run

Open `index.html` directly offline, or run from the `prototype/distribution-preview-start` worktree root:

```sh
python3 docs/prototypes/distribution-preview-start/serve.py
```

Open:

- **Selected · 3D Chip Towers (Review v4):** <http://127.0.0.1:4187/?review=v4>
- **Archived layout comparison:** <http://127.0.0.1:4187/?review=v4&compare=layouts> (`?variant=fanned` and `?variant=tray` remain available for archive comparison only).

## Review v4 refinements

- **Selected A · 3D Chip Towers (1 starting stack only):** displays total chip units (`200 chip units`) at the top and each denomination's 3D stacked chip tower, chip count (`×15`, `×2`, `×3`, `×1`), and denomination/color label below, with the combined-stack toggle removed.
- **Notice-only alternative depth (Option 2):** when requested depth (`100 BB`) is infeasible and a nearby depth (`98 BB`) works, displays a notice card (`Using 98 BB instead of 100 BB`) with `Edit chip set` / `Edit settings` while keeping **Start game** directly enabled (no separate `Accept 98 BB` or `Keep unaccepted` button). Editing setup preserves the requested `100 BB`.
- **Notice-only reduced reserve:** following the existing spec priority (first searching across depths that preserve the full configured reserve, e.g. `98 BB` with `3` reserve stacks), if no depth can satisfy all `R` reserve stacks, falls back to the highest achievable reserve count (`r < R`, e.g. `1 of 3 reserve stacks`), shows a warning notice (`Only 1 of 3 reserve stacks possible`) with `Edit chip set` / `Edit settings`, and leaves **Start game** directly enabled.
- **Start confirmation dialog (Q2 Option A):** tapping **Start cash game** opens a concise confirmation popup summarizing stack units, blinds, buy-in, and reserve (noting any alternative depth or reduced reserve) before locking setup and entering `In progress → Play`.
