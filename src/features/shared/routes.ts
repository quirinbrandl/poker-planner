import type { Href } from 'expo-router';

import type { StepId, WorkingLocation } from '@/game-management';

const STEP_SEGMENT: Record<StepId, string> = {
  mode: 'mode',
  players: 'players',
  chipSet: 'chip-set',
  settings: 'settings',
  payouts: 'payouts',
  preview: 'preview',
};

/** The Games home. */
export const gamesHref = '/' as Href;

/** A Planning wizard step of one game. */
export function planningStepHref(gameId: string, step: StepId): Href {
  return `/game/${gameId}/planning/${STEP_SEGMENT[step]}` as Href;
}

/** Where a recorded working location lives in the route tree. */
export function locationHref(location: WorkingLocation): Href {
  switch (location.kind) {
    case 'planning':
      return planningStepHref(location.gameId, location.step);
    case 'history':
      return '/history' as Href;
    case 'savedPlayers':
      return '/players' as Href;
    case 'templates':
      return '/templates' as Href;
    default:
      return gamesHref;
  }
}

/** New game: the mode choice that creates the plan. */
export const newGameHref = '/new-game' as Href;

export const historyHref = '/history' as Href;
export const savedPlayersHref = '/players' as Href;
export const templatesHref = '/templates' as Href;
