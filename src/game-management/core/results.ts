/**
 * Result shapes shared by every operation. Each operation returns a discriminated union built from
 * these variants (switch on `status`):
 *
 * - `accepted`: the change is applied and committed.
 * - `savedInvalid`: a Planning edit was saved exactly as typed, but the edited field has problems.
 * - `stepInvalid`: Continue did not advance; the step's problems are listed (and now revealed).
 * - `needsConfirmation`: nothing changed; repeat the call with the confirmation to apply it.
 * - `rejected`: nothing changed, in memory or on disk; `reason` says why.
 *
 * Write operations resolve after the commit. They reject (throw) only when storage fails.
 */
import type { Problem } from './problems';

export type Accepted<T extends object = object> = { status: 'accepted' } & T;

export interface SavedInvalid {
  status: 'savedInvalid';
  problems: readonly Problem[];
}

export interface StepInvalid {
  status: 'stepInvalid';
  problems: readonly Problem[];
}

export interface NeedsConfirmation<C> {
  status: 'needsConfirmation';
  confirmation: C;
}

export interface Rejected<Code extends string = string> {
  status: 'rejected';
  reason: RejectionReason<Code>;
}

export interface RejectionReason<Code extends string = string> {
  code: Code;
  /** English text to show the host. */
  message: string;
  /** Field-level detail when the rejection is a validation failure (names, template rows). */
  problems?: readonly Problem[];
}

/** Codes any game-scoped operation can be rejected with. */
export type GameAccessCode = 'gameNotFound' | 'setupLocked';

/** Result of a Planning field edit. */
export type EditResult = Accepted | SavedInvalid | Rejected<GameAccessCode | 'rowNotFound'>;

export function rejected<Code extends string>(
  code: Code,
  message: string,
  problems?: readonly Problem[],
): Rejected<Code> {
  return { status: 'rejected', reason: problems ? { code, message, problems } : { code, message } };
}
