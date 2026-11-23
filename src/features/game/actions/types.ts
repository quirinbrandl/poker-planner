/**
 * Display data for the game actions (⋯) sheet and its confirmations. Plain data only; the host
 * maps game management's views into it.
 */

/** The game's lifecycle phase: decides which actions the sheet offers. */
export type GameActionsPhase = 'planning' | 'inProgress' | 'completed';

/** A lifecycle action behind ⋯; each opens its own confirmation. */
export type GameAction = 'returnToPlanning' | 'reopen' | 'delete';

/** The game the sheet and its confirmations are about. */
export interface GameActionsGame {
  phase: GameActionsPhase;
  /** Mode: the Reopen wording differs for a tournament. */
  mode: 'cash' | 'tournament';
  /** Sheet subtitle: "In progress · Cash game · 23 Nov, 19:30". */
  subtitle: string;
  /** Delete popup badge: "Completed · Cash game". */
  identityLabel: string;
  /** Captured participant names in joining order: "Alice, Bob, Clara", or "No players yet". */
  namesText: string;
  /** Creation date and time: "23 Nov 2026 · 19:30". */
  dateText: string;
}

/** What Return to Planning? lists. Zero parts are left out by whoever builds it (see `clearsParts`). */
export interface ReturnToPlanningData {
  /** What is cleared, in order: ["2 rebuys", "6 results", "all handed-out stacks"]. */
  clears: readonly string[];
  /** What is kept, in order: ["6 players", "buy-ins", "settings"] (tournament adds "payout schedule"). */
  keeps: readonly string[];
}
