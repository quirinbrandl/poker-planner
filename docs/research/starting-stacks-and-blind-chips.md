# Starting stacks and blind-paying chips

Supporting research for [Define big-blind and starting-stack recommendations](https://github.com/quirinbrandl/poker-planner/issues/7). This note records evidence and its limits; the ticket's resolution is the canonical product decision.

## Findings

### Small blind: usually half, not a universal rounding rule

[PokerStars' Texas Hold'em rules](https://www.pokerstars.com/poker/games/texas-holdem/) describe the big blind as typically twice the small blind, with variations depending on stakes and betting structure. Their limit-poker example uses a 10 small blind and 15 big blind, so an odd big blind does **not** imply a universal round-down rule. That limit example is not a recommended structure for this app.

The chip manufacturer SLOWPLAY's [home-game distribution guide](https://www.slowplay.store/blogs/news/poker-chip-value-and-distribution) includes cash-game examples with 1/2, 2/5, 5/10, and 10/25 blinds. This demonstrates published examples of small blinds below half the big blind, but does not establish a universal rounding algorithm. In particular, 10/25 is not the integer floor of 25/2.

Implication: support for a smaller-than-half small blind is a product decision. If supported, define rounding against playable chip values rather than simply whether the big blind is an odd number. Never round to zero.

### A blind does not have to equal one physical chip

SLOWPLAY's guide lists cash-game denominations of 1, 5, 10, and 25, and its 1/2 example gives each player ten 1-unit chips. There is no 2-unit chip: the big blind is paid with two 1-unit chips.

Its tournament example gives each player eight 25-unit chips, eight 100-unit chips, two 500-unit chips, and one 1,000-unit chip: 3,000 units total. Its initial blinds are 25/50. Again, there is no chip whose denomination equals the big blind.

The numerical tables are images embedded in the guide:

- [Cash-game distributions](https://cdn.shopifycdn.net/s/files/1/0067/3926/3555/files/0874b16c285a732897d71abc11c3b647_2048x2048.jpg?v=1608518579).
- [3,000-unit tournament distribution](https://cdn.shopifycdn.net/s/files/1/0067/3926/3555/files/525b9eaf8dbc899a7ca5e37758a0b066_1024x1024.jpg?v=1608519521).
- [Tournament blind levels](https://cdn.shopifycdn.net/s/files/1/0067/3926/3555/files/28ebd35839d4feec06c6af07fcefd186_1024x1024.jpg?v=1608520077).

Caution: the cash-game table contains inconsistent amounts in its 10/25 section. Do not copy its entire table as validated arithmetic. The cited 1/2 row and the tournament stack above were checked independently.

Implication: distinguish **one-chip blind payments** from **exact blind payments without obtaining change**. They are different requirements. Requiring a dedicated chip denomination for each blind would exclude the two examples above.

### No universal minimum blind-chip count established

The sources reviewed provide suggested distributions, not a mandatory minimum number of SB- and BB-denomination chips. The examples above start with eight or ten chips of the smallest denomination; they do not justify a universal requirement such as ten SB chips plus ten BB chips.

For 1/2 blinds paid entirely with 1-unit chips, covering `k` small-blind payments and `k` big-blind payments with disjoint groups requires `3k` chips. This is arithmetic, not a poker standard prescribing a particular `k`. Such coverage describes initial payments only; intervening bets, wins, and losses change a player's available chips.

### Tournament depth varies with the structure

SLOWPLAY's tournament example starts with 3,000 units at 25/50: **60 BB**, derived from its published numbers. The same guide offers a 10,000-unit deeper-stack option. There is no universal 100-BB tournament start established by these sources.

[PokerStars' home-game structure guide](https://www.pokerstars.com/poker/learn/news/how-to-set-up-a-pokerstars-home-game-and-get-your-blind-structure-right/67283/), prepared with its card-room team, explains that starting stacks, level duration, player count, table size, and re-entry/late-registration choices influence tournament duration. It presents several stack sizes and level speeds rather than one required stack depth. Its timing estimates concern its online Home Games product, not a timing guarantee for physical home games.

Implication: a product-specific starting-depth default should be described as a recommendation, not a tournament standard or a duration promise. As the big blind rises, an unchanged chip stack represents fewer BB. Choosing or managing a full blind progression is separate from selecting an initial stack.
