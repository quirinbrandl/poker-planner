import type { GameDocument } from '../core/documents';
import type { Problem } from '../core/problems';
import type { Accepted, EditResult, GameAccessCode, Rejected, SavedInvalid } from '../core/results';
import type { Runtime } from '../core/runtime';
import { planningGame, withGame } from './draft';

/**
 * Applies a change to one Planning game. `change` returns the new game, or a rejection (nothing is
 * changed). `problemsOf` reports the edited field's problems on the new game: any → `savedInvalid`.
 */
export async function editPlanningGame<Code extends string = never>(
  rt: Runtime,
  gameId: string,
  change: (game: GameDocument) => GameDocument | Rejected<Code>,
  problemsOf?: (game: GameDocument) => readonly Problem[],
): Promise<Accepted | SavedInvalid | Rejected<Code | GameAccessCode>> {
  const state = rt.state();
  const access = planningGame(state, gameId);
  if (!access.ok) return access.rejection;
  const next = change(access.game);
  if ('status' in next) return next;
  await rt.apply(withGame(state, next));
  const problems = problemsOf ? problemsOf(next) : [];
  return problems.length > 0 ? { status: 'savedInvalid', problems } : { status: 'accepted' };
}

export type { EditResult };
