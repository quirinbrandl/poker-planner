/** Display data for Games. Plain data only; `gameCardData` maps a game management `GameCard`. */

/** One unfinished game on Games. */
export interface GameCardData {
  /** Passed back to `onOpenGame`. */
  id: string;
  /** In progress games get the prominent highlighted card, Planning games the quiet one. */
  phase: 'planning' | 'inProgress';
  /** Badge: "In progress · Cash game". */
  identityLabel: string;
  /** Captured names in joining order, or "No players yet". */
  namesText: string;
  /** Creation date and time: "23 Nov 2026 · 19:30". */
  dateText: string;
  /**
   * Where opening it leads, without the arrow: "Resume game settings", "Open Play", or for a
   * reopened game "Reopened · calculate Payments again".
   */
  entryText: string;
}

/** Everything Games shows below New game. */
export interface GamesData {
  /** In progress games, newest-created first. */
  inProgress: readonly GameCardData[];
  /** Planning games, newest-created first. */
  planning: readonly GameCardData[];
  /** Completed games in History: the row reads "3 games", or "Empty" for 0 or while unknown. */
  historyCount?: number;
}
