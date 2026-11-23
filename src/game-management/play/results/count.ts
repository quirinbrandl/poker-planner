/**
 * Final chip count drafts, their review and the confirmed final result (cash games).
 *
 * A draft is raw text per denomination, saved exactly as typed; it moves no chips. Review is a pure
 * read. Confirm records the participant's one result, removes the draft and returns the counted mix
 * to the bank in one commit.
 */
import { formatEur } from '@/domain/money';
import type { ChipMix } from '@/domain/types';

import type { AppState, CountDraft, PlayRecord, ResultRecord } from '../../core/documents';
import { type Accepted, type NeedsConfirmation, type Rejected, rejected } from '../../core/results';
import type { Runtime } from '../../core/runtime';
import { findGame } from '../../planning/draft';
import { formatCount, parseWholeNumber } from '../../shared/numbers';
import { countDraftOf, inPlayMix, resultOf } from '../ledger';
import {
  type CashAccess,
  cashParticipant,
  chipsName,
  chipValueText,
  coloredMix,
  contributionsOf,
  type ResultAccessCode,
  winLoss,
  withPlay,
} from './shared';
import type {
  BlockedMixData,
  CountEditorView,
  EditorProblem,
  QuantityEntry,
  ResultConfirmationData,
} from './types';

/** Largest quantity of one denomination a count accepts; more is a typing mistake. */
const MAX_QUANTITY = 999_999;

const QUANTITY_ERRORS = {
  empty: 'Enter a quantity, including zero.',
  notWholeNumber: 'Use a whole number, digits only.',
  tooLarge: 'Enter a smaller number.',
} as const;

export const COUNT_INCOMPLETE: EditorProblem = {
  title: 'Count incomplete.',
  message: 'Your entries are kept. Fix the marked quantities.',
};

export const COUNT_CHANGED_MESSAGE = 'The count changed. Review it again.';

export type CountEditCode = ResultAccessCode | 'resultExists' | 'denominationNotFound';
export type CountEditResult = Accepted | Rejected<CountEditCode>;

/** The count returns more chips of a denomination than the table has: nothing was saved. */
export interface CountBlocked {
  status: 'blocked';
  blocked: BlockedMixData;
}

/** Missing or invalid quantities; the editor read with `showErrors` now marks them. */
export interface CountNeedsCorrection {
  status: 'needsCorrection';
  /** The first denomination (ascending) to correct. */
  firstDenominationValue: number;
  problem: EditorProblem;
}

export type ReviewCountResult =
  | NeedsConfirmation<ResultConfirmationData>
  | CountNeedsCorrection
  | CountBlocked
  | Rejected<ResultAccessCode | 'resultExists'>;

/** What the host reviewed: the counted quantities per denomination, ascending (`confirmation.mix` counts). */
export interface ReviewedCount {
  counts: readonly number[];
}

export type ConfirmResultCode = ResultAccessCode | 'resultExists' | 'countIncomplete' | 'countChanged';
export type ConfirmResultResult = Accepted | CountBlocked | Rejected<ConfirmResultCode>;

export interface ParsedCount {
  entries: QuantityEntry[];
  /** Every quantity is a valid whole number. */
  complete: boolean;
  /** Entered quantities (blanks and invalid text count as 0). */
  counts: number[];
  units: number;
}

export function draftTexts(play: PlayRecord, participantId: string): string[] {
  const draft = countDraftOf(play, participantId);
  return play.terms.chipSet.map((_, i) => draft?.quantityTexts[i] ?? '');
}

export function parseCount(play: PlayRecord, texts: readonly string[], showErrors: boolean): ParsedCount {
  let units = 0;
  const counts: number[] = [];
  const entries = play.terms.chipSet.map((d, i): QuantityEntry => {
    const text = texts[i];
    const parsed = parseWholeNumber(text);
    const error = parsed.ok ? (parsed.value > MAX_QUANTITY ? 'tooLarge' : null) : parsed.error;
    const count = error === null && parsed.ok ? parsed.value : null;
    counts.push(count ?? 0);
    units += d.value * (count ?? 0);
    const entry: QuantityEntry = {
      value: d.value,
      color: d.color,
      quantityText: text,
      state: error === 'empty' ? 'notEntered' : error ? 'invalid' : 'entered',
      count,
    };
    if (showErrors && error) entry.error = QUANTITY_ERRORS[error];
    return entry;
  });
  return { entries, complete: entries.every((e) => e.state === 'entered'), counts, units };
}

export function mixFrom(play: PlayRecord, counts: readonly number[]): ChipMix {
  return play.terms.chipSet.map((d, i) => ({ value: d.value, count: counts[i] }));
}

