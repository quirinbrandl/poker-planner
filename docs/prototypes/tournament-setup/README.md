# Tournament payout setup and Start · Review v1

**Throwaway UI prototype, waiting for review.** It asks: how does tournament Planning add a payout schedule to the approved setup journey, keep chip stacks apart from prize money, and Start into a locked schedule?

Decision ticket: [Design tournament payout setup and starting](https://github.com/quirinbrandl/poker-planner/issues/39). It reuses the approved Planning ([cash-game planning](https://github.com/quirinbrandl/poker-planner/tree/1753f00fdc36c3a68dd1d7529b736200a933dcd2/docs/prototypes/cash-game-planning)), [distribution preview / Start](https://github.com/quirinbrandl/poker-planner/tree/70b9018f533581ce33a27c8625785041366071fd/docs/prototypes/distribution-preview-start) and [lifecycle](https://github.com/quirinbrandl/poker-planner/tree/d005d10b346dd532e4e2f0655d14613408a4a677/docs/prototypes/cash-game-payments) screens. Players, Chip set and Game settings are simplified stand-ins here; the distribution is a fixed fixture, not the solver. Tournament Play is the next ticket and is only stubbed. No production code, functional specification or implementation-ticket criteria are changed by this branch.

## Run

From this branch's repository root:

```sh
python3 docs/prototypes/tournament-setup/serve.py
```

Open <http://127.0.0.1:4191/>. Opening `index.html` directly works offline too. All data is in memory; reload resets it.

URL parameters:

- `variant=A|B|C`: Payout schedule layout (also the floating bar at the bottom, or ← / → keys).
- `walk=fresh|custom|shrunk|invalid|cents|nobuyin|preview|blocked|started|mode`: jump to a scenario (also listed in the side panel).
- `scale=1.5|2`: app text size.
- `open=start|reset|steps|presets`: open that popup on load (for captures).

## What is new for tournaments

The wizard is the approved one with one extra step: **Choose mode → Players → Chip set → Game settings → Payout schedule → Distribution preview**. Everything else is the cash-game design, unchanged, except where listed below.

### Payout schedule step (three layouts to choose from)

All three show the same things:

- **Prize pool** at the top: “EUR 120.00 · 6 × EUR 20.00 · rebuys add to it”. Money appears only here and next to places. No chip-unit numbers appear on this step.
- **Presets**: Winner takes all, Top 2, Top 3, Top 4, Top 5, plus Custom. The suggested preset for the current player count carries a **Suggested** tag.
- **Places**: one row per paid place with an editable percentage and its prize amount (cents floored, leftover cents to 1st place downward). Typing any percentage turns the schedule into **Custom**. **Add place** adds an empty row; the last row has a remove icon.
- **Total**: “✓ Total 100%”, or “Total 95% · 5% left” / “Total 105% · 5% too much” (amber while editing, red after Continue was tried). Prize amounts show “—” until the schedule is valid and a buy-in exists.

Layouts:

- **A · Preset chips**: a wrap of preset chips above one card with the place rows. Everything on one screen.
- **B · Preset cards**: one radio card per preset with its split, a proportional bar and the actual prize amounts for this pool. Presets that need more places than players are disabled (“Needs 5 players”). **Custom** expands the place editor inside its card.
- **C · Prize ladder**: a large prize-pool hero, a **Preset** button that opens a sheet, then one card per place with a big amount, the percentage field and a share bar.

### Suggestions versus rules (same in all layouts)

- **First visit** preselects the suggested preset (2 players: Winner takes all; 3–6: Top 2; 7+: Top 3) and saves it as the plan's schedule.
- **After that, nothing changes it but the host.** Adding or removing players moves the **Suggested** tag but never replaces the schedule, not even a preselected one.
- **Rules are errors, not suggestions:** shares must be positive, use at most 2 decimals (dot or comma), not exceed 100%, never be higher than the place above, and total exactly 100%. Equal shares are allowed (“Equal shares are fine. Places still come from the elimination order.”). Paid places can't exceed players; Add place is disabled at that limit.
- **Roster shrank below the paid places:** the schedule is kept and flagged: “4 paid places, but only 3 players.” with one fix button, **Use Top 2** (the current suggestion). The host can also remove places or pick another preset.
- Errors appear when the host leaves a field or presses Continue. Continue stays on the step until the schedule is valid. Back, Games, the step list and restart keep invalid raw text.
- **No buy-in yet:** percentages can be set; the prize pool reads “—” with “Add a buy-in to see prize amounts.” and an **Edit game settings** link.

### Other tournament-specific changes

- **Game settings**: identical five controls. The buy-in gets one line: “Goes into the prize pool. Rebuys cost the same.”
- **Step list**: Payout schedule shows Not filled in / Needs attention / Complete like the other steps. Switching to Cash game hides the step and keeps the schedule; switching back restores it.
- **Distribution preview**: the approved screen, with the approved Prize pool tile (“No chip money value”), plus one **Payouts · Top 2** card under the metric strip (place, %, amount, edit icon → Payout schedule with **Return to preview**). An invalid or missing schedule uses the approved **Setup incomplete** card (“Payout schedule · Total is 95%, needs 100%.” → **Fix payouts**), and Start stays disabled.
- **Start tournament?**: the approved popup with “Records initial stacks for 6 players and locks setup and payouts.” and rows Each starting stack, Blinds, **Prize pool EUR 120.00 (6 × 20.00)**, **Payouts 70% / 30%**, Reserve. Alternative depth and reduced reserve keep the approved inline diffs and wording.
- **In progress → Game details**: a **Payouts · Top 2 · Locked** card with current amounts, then “Prize pool EUR 140.00 · 6 buy-ins + 1 rebuy. Rebuys raise every prize; the percentages stay.” and the approved locked-setup line.
- **Return to Planning?**: the approved popup; Keeps lists “players · buy-ins · settings · payout schedule”. After it, the schedule is editable again.

## Captures

Phone surface at 390px: `previews/review-v1-layouts.png` (A / B / C side by side), `previews/review-v1-shared.png` (roster shrank, preview, Start popup, locked details), and one file per state (`review-v1-*.png`).

## Checks run

A scripted Chromium run covered all three layouts: editing to Custom, totals, Continue blocking, the higher-than-above error, comma decimals, 3-decimal rejection, Add place, amounts (72.00 / 30.60 / 17.40 for EUR 120 at 60 / 25.5 / 14.5), preset replacement, removing players down to 2 (schedule kept and flagged), the one-tap fix, Return to preview, Start, locked Game details, Return to Planning keeping the schedule, mode switch retention and restart keeping raw invalid text. No page errors. No horizontal overflow in the checked 390px and 320px views, including 200% app text. The EUR 20.01 at 50 / 30 / 20 example shows EUR 10.01 / 6.00 / 4.00. Native text scaling, VoiceOver/TalkBack and real persistence remain implementation-time checks.
