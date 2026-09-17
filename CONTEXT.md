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

## Money and chips

**Chip unit**:
The mode-independent numeric value assigned to a chip denomination; blind levels and starting stacks are expressed in chip units. In cash games, chip units convert to money through one global game-level value. In tournaments, chip units have no monetary value.

**Buy-in**:
A player's initial monetary contribution to a game. In a tournament it contributes to the prize pool; in a cash game it helps determine the monetary value of chip units.

**Rebuy**:
An additional monetary contribution made by a player during a game. In tournaments, a rebuy increases the prize pool and grants a tournament stack without changing any money-per-chip-unit value.
_Avoid_: Add-on

**Chip set**:
A reusable collection of physical chip denominations and available quantities used for a game.

**Big blind**:
The chip-unit value used to express blind levels and the intended starting stack size in big blinds.

**Starting stack**:
The chips distributed to a player when they enter a game; its size is connected to the selected big blind and number of big blinds.

**Distribution preference**:
The host's choice to optimize a starting stack for using as few or as many physical chips as possible. Maximum-chip optimization may reserve a configurable number of buy-ins inside the chip set.

## Settlement

**Final result**:
The end-of-game amount recorded for a player: final chips for a cash game, or the player's tournament outcome for a tournament.

**Settlement**:
The debts between players derived from their monetary contributions and final results.

**Debt simplification**:
Reducing the settlement to a set of payments that satisfies all player balances with as few payments as practical.
