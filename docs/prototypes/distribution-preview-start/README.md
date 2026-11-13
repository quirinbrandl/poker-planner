# Distribution preview, alternative depth, and Start — throwaway interaction prototype

**Status: Approved — Review v5 (“i like it”).** **A · 3D Chip Towers** (for 1 starting stack only), inline strikethrough adjustment diffs (`100 BB → 98 BB` and `3 → 1 stack`) with **Start game** directly enabled, and the **Start cash game?** confirmation popup are the approved [#35](https://github.com/quirinbrandl/poker-planner/issues/35) direction. The prototype stays throwaway; implementation follows the amended tickets, not this code.

Decision: [#35 — Design distribution preview, alternative depth, and Start](https://github.com/quirinbrandl/poker-planner/issues/35).
Parent: [#30 — Wayfinder: MVP user experience and visual design](https://github.com/quirinbrandl/poker-planner/issues/30).
Affected implementation tickets: [#14](https://github.com/quirinbrandl/poker-planner/issues/14), [#15](https://github.com/quirinbrandl/poker-planner/issues/15), [#16](https://github.com/quirinbrandl/poker-planner/issues/16), [#17](https://github.com/quirinbrandl/poker-planner/issues/17).

## Run

Open `index.html` directly offline, or run from the `prototype/distribution-preview-start` worktree root:

```sh
python3 docs/prototypes/distribution-preview-start/serve.py
```

Open:

- **Selected · 3D Chip Towers (Review v5):** <http://127.0.0.1:4187/?review=v5>
- **Alternative depth diff (`100 BB → 98 BB`):** <http://127.0.0.1:4187/?review=v5&preset=alt-98>
- **Reduced reserve diff (`3 → 1 stack`):** <http://127.0.0.1:4187/?review=v5&preset=fail-reserve>
- **Archived layout comparison:** <http://127.0.0.1:4187/?review=v5&compare=layouts> (`?variant=fanned` and `?variant=tray` remain available for archive comparison only).

## Approved design & review progression

- **Review v1 → v2 (Visual stack overview):** The human rejected text-heavy stack tables and asked for a visual overview showing only total chip units and per-chip counts. Three visual concepts were built: **A · 3D Chip Towers (`towers`)**, **B · Dealer’s Spread (`fanned`)**, and **C · Precision Rack & Case Toggle (`tray`)**.
- **Review v3 (1 starting stack only):** The human selected **A · 3D Chip Towers** and removed the combined `1 player / All N` toggle (`1 starting stack` and total chip units at the top; 3D stacked chip towers with `×count` and denomination/color labels below).
- **Review v4 (Direct Start on alternative depth & reduced reserve):** The human removed the separate `Accept 98 BB` / `Keep unaccepted` pre-Start step and requested the same non-blocking behavior when full reserve cannot be met, keeping the concise **Start cash game?** confirmation popup.
- **Review v5 (Inline strikethrough adjustment diffs, no blocking banner):** Because a top warning card with `Edit chip set` and `Edit settings` buttons made it look mandatory to edit setup before continuing, Review v5 removes the top warning card, extra `Edit` buttons, and footer status sentence. Feasible previews always lead with the 3D Chip Towers showcase and highlight adjustments in-place using amber strikethrough diffs (`<s>100 BB</s> → 98 BB` and `<s>3</s> → 1 stack`) while leaving **Start cash game** directly available in the bottom dock.

## Captured screens

Captures isolate the phone surface at a 390px browser viewport:

- **Review v5 workshop & badge:** [visible Review v5 badge and phone surface](previews/review-v5.png)
- **Feasible previews (3D Chip Towers):** [100 BB with 3 reserve stacks](previews/towers-feasible.png), [explicit 0 reserve](previews/towers-zero-reserve.png), [rounded small blind (`2 / 5`)](previews/rounded-sb.png), [Tournament mode (prize pool, no chip money value)](previews/tournament-preview.png)
- **Inline strikethrough adjustment diffs (Start directly enabled):** [alternative depth `100 BB → 98 BB`](previews/alt-depth-98.png), [reduced reserve `3 → 1 stack`](previews/reduced-reserve.png)
- **Hard infeasibility & incomplete setup (Start disabled):** [scarce blind-paying chips (`k = 4`)](previews/no-valid-coverage.png), [insufficient total chip value](previews/no-valid-value.png), [unsuitable denominations](previews/no-valid-denom.png), [incomplete setup](previews/incomplete-setup.png)
- **Start & Reset lifecycle:** [Start cash game? confirmation popup](previews/start-confirm-popup.png), [locked In progress Play screen](previews/started-play.png), [Reset to Setup? destructive confirmation popup](previews/reset-confirm-popup.png)
- **Archived visual alternatives:** [B · Dealer’s Spread](previews/fanned-archived.png), [C · Precision Rack & Case Toggle](previews/tray-archived.png)
