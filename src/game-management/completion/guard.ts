/**
 * Completed games are read-only. Every play operation (counts, results, rebuys, late entry,
 * eliminations, corrections, …) is rejected for a Completed game with `gameCompleted`, centrally:
 * `play/index.ts` wraps every operation of `app.play` that is not a read (`get…`) with
 * {@link guardCompletedGames}, and hands the operation areas a runtime whose writes to a Completed
 * game never apply ({@link readOnlyForCompletedGames}).
 *
 * The convention this relies on: a play operation takes the game id as its first argument, and a
 * read's name starts with `get`. Functions that only transform a draft the screen holds (the
 * finishing-order draft) are left out of the guard in `play/index.ts`; saving such a draft is
 * guarded by the operation itself and by the read-only runtime. Only Calculate Payments, Reopen,
 * Return to Planning (which rejects Completed games itself) and Delete change a Completed game.
 */
import type { AppState } from '../core/documents';
import { type Rejected, rejected } from '../core/results';
import type { Runtime } from '../core/runtime';

export const GAME_COMPLETED_MESSAGE = 'This game is completed. To change something, reopen it from ⋯.';

export function gameCompleted(): Rejected<'gameCompleted'> {
  return rejected('gameCompleted', GAME_COMPLETED_MESSAGE);
}

function isCompleted(state: AppState, gameId: unknown): boolean {
  return typeof gameId === 'string' && Object.prototype.hasOwnProperty.call(state.games, gameId)
    ? state.games[gameId].phase === 'completed'
    : false;
}

/** True when `next` changes (or removes) a game that is Completed in `current`. */
function touchesCompletedGame(current: AppState, next: AppState): boolean {
  if (current.games === next.games) return false;
  return Object.values(current.games).some((game) => game.phase === 'completed' && next.games[game.id] !== game);
}

/**
 * The runtime the play operation areas write through: a change that would alter a Completed game
 * is dropped (nothing in memory or on disk changes). A safety net behind the guard below, which
 * already answers `gameCompleted` before an operation could write.
 */
export function readOnlyForCompletedGames(rt: Runtime): Runtime {
  return {
    ...rt,
    apply: (next) => (touchesCompletedGame(rt.state(), next) ? Promise.resolve() : rt.apply(next)),
  };
}

type AnyFunction = (...args: never[]) => unknown;

/** `T` with every non-read operation also able to answer `rejected gameCompleted`. */
export type CompletedGuarded<T> = {
  [K in keyof T]: K extends `get${string}`
    ? T[K]
    : T[K] extends (...args: infer A) => Promise<infer R>
      ? (...args: A) => Promise<R | Rejected<'gameCompleted'>>
      : T[K] extends (...args: infer A) => infer R
        ? (...args: A) => R | Rejected<'gameCompleted'>
        : T[K];
};

function isPromise(value: unknown): value is Promise<unknown> {
  return typeof value === 'object' && value !== null && typeof (value as { then?: unknown }).then === 'function';
}

/**
 * Wraps each operation (not `get…` reads) so that called with a Completed game's id it answers
 * `rejected gameCompleted` ("…reopen it from ⋯"), synchronously or as a promise like the operation
 * itself. To learn which, the operation still runs, but on {@link readOnlyForCompletedGames} it can
 * change nothing; whatever it answered is replaced.
 */
export function guardCompletedGames<T extends Record<string, AnyFunction>>(rt: Runtime, operations: T): CompletedGuarded<T> {
  const guarded: Record<string, AnyFunction> = {};
  for (const [name, operation] of Object.entries(operations)) {
    if (name.startsWith('get')) {
      guarded[name] = operation;
      continue;
    }
    guarded[name] = (...args: never[]) => {
      if (!isCompleted(rt.state(), args[0])) return operation(...args);
      let answer: unknown;
      try {
        answer = operation(...args);
      } catch {
        return gameCompleted();
      }
      return isPromise(answer) ? answer.then(gameCompleted, gameCompleted) : gameCompleted();
    };
  }
  return guarded as CompletedGuarded<T>;
}
