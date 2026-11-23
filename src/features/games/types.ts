/** Display data for Games. Plain data only; `gameCardData` maps a game management `GameCard`. */

/** One unfinished game on Games. */
export interface GameCardData {
  /** Passed back to `onOpenGame`. */
  id: string;
  /** In progress games get the prominent highlighted card, Planning games the quiet one. */
  phase: 'planning' | 'inProgress';
  /** Spoken identity: "In progress · Cash game". */
  identityLabel: string;
  /** Visible badge (the section heading names the phase): "Cash game". */
  modeText: string;
  /** In progress after Reopen: the card shows a "Reopened" tag. */
  reopened: boolean;
  /** Planning: how far the setup is (1-based current step of `count`), shown as a small step progress. */
  progress: { current: number; count: number } | null;
  /** Captured names in joining order, or "No players yet". */
  namesText: string;
  /** Creation date and time: "23 Nov 2026 · 19:30". */
  dateText: string;
  /**
   * Where opening it leads, spoken only (the card shows a chevron): "Resume game settings",
   * "Open Play", or for a reopened game "Reopened · calculate Payments again".
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
