# Poker Game Management

This context describes the language of a mobile app for managing home poker games, chip distribution, and end-of-game settlement.

## Game and participants

**Game**:
One tracked home poker session, run either as a cash game or a tournament.

**Host**:
The person who operates the game in the app on one phone and records its events.
_Avoid_: Organizer, admin

**Player**:
A person participating in a game whose contributions, chips, and final result are tracked.

**Cash game**:
A game in which monetary buy-ins determine the value of chip units and a player's final chip count determines their monetary result.

**Tournament**:
A game in which buy-ins and rebuys fund a prize pool, chips represent tournament stacks without direct monetary value, and results are determined through elimination and payout rules.

## Game lifecycle

**Planning**:
The phase of a game whose setup is being prepared and whose initial chip distribution has not yet been issued in the app.

**In progress**:
The phase of an unfinished game that has been explicitly started.

**Completed**:
The phase of a game whose final results have been validated and whose final settlement has been calculated and simplified.

## Money and chips

**Chip unit**:
The mode-independent numeric value assigned to a chip denomination; blind levels and starting stacks are expressed in chip units. In cash games, chip units convert to money through one global game-level value. In tournaments, chip units have no monetary value.

**Buy-in**:
A player's initial monetary contribution to a game. In a tournament it contributes to the prize pool; in a cash game it helps determine the monetary value of chip units.

**Rebuy**:
An additional monetary contribution equal to the game's initial buy-in, granting the same chip-unit value as a starting stack. In tournaments, it increases the prize pool without assigning chips a monetary value.
_Avoid_: Add-on

**Chip set**:
The physical chip denominations and available quantities configured for one game.

**Chip set template**:
A reusable definition of chip denominations and quantities from which a game's chip set is copied. A template and the chip sets copied from it are independent.

**Big blind**:
The chip-unit value used to express blind levels and the intended starting stack size in big blinds.

**Small blind**:
The smaller forced bet paired with the big blind, expressed in chip units and usually half the big blind.

**Starting stack**:
The chips distributed to a player when they enter a game; its chip-unit value is the initial big blind multiplied by the starting stack depth.

**Stack depth**:
The size of a stack expressed as a number of big blinds. Starting stack depth is measured against the game's initial big blind.

**Blind-payment coverage**:
The number of small-blind and big-blind payments a stack can fund with separate groups of its own chips, without obtaining change.

**Qualifying stack**:
A stack with exactly the required chip-unit value and at least the configured blind-payment coverage.

**Distribution preference**:
The host's choice to minimize or maximize the number of physical chips in an allocation, subject to the game's stack and reserve requirements.

**Bank**:
The chips in a game's chip set available to issue to players, including undistributed chips and chips returned through recorded cash-game final results.

**Chip reserve**:
The planned capacity of the bank to supply a specified number of additional qualifying stacks, shared by rebuys and late arrivals.

## Settlement

**Final result**:
The end-of-game amount recorded for a player: final chips for a cash game, or the player's tournament outcome for a tournament.

**Settlement**:
The debts between players derived from their monetary contributions and final results.

**Debt simplification**:
Reducing the settlement to a set of payments that satisfies all player balances with as few payments as practical.
