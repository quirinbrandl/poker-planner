import { REOPENED_ENTRY } from '@/features/game/actions/texts';
import { formatGameDateTime, participantNamesLabel, phaseModeLabel } from '@/features/shared/format';
import type { GameCard } from '@/game-management';

import type { GameCardData } from './types';

/** "Resume game settings", "Resume players": the explicit way back into a Planning game. */
function planningEntry(game: GameCard): string {
  if (game.lastStep === 'mode' || !game.lastStepTitle) return 'Resume mode choice';
  return `Resume ${game.lastStepTitle.toLowerCase()}`;
}

/**
 * A Games card from game management's `GameCard`. A reopened In progress game (`GameCard.reopened`,
 * or `extra.reopened` for fixtures) gets the reopened entry line.
 */
export function gameCardData(game: GameCard, extra: { reopened?: boolean } = {}): GameCardData {
  const phase = game.phase === 'planning' ? 'planning' : 'inProgress';
  let entryText: string;
  if (phase === 'planning') entryText = planningEntry(game);
  else entryText = (extra.reopened ?? game.reopened) ? REOPENED_ENTRY : 'Open Play';
  return {
    id: game.id,
    phase,
    identityLabel: phaseModeLabel(game.phase, game.mode),
    namesText: participantNamesLabel(game.participantNames),
    dateText: formatGameDateTime(game.createdAt),
    entryText,
  };
}

/** The History row's trailing text: "1 game", "3 games", or "Empty". */
export function historyCountLabel(count: number | undefined): string {
  if (!count) return 'Empty';
  return `${count} ${count === 1 ? 'game' : 'games'}`;
}
