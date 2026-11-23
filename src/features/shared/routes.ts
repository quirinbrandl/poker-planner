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

/** The workspace tabs of a started game: Play, Results, Game details, Payments. */
export function playHref(gameId: string): Href {
  return `/game/${gameId}/play` as Href;
}
export function resultsHref(gameId: string): Href {
  return `/game/${gameId}/results` as Href;
}
export function detailsHref(gameId: string): Href {
  return `/game/${gameId}/details` as Href;
}
export function paymentsHref(gameId: string): Href {
  return `/game/${gameId}/payments` as Href;
}

/** One player's page: every record of that player. */
export function playerHref(gameId: string, participantId: string): Href {
  return `/game/${gameId}/player/${participantId}` as Href;
}

/** The final chip count editor of one player. */
export function countHref(gameId: string, participantId: string): Href {
  return `/game/${gameId}/count/${participantId}` as Href;
}

/** Forgotten rebuy (no `rebuyId`) or Correct mix of one recorded rebuy. */
export function rebuyMixHref(gameId: string, participantId: string, rebuyId?: string): Href {
  return `/game/${gameId}/rebuy-mix/${participantId}${rebuyId ? `?rebuyId=${rebuyId}` : ''}` as Href;
}

/** The one-step-at-a-time fix for a blocked correction. */
export function fixHref(gameId: string): Href {
  return `/game/${gameId}/fix` as Href;
}

/** Late entry: choose who joins. */
export function addPlayerHref(gameId: string): Href {
  return `/game/${gameId}/add-player` as Href;
}

/** Tournament finishing order editor. */
export function orderHref(gameId: string): Href {
  return `/game/${gameId}/order` as Href;
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