/** The editor read (without the screen's context line). */
export function buildCountEditor(
  access: CashAccess,
  showErrors: boolean,
  texts: readonly string[] = draftTexts(access.play, access.participant.id),
  kind: CountEditorView['kind'] = 'count',
): CountEditorView {
  const { play, rate, participant } = access;
  const parsed = parseCount(play, texts, showErrors);
  const contributions = contributionsOf(play, participant.id);
  return {
    gameId: access.game.id,
    playerId: participant.id,
    playerName: participant.name,
    kind,
    entries: parsed.entries,
    totals: {
      unitsText: formatCount(parsed.units),
      complete: parsed.complete,
      chipValueText: chipValueText(parsed.units, rate),
      contributionsText: formatEur(contributions),
      winLoss: parsed.complete ? winLoss(parsed.units, contributions, rate) : null,
    },
    problem: showErrors && !parsed.complete ? COUNT_INCOMPLETE : null,
    hasDraft: countDraftOf(play, participant.id) !== undefined,
  };
}

/** Denominations of which the count returns more chips than are out at the table. */
export function surplus(play: PlayRecord, counts: readonly number[], alreadyReturned?: ChipMix): BlockedMixData | null {
  // A correction replaces the player's own return: those chips count as out at the table again.
  const inPlay = inPlayMix(play).map((chip, i) => ({ ...chip, count: chip.count + (alreadyReturned?.[i].count ?? 0) }));
  const over = play.terms.chipSet
    .map((d, i) => ({ value: d.value, color: d.color, extra: counts[i] - inPlay[i].count }))
    .filter((chip) => chip.extra > 0);
  if (over.length === 0) return null;
  const names = over.map((chip) => chipsName(play, chip.value, chip.extra)).join(' and ');
  return {
    title: 'More chips than the game has',
    chips: over.map((chip) => ({ value: chip.value, color: chip.color, deltaText: `+${formatCount(chip.extra)}` })),
    message: `That’s ${names} more than the game has. Check the quantities you entered.`,
  };
}

export function confirmation(
  access: CashAccess,
  parsed: Pick<ParsedCount, 'counts' | 'units'>,
  kind: ResultConfirmationData['kind'] = 'confirm',
): ResultConfirmationData {
  const { play, rate, participant } = access;
  const contributions = contributionsOf(play, participant.id);
  return {
    kind,
    playerName: participant.name,
    mix: coloredMix(play, mixFrom(play, parsed.counts)),
    unitsText: formatCount(parsed.units),
    chipValueText: chipValueText(parsed.units, rate),
    contributionsText: formatEur(contributions),
    winLossText: winLoss(parsed.units, contributions, rate).amountText,
    zeroChips: parsed.counts.every((c) => c === 0),
  };
}

function resultExists(access: CashAccess): Rejected<'resultExists'> {
  return rejected('resultExists', `${access.participant.name}’s result is already confirmed.`);
}

/** The play record with this participant's draft set to `texts` (removed when every text is empty). */
function withDraftTexts(play: PlayRecord, participantId: string, texts: readonly string[]): PlayRecord {
  const others = (play.countDrafts ?? []).filter((d) => d.participantId !== participantId);
  const existing = countDraftOf(play, participantId);
  const drafts: CountDraft[] = texts.every((t) => t === '')
    ? others
    : existing
      ? (play.countDrafts ?? []).map((d) => (d === existing ? { participantId, quantityTexts: [...texts] } : d))
      : [...others, { participantId, quantityTexts: [...texts] }];
  const next: PlayRecord = { ...play, countDrafts: drafts };
  if (drafts.length === 0) delete next.countDrafts;
  return next;
}

export function sameTexts(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((t, i) => t === b[i]);
}

