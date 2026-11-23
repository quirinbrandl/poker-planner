/**
 * Shared pieces of the corrections: access to a started game of either mode, the inventory check
 * every correction runs before it is saved, the blocked explanations and the buy-in rows.
 *
 * Inventory rule: after every accepted correction, each denomination of the bank (chip set − all
 * recorded issuances + confirmed cash returns) lies between zero and the configured quantity.
 */
import { formatEur } from '@/domain/money';
import type { ChipMix } from '@/domain/types';

import { gameCompleted } from '../../completion/guard';
import type { AppState, FixRecord, GameDocument, IssuanceRecord, PlayRecord, RosterEntry } from '../../core/documents';
import { type Rejected, rejected } from '../../core/results';
import { findGame, withGame } from '../../planning/draft';
import { formatCount } from '../../shared/numbers';
import { bankMix, issuancesOf, totalContributions } from '../ledger';
import { chipsName, coloredMix } from '../results/shared';
import type { BlockedChip, BlockedMixData, BuyInRecord, UndoRebuyData } from '../results/types';
import type { CorrectionAccessCode } from './types';

export type StartedGame = GameDocument & { play: PlayRecord };

export interface PlayAccess {
  game: StartedGame;
  play: PlayRecord;
  participant: RosterEntry;
}

/** An In progress game of either mode and one of its participants, or why there is none. */
export function playParticipant(
  state: AppState,
  gameId: string,
  participantId: string,
): { ok: true; access: PlayAccess } | { ok: false; rejection: Rejected<Exclude<CorrectionAccessCode, 'notCashGame'>> } {
  const game = findGame(state, gameId);
  if (!game) return { ok: false, rejection: rejected('gameNotFound', 'This game no longer exists.') };
  if (game.phase === 'completed') return { ok: false, rejection: gameCompleted() };
  if (game.phase !== 'inProgress' || !game.play) {
    return { ok: false, rejection: rejected('notInProgress', 'This game is not in progress.') };
  }
  const participant = game.play.roster.find((p) => p.id === participantId);
  if (!participant) return { ok: false, rejection: rejected('participantNotFound', 'This player is not in the game.') };
  return { ok: true, access: { game: game as StartedGame, play: game.play, participant } };
}

/** The state with this game's play record replaced. */
export function withPlayRecord(state: AppState, game: GameDocument, play: PlayRecord): AppState {
  return withGame(state, { ...game, play });
}

export const countsOf = (mix: ChipMix): number[] => mix.map((c) => c.count);

/** The play record with the fix set (or removed with `undefined`). */
export function withFix(play: PlayRecord, fix: FixRecord | undefined): PlayRecord {
  const next: PlayRecord = { ...play, fix };
  if (!fix) delete next.fix;
  return next;
}

/** Denominations whose bank count would leave 0 … configured quantity, ascending by value. */
export interface InventoryCheck {
  /** Below zero: the records hand out more of these chips than exist in the bank. */
  short: { index: number; count: number }[];
  /** Above the configured quantity: more of these chips than the game has. */
  over: { index: number; count: number }[];
}

export function checkInventory(play: PlayRecord): InventoryCheck {
  const bank = bankMix(play);
  const short: InventoryCheck['short'] = [];
  const over: InventoryCheck['over'] = [];
  play.terms.chipSet.forEach((d, index) => {
    const count = bank[index].count;
    if (count < 0) short.push({ index, count: -count });
    if (count > d.quantity) over.push({ index, count: count - d.quantity });
  });
  return { short, over };
}

export const inventoryValid = (check: InventoryCheck) => check.short.length === 0 && check.over.length === 0;

function deltaChips(play: PlayRecord, chips: readonly { index: number; count: number }[], sign: '+' | '−'): BlockedChip[] {
  return chips.map(({ index, count }) => {
    const d = play.terms.chipSet[index];
    return { value: d.value, color: d.color, deltaText: `${sign}${formatCount(count)}` };
  });
}

