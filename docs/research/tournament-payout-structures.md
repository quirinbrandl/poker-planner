# Tournament payout structures for home games

Research for [Research standard home tournament payout structures](https://github.com/quirinbrandl/poker-planner/issues/6).

## Sources checked

- PokerStars tournament rules, especially eliminations, deal-making, and cancellation handling: <https://www.pokerstars.com/poker/tournaments/rules/>
- Poker Game Database payout calculator guidance for recreational/home-game payout presets: <https://pokergamedatabase.com/tools/payout-calculator/>

## Findings

### How many places to pay

There is no single universal payout table for small recreational tournaments. Home-game guidance clusters around:

- **2–10 players:** pay 2–3 places.
- **11–30 players:** pay 4–5 places.
- **30+ players:** pay a final-table sized set, commonly 8–9 places.

Poker Game Database's payout calculator describes those ranges directly and presents these presets:

- **Standard top 3:** `50 / 30 / 20`.
- **Top 4:** `50 / 25 / 15 / 10`.
- **Balanced 5:** `40 / 25 / 20 / 10 / 5`.

For this app's MVP, the smallest useful model is a percentage payout schedule over finishing places, with a small set of presets plus host override.

### Prize pool and rebuys

The project glossary already defines tournament buy-ins and rebuys as monetary contributions to the prize pool. PokerStars tournament rules treat buy-ins and rebuys/add-ons as tournament entries or contributions that can be refunded or compensated separately from fees in cancellation scenarios, which supports keeping a tournament prize pool distinct from chip units and tracking rebuys as prize-pool-increasing events.

For the MVP, a tournament prize pool should be:

```text
sum(initial buy-ins) + sum(rebuys) - optional host fee/rake if supported
```

Given the project's home-game/social scope and the legal sensitivity of rake, the default should be **no host fee/rake**. If fees are included at all, make them explicit and subtract them before computing payouts.

### Ties and simultaneous eliminations

PokerStars' elimination rule says that if two or more players are eliminated on the same hand, the player with more chips at the start of the hand finishes higher. If they started the hand with identical stacks, they tie for that rank and prizes due to those players are equally distributed between them.

For the MVP, this implies two useful levels of support:

1. Default/manual: host records distinct finishing places.
2. Tie support: host may assign multiple players to the same finishing place; the app combines the payouts for the occupied tied places and splits that amount equally among them.

Example: if 2nd pays €30 and 3rd pays €20, two players tied across 2nd/3rd each receive €25.

### Deals/chops

PokerStars allows deal-making when all remaining players agree, and says agreed deals alter the originally published payouts. It also lists common deal formulas: ICM, chip-count, and even split.

For the MVP, a full ICM/chip-count deal calculator is beyond the current destination's simplified payout scope. But host customization should allow manual payout overrides so a home game can record an agreed chop without the app needing to negotiate or validate it.

### Rounding

Payout percentages rarely divide a money prize pool exactly. PokerStars has an example rule for splitting odd cents in bounties: divide equally and award odd cents by position order. For home games, the app should avoid sub-cent/sub-minor-unit amounts and make rounding transparent.

Recommended MVP rounding:

- Calculate all payouts in the currency's minor unit.
- Floor each percentage payout to a whole minor unit.
- Distribute remaining minor units one at a time from highest finishing place downward until the whole prize pool is allocated.
- For tied places, split the combined payout over tied players; if there is a residue, allocate extra minor units by a deterministic order the host can see or adjust.

This preserves the invariant that total payouts equal the prize pool.

## Recommendation for the MVP decision ticket

Support a **configurable payout schedule**:

- `paidPlaces`: ordered list of finishing places with percentage shares summing to 100%.
- Presets:
  - winner-take-all: `100` (useful for 2-player/head-to-head or very small groups)
  - top 2: `70 / 30` or `65 / 35` (optional; if only one top-2 preset is desired, choose `70 / 30`)
  - top 3: `50 / 30 / 20`
  - top 4: `50 / 25 / 15 / 10`
  - top 5: `40 / 25 / 20 / 10 / 5`
- Host can choose a preset, change percentages, change number of paid places, or manually override final payout amounts.
- Validation:
  - percentage shares must be non-negative and sum to 100% before percentage-based payout calculation;
  - number of paid places must not exceed player entries that can finish;
  - rounded payouts must sum exactly to the prize pool;
  - manual payouts must sum exactly to the prize pool unless the host explicitly records an unallocated remainder.
- Tournament result recording should support finishing place, elimination order, and optional ties/shared places.

Leave advanced tournament variants out of MVP: bounties, satellites, guarantees, ICM/chip-count deal calculators, live clock/blind management, and payment processing.