export function createCountOperations(rt: Runtime) {
  /** Shared start of every count edit: access, no result yet. */
  function editable(state: AppState, gameId: string, participantId: string) {
    const found = cashParticipant(state, gameId, participantId);
    if (!found.ok) return found;
    if (resultOf(found.access.play, participantId)) return { ok: false as const, rejection: resultExists(found.access) };
    return found;
  }

  async function saveTexts(state: AppState, access: CashAccess, texts: readonly string[]): Promise<CountEditResult> {
    const current = draftTexts(access.play, access.participant.id);
    if (sameTexts(current, texts)) return { status: 'accepted' };
    await rt.apply(withPlay(state, access.game, withDraftTexts(access.play, access.participant.id, texts)));
    return { status: 'accepted' };
  }

  return {
    /**
     * Everything the final chip count editor shows for a participant without a result (their saved
     * draft, or all blanks). `showErrors`: after a failed review, mark missing / invalid quantities.
     * `null` unless the game is an In progress cash game with this participant and no result yet.
     */
    getCountEditor(gameId: string, participantId: string, options: { showErrors?: boolean } = {}): CountEditorView | null {
      const game = findGame(rt.state(), gameId);
      const showErrors = options.showErrors ?? false;
      return rt.memo(`play.count:${gameId}:${participantId}:${showErrors}`, [game], () => {
        const found = cashParticipant(rt.state(), gameId, participantId);
        if (!found.ok || resultOf(found.access.play, participantId)) return null;
        return buildCountEditor(found.access, showErrors);
      });
    },

    /**
     * Saves one denomination's quantity text exactly as typed (empty is not zero). Moves no chips.
     * A draft whose every text is empty is removed: the player is uncounted again.
     */
    async setCountText(gameId: string, participantId: string, denominationValue: number, text: string): Promise<CountEditResult> {
      const state = rt.state();
      const found = editable(state, gameId, participantId);
      if (!found.ok) return found.rejection;
      const index = found.access.play.terms.chipSet.findIndex((d) => d.value === denominationValue);
      if (index < 0) return rejected('denominationNotFound', 'This chip is not in the game’s chip set.');
      const texts = draftTexts(found.access.play, participantId);
      texts[index] = text;
      return saveTexts(state, found.access, texts);
    },

    /** "Set remaining quantities to zero": fills blank quantities with "0", never changes entered text. */
    async setRemainingCountToZero(gameId: string, participantId: string): Promise<CountEditResult> {
      const state = rt.state();
      const found = editable(state, gameId, participantId);
      if (!found.ok) return found.rejection;
      const texts = draftTexts(found.access.play, participantId).map((t) => (t === '' ? '0' : t));
      return saveTexts(state, found.access, texts);
    },

    /** Removes the participant's count draft; they are uncounted again. No draft: accepted, nothing changes. */
    async discardCountDraft(gameId: string, participantId: string): Promise<CountEditResult> {
      const state = rt.state();
      const found = editable(state, gameId, participantId);
      if (!found.ok) return found.rejection;
      return saveTexts(state, found.access, found.access.play.terms.chipSet.map(() => ''));
    },

    /**
     * "Review result →". Changes nothing. Returns the confirmation to show, the first denomination
     * to correct (then read the editor with `showErrors`), or `blocked` when the count returns more
     * chips of a denomination than are out at the table.
     */
    reviewCount(gameId: string, participantId: string): ReviewCountResult {
      const found = editable(rt.state(), gameId, participantId);
      if (!found.ok) return found.rejection;
      const { access } = found;
      const parsed = parseCount(access.play, draftTexts(access.play, participantId), false);
      if (!parsed.complete) {
        const first = parsed.entries.find((e) => e.state !== 'entered')!;
        return { status: 'needsCorrection', firstDenominationValue: first.value, problem: COUNT_INCOMPLETE };
      }
      const blocked = surplus(access.play, parsed.counts);
      if (blocked) return { status: 'blocked', blocked };
      return { status: 'needsConfirmation', confirmation: confirmation(access, parsed) };
    },

    /**
     * Confirm result: recomputes the review and, if it still shows `reviewed`, records the
     * participant's one final result, removes the draft and returns the counted mix to the bank in
     * one commit. Rejected (nothing changes) if the count changed, is incomplete or a result exists;
     * `blocked` if the table no longer has those chips out.
     */
    async confirmResult(gameId: string, participantId: string, reviewed: ReviewedCount): Promise<ConfirmResultResult> {
      const state = rt.state();
      const found = editable(state, gameId, participantId);
      if (!found.ok) return found.rejection;
      const { access } = found;
      const { play } = access;
      const parsed = parseCount(play, draftTexts(play, participantId), false);
      if (!parsed.complete) return rejected('countIncomplete', 'Enter every quantity, including zero.');
      if (!sameTexts(parsed.counts.map(String), reviewed.counts.map(String))) {
        return rejected('countChanged', COUNT_CHANGED_MESSAGE);
      }
      const blocked = surplus(play, parsed.counts);
      if (blocked) return { status: 'blocked', blocked };

      const result: ResultRecord = {
        participantId,
        mix: mixFrom(play, parsed.counts),
        confirmedAt: rt.now().toISOString(),
      };
      const withoutDraft = withDraftTexts(play, participantId, play.terms.chipSet.map(() => ''));
      const next: PlayRecord = { ...withoutDraft, results: [...(play.results ?? []), result] };
      await rt.apply(withPlay(state, access.game, next));
      return { status: 'accepted' };
    },
  };
}