/** "5 White chips and 1 Red chip". */
export function chipsList(play: PlayRecord, chips: readonly { index: number; count: number }[]): string {
  return chips.map(({ index, count }) => chipsName(play, play.terms.chipSet[index].value, count)).join(' and ');
}

/** A historical mix the bank cannot have supplied: "Not enough chips for this mix". */
export function notEnoughChips(play: PlayRecord, short: InventoryCheck['short']): BlockedMixData {
  return {
    title: 'Not enough chips for this mix',
    chips: deltaChips(play, short, '−'),
    message: `The bank is ${chipsList(play, short)} short. Check the quantities you entered.`,
  };
}

/** Records that would put more chips in the bank than the game has. */
export function moreThanTheGameHas(play: PlayRecord, over: InventoryCheck['over']): BlockedMixData {
  return {
    title: 'More chips than the game has',
    chips: deltaChips(play, over, '+'),
    message: `That’s ${chipsList(play, over)} more than the game has. Check the quantities you entered.`,
  };
}

/** Undoing a rebuy whose chips a later result returned. */
export function undoOverfills(play: PlayRecord, over: InventoryCheck['over']): BlockedMixData {
  return {
    title: 'Can’t undo this rebuy',
    chips: deltaChips(play, over, '+'),
    message: `A later result returned these chips, so the bank would hold ${chipsList(play, over)} more than the game has. Correct that result first.`,
  };
}

/** A result change whose chips later stacks use, without one rebuy that could be undone for it. */
export function chipsHandedOutAgain(play: PlayRecord, short: InventoryCheck['short']): BlockedMixData {
  return {
    title: 'Those chips were handed out again',
    chips: deltaChips(play, short, '−'),
    message: `Later stacks use ${chipsList(play, short)} of this return. Undo or correct those records on their player pages first.`,
  };
}

export function blockedChip(play: PlayRecord, shortage: { index: number; count: number }): BlockedChip {
  return deltaChips(play, [shortage], '−')[0];
}

/** The number of `issuance` among its owner's rebuys (1-based). */
export function rebuyNumberOf(play: PlayRecord, issuance: IssuanceRecord): number {
  return issuancesOf(play, issuance.participantId).filter((i) => i.kind === 'rebuy').indexOf(issuance) + 1;
}

export function nameOf(play: PlayRecord, participantId: string): string {
  return play.roster.find((p) => p.id === participantId)?.name ?? '';
}

/** The Undo popup of a recorded rebuy. */
export function undoData(play: PlayRecord, issuance: IssuanceRecord, context: UndoRebuyData['context']): UndoRebuyData {
  const before = totalContributions(issuancesOf(play, issuance.participantId));
  return {
    rebuyId: issuance.id,
    playerName: nameOf(play, issuance.participantId),
    rebuyNumber: rebuyNumberOf(play, issuance),
    mix: coloredMix(play, issuance.mix),
    contributionsBeforeText: formatEur(before),
    contributionsAfterText: formatEur(before - issuance.contribution),
    context,
  };
}

/**
 * The player's stacks: the first one (buy-in or late entry), then every rebuy with its actual mix
 * and tags. `editable` (In progress) adds each rebuy's Undo popup.
 */
export function buyInRecords(play: PlayRecord, participantId: string, editable: boolean): BuyInRecord[] {
  let rebuyNumber = 0;
  return issuancesOf(play, participantId).map((issuance) => {
    const rebuy = issuance.kind === 'rebuy';
    if (rebuy) rebuyNumber += 1;
    return {
      id: issuance.id,
      kind: rebuy ? 'rebuy' : 'buyIn',
      label: rebuy ? `Rebuy ${rebuyNumber}` : 'Buy-in',
      amountText: formatEur(issuance.contribution),
      mix: coloredMix(play, issuance.mix),
      addedLater: issuance.addedLater === true,
      corrected: issuance.corrected === true,
      coverageText:
        issuance.reducedCoverage !== undefined
          ? `${formatCount(issuance.reducedCoverage)} of ${formatCount(play.terms.coverage)} coverage`
          : null,
      undo: rebuy && editable ? undoData(play, issuance, 'page') : null,
    };
  });
}
