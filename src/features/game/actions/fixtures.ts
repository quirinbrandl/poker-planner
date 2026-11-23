/** Development and test fixtures for the game actions sheet and its confirmations. */
import { clearsParts, keepsParts } from './texts';
import type { GameActionsGame, ReturnToPlanningData } from './types';

const SIX = 'Alice, Bob, Clara, David, Emma, Felix';

export const ACTION_GAMES = {
  planning: {
    phase: 'planning',
    mode: 'cash',
    subtitle: 'Planning · Cash game · 25 Nov, 19:30',
    identityLabel: 'Planning · Cash game',
    namesText: 'Maya, Jonas, Lena, Sam, Alex, Noor',
    dateText: '25 Nov 2026 · 19:30',
  },
  inProgress: {
    phase: 'inProgress',
    mode: 'cash',
    subtitle: 'In progress · Cash game · 23 Nov, 19:30',
    identityLabel: 'In progress · Cash game',
    namesText: SIX,
    dateText: '23 Nov 2026 · 19:30',
  },
  completed: {
    phase: 'completed',
    mode: 'cash',
    subtitle: 'Completed · Cash game · 23 Nov, 19:30',
    identityLabel: 'Completed · Cash game',
    namesText: SIX,
    dateText: '23 Nov 2026 · 19:30',
  },
  tournamentInProgress: {
    phase: 'inProgress',
    mode: 'tournament',
    subtitle: 'In progress · Tournament · 23 Nov, 19:30',
    identityLabel: 'In progress · Tournament',
    namesText: SIX,
    dateText: '23 Nov 2026 · 19:30',
  },
  tournamentCompleted: {
    phase: 'completed',
    mode: 'tournament',
    subtitle: 'Completed · Tournament · 23 Nov, 19:30',
    identityLabel: 'Completed · Tournament',
    namesText: SIX,
    dateText: '23 Nov 2026 · 19:30',
  },
  /** Twelve long names: the sheet and Delete popup at large text. */
  large: {
    phase: 'completed',
    mode: 'cash',
    subtitle: 'Completed · Cash game · 23 Nov, 19:30',
    identityLabel: 'Completed · Cash game',
    namesText:
      'Alexandra-Marie, Bartholomew, Clara, David, Emma, Felix, Grace, Hana, Ivan, Jonas, Kai, Lena',
    dateText: '23 Nov 2026 · 19:30',
  },
} satisfies Record<string, GameActionsGame>;

export type ActionGameName = keyof typeof ACTION_GAMES;

export const RETURN_TO_PLANNING_FIXTURES = {
  /** 2 rebuys · 6 results · all handed-out stacks / 6 players · buy-ins · settings. */
  cash: { clears: clearsParts({ eliminations: 0, rebuys: 2, results: 6 }), keeps: keepsParts({ players: 6, mode: 'cash' }) },
  /** Nothing recorded yet: only the stacks are cleared. */
  fresh: { clears: clearsParts({ eliminations: 0, rebuys: 0, results: 0 }), keeps: keepsParts({ players: 6, mode: 'cash' }) },
  /** 2 eliminations · 1 rebuy · all handed-out stacks, keeping the payout schedule. */
  tournament: {
    clears: clearsParts({ eliminations: 2, rebuys: 1, results: 0 }),
    keeps: keepsParts({ players: 6, mode: 'tournament' }),
  },
} satisfies Record<string, ReturnToPlanningData>;
