/**
 * Shared pieces of the cash-game results area: access checks, exact valuation texts and the
 * record helpers every results operation builds its next state with.
 */
import { formatEur, formatExactEur, formatSignedEur, formatSignedExactEur, type ExactCents } from '@/domain/money';
import { exactChipValue, exactWinLoss } from '@/domain/settlement';
import type { Cents, ChipColor, ChipMix } from '@/domain/types';

import { gameCompleted } from '../../completion/guard';
import type { AppState, CompletionRecord, GameDocument, PlayRecord, RosterEntry } from '../../core/documents';
import { type Rejected, rejected } from '../../core/results';
import { findGame, withGame } from '../../planning/draft';
import { formatCount } from '../../shared/numbers';
import { withColors } from '../../planning/distribution';
import { issuancesOf, mixValue, totalContributions } from '../ledger';
import type { MixChip, SignedMoney } from './types';

/** Codes every results operation can be rejected with before it looks at the count. */
export type ResultAccessCode = 'gameNotFound' | 'notInProgress' | 'gameCompleted' | 'notCashGame' | 'participantNotFound';

export interface CashAccess {
  game: GameDocument;
  play: PlayRecord;
  rate: ExactCents;
  participant: RosterEntry;
  /** The stored settlement when the game is Completed (reads only); `null` In progress. */
  completion: CompletionRecord | null;
}

/**
 * The In progress cash game and one of its participants, or why there is none. `read`: a read of
 * a Completed game is allowed too (operations reject it with `gameCompleted`).
 */
export function cashParticipant(
  state: AppState,
  gameId: string,
  participantId: string,
  options: { read?: boolean } = {},
): { ok: true; access: CashAccess } | { ok: false; rejection: Rejected<ResultAccessCode> } {
  const game = findGame(state, gameId);
  if (!game) return { ok: false, rejection: rejected('gameNotFound', 'This game no longer exists.') };
  const completion = game.phase === 'completed' ? (game.completion ?? null) : null;
  if (game.phase === 'completed' && !(options.read && completion && game.play)) {
    return { ok: false, rejection: gameCompleted() };
  }
  if (game.phase === 'planning' || !game.play) {
    return { ok: false, rejection: rejected('notInProgress', 'This game is not in progress.') };
  }
  const rate = game.play.terms.cashRate;
  if (game.mode !== 'cash' || !rate) {
    return { ok: false, rejection: rejected('notCashGame', 'Final chip counts are for cash games only.') };
  }
  const participant = game.play.roster.find((p) => p.id === participantId);
  if (!participant) return { ok: false, rejection: rejected('participantNotFound', 'This player is not in the game.') };
  return { ok: true, access: { game, play: game.play, rate, participant, completion } };
}

/** The started (In progress, or Completed with its settlement) cash game, for reads that need no participant. */
export function cashGame(game: GameDocument | undefined): (GameDocument & { play: PlayRecord }) | null {
  if (!game || !game.play || game.mode !== 'cash' || !game.play.terms.cashRate) return null;
  if (game.phase === 'planning' || (game.phase === 'completed' && !game.completion)) return null;
  return game as GameDocument & { play: PlayRecord };
}

/** A participant's allocated outcome in a Completed game's settlement. */
export function settledOf(completion: CompletionRecord | null | undefined, participantId: string) {
  return completion?.players.find((p) => p.participantId === participantId);
}

/** An allocated whole-cent balance as signed money (Completed). */
export function allocatedWinLoss(balance: Cents): SignedMoney {
  return {
    amountText: formatSignedEur(balance),
    direction: balance > 0 ? 'gain' : balance < 0 ? 'loss' : 'even',
  };
}

/** The state with this game's play record replaced. */
export function withPlay(state: AppState, game: GameDocument, play: PlayRecord): AppState {
  return withGame(state, { ...game, play });
}

export const plural = (count: number, one: string, many = `${one}s`) => `${formatCount(count)} ${count === 1 ? one : many}`;

/** The participant's buy-in plus rebuys, in cents. */
export function contributionsOf(play: PlayRecord, participantId: string): Cents {
  return totalContributions(issuancesOf(play, participantId));
}

/** "EUR 40.00 · 1 rebuy" (as on Play). */
export function contributionText(play: PlayRecord, participantId: string): string {
  const issued = issuancesOf(play, participantId);
  const rebuys = issued.filter((i) => i.kind === 'rebuy').length;
  return `${formatEur(totalContributions(issued))}${rebuys > 0 ? ` · ${plural(rebuys, 'rebuy')}` : ''}`;
}

/** "EUR 25.0125": the exact money value of `units` at the game rate. */
export function chipValueText(units: number, rate: ExactCents): string {
  return formatExactEur(exactChipValue(units, rate));
}

/** The exact provisional win / loss of `units` against `contributions`. */
export function winLoss(units: number, contributions: Cents, rate: ExactCents): SignedMoney {
  const amount = exactWinLoss(units, contributions, rate);
  return {
    amountText: formatSignedExactEur(amount),
    direction: amount.numerator > 0 ? 'gain' : amount.numerator < 0 ? 'loss' : 'even',
  };
}

/** A recorded mix with the chip set's colours. */
export function coloredMix(play: PlayRecord, mix: ChipMix): MixChip[] {
  return withColors(mix, play.terms.chipSet);
}

export function unitsOf(mix: ChipMix): number {
  return mixValue(mix);
}

const COLOR_NAMES: Record<ChipColor, string> = {
  white: 'White',
  grey: 'Grey',
  red: 'Red',
  blue: 'Blue',
  green: 'Green',
  yellow: 'Yellow',
  purple: 'Purple',
  black: 'Black',
  orange: 'Orange',
  pink: 'Pink',
  brown: 'Brown',
};

/**
 * "1 White chip", "2 Red chips"; a chip without a colour, or whose colour another denomination
 * shares, is named by its value: "1 100-unit chip".
 */
export function chipsName(play: PlayRecord, value: number, count: number): string {
  const chipSet = play.terms.chipSet;
  const chip = chipSet.find((d) => d.value === value);
  const color = chip?.color ?? null;
  const unique = color !== null && chipSet.filter((d) => d.color === color).length === 1;
  const name = unique ? COLOR_NAMES[color] : `${formatCount(value)}-unit`;
  return `${formatCount(count)} ${name} ${count === 1 ? 'chip' : 'chips'}`;
}
