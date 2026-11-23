import { REOPENED_ENTRY } from '@/features/game/actions/texts';
import { formatGameDateTime, modeLabel, participantNamesLabel, phaseModeLabel } from '@/features/shared/format';
import type { GameCard, StepId } from '@/game-management';

import type { GameCardData } from './types';

/** "Resume game settings", "Resume players": the explicit way back into a Planning game. */
function planningEntry(game: GameCard): string {
  if (game.lastStep === 'mode' || !game.lastStepTitle) return 'Resume mode choice';
  return `Resume ${game.lastStepTitle.toLowerCase()}`;
}

/** The wizard order per mode (mirrors game management's step order) for the card's step progress. */
const STEPS: Record<GameCard['mode'], readonly StepId[]> = {
  cash: ['mode', 'players', 'chipSet', 'settings', 'preview'],
  tournament: ['mode', 'players', 'chipSet', 'settings', 'payouts', 'preview'],
};

function planningProgress(game: GameCard): GameCardData['progress'] {
  const steps = STEPS[game.mode];
  const index = game.lastStep ? steps.indexOf(game.lastStep) : 0;
  return { current: Math.max(0, index) + 1, count: steps.length };
}

/**
 * A Games card from game management's `GameCard`. A reopened In progress game (`GameCard.reopened`,
 * or `extra.reopened` for fixtures) gets the reopened entry line.
 */
export function gameCardData(game: GameCard, extra: { reopened?: boolean } = {}): GameCardData {
  const phase = game.phase === 'planning' ? 'planning' : 'inProgress';
  let entryText = planningEntry(game);
  const reopened = phase === 'inProgress' && (extra.reopened ?? game.reopened);
  if (phase === 'inProgress') entryText = reopened ? REOPENED_ENTRY : 'Open Play';
  return {
    id: game.id,
    phase,
    identityLabel: phaseModeLabel(game.phase, game.mode),
    modeText: modeLabel(game.mode),
    reopened,
    progress: phase === 'planning' ? planningProgress(game) : null,
    namesText: participantNamesLabel(game.participantNames),
    dateText: formatGameDateTime(game.createdAt),
    entryText,
  };
}

/** The History row's count: "1 game", "3 games", or nothing when there are none. */
export function historyCountLabel(count: number | undefined): string {
  if (!count) return '';
  return `${count} ${count === 1 ? 'game' : 'games'}`;
}
