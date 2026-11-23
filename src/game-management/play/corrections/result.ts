/**
 * Correcting a confirmed cash result (a correction draft, then Replace result) and removing it
 * (Return to play). The confirmed result stays effective until Replace result; the replacement
 * substitutes its return exactly once. Removing a result reverses its return and keeps every
 * buy-in and rebuy; it issues nothing.
 *
 * A change that would take chips out of the bank that a later rebuy now uses answers `dependent`
 * (the fix flow undoes that rebuy first); any other inventory-impossible change is `blocked`.
 */
import { formatEur } from '@/domain/money';

import type { AppState, CountDraft, IssuanceRecord, PlayRecord } from '../../core/documents';
import { rejected } from '../../core/results';
import type { Runtime } from '../../core/runtime';
import { findGame } from '../../planning/draft';
import { bankMix, countDraftOf, resultOf } from '../ledger';
import {
  buildCountEditor,
  confirmation,
  COUNT_CHANGED_MESSAGE,
  COUNT_INCOMPLETE,
  mixFrom,
  parseCount,
  sameTexts,
  surplus,
} from '../results/count';
import { type CashAccess, cashParticipant, coloredMix, contributionsOf } from '../results/shared';
import type { BlockedMixData, CountEditorView, ReturnToPlayData } from '../results/types';
import { checkInventory, chipsHandedOutAgain, countsOf, type InventoryCheck, withFix, withPlayRecord } from './shared';
import type {
  CorrectionEditResult,
  FixStart,
  ReplaceResultResult,
  ReturnToPlayResult,
  ReviewCorrectionResult,
} from './types';

/** The confirmed counts as text: what an untouched correction draft starts from. */
function resultTexts(play: PlayRecord, participantId: string): string[] {
  return countsOf(resultOf(play, participantId)!.mix).map(String);
}

/** The correction draft's raw text, or the confirmed counts while none is saved. */
export function correctionTexts(play: PlayRecord, participantId: string): string[] {
  const draft = countDraftOf(play, participantId);
  return draft ? [...draft.quantityTexts] : resultTexts(play, participantId);
}

/** The play record with the correction draft set to `texts` (removed when they equal the result). */
function withCorrectionTexts(play: PlayRecord, participantId: string, texts: readonly string[]): PlayRecord {
  const others = (play.countDrafts ?? []).filter((d) => d.participantId !== participantId);
  const drafts: CountDraft[] = sameTexts(texts, resultTexts(play, participantId))
    ? others
    : [...others, { participantId, quantityTexts: [...texts] }];
  return withoutDraftsIfEmpty({ ...play, countDrafts: drafts });
}

function withoutDraftsIfEmpty(play: PlayRecord): PlayRecord {
  if (play.countDrafts && play.countDrafts.length === 0) {
    const next = { ...play };
    delete next.countDrafts;
    return next;
  }
  return play;
}

/** The play record without this participant's count or correction draft. */
export function withoutDraft(play: PlayRecord, participantId: string): PlayRecord {
  if (!countDraftOf(play, participantId)) return play;
  return withoutDraftsIfEmpty({ ...play, countDrafts: (play.countDrafts ?? []).filter((d) => d.participantId !== participantId) });
}

/** What replacing (`counts`) or removing (`null`) a participant's result does to the records. */
export type ResultChange =
  | { kind: 'ok'; next: PlayRecord }
  | { kind: 'blocked'; blocked: BlockedMixData }
  | { kind: 'dependent'; blocker: IssuanceRecord; short: InventoryCheck['short'] };

/** The records with the result replaced by `counts` (or removed), the draft dropped. Not yet checked. */
function changedRecords(play: PlayRecord, participantId: string, counts: readonly number[] | null, confirmedAt: string): PlayRecord {
  const results = (play.results ?? []).flatMap((r) =>
    r.participantId !== participantId ? [r] : counts ? [{ participantId, mix: mixFrom(play, counts), confirmedAt }] : [],
  );
  const next: PlayRecord = { ...withoutDraft(play, participantId), results };
  if (results.length === 0) delete next.results;
  return next;
}

/**
 * The latest rebuy of another player whose undo alone makes the change inventory-valid (and is
 * valid itself): the record the fix flow undoes first. `null` if no single rebuy does.
 */
function dependentRebuy(play: PlayRecord, next: PlayRecord, participantId: string): IssuanceRecord | null {
  const bankNow = countsOf(bankMix(play));
  const bankNext = countsOf(bankMix(next));
  const quantities = play.terms.chipSet.map((d) => d.quantity);
  const fits = (bank: readonly number[], mix: readonly number[]) =>
    bank.every((count, i) => count + mix[i] >= 0 && count + mix[i] <= quantities[i]);
  for (const issuance of [...play.issuances].reverse()) {
    if (issuance.kind !== 'rebuy' || issuance.participantId === participantId) continue;
    const mix = countsOf(issuance.mix);
    if (fits(bankNext, mix) && fits(bankNow, mix)) return issuance;
  }
  return null;
}

export function resultChange(
  play: PlayRecord,
  participantId: string,
  counts: readonly number[] | null,
  confirmedAt: string,
): ResultChange {
  const next = changedRecords(play, participantId, counts, confirmedAt);
  const check = checkInventory(next);
  if (check.over.length > 0 && counts) {
    return { kind: 'blocked', blocked: surplus(play, counts, resultOf(play, participantId)!.mix)! };
  }
  if (check.short.length > 0) {
    const blocker = dependentRebuy(play, next, participantId);
    if (blocker) return { kind: 'dependent', blocker, short: check.short };
    return { kind: 'blocked', blocked: chipsHandedOutAgain(play, check.short) };
  }
  return { kind: 'ok', next };
}

/** A recorded fix waiting at step 2 for exactly this save moves on to step 3 (the new rebuy). */
function advancedFix(play: PlayRecord, participantId: string, target: FixStart['target']): PlayRecord {
  const fix = play.fix;
  if (!fix || fix.stage !== 'save' || fix.participantId !== participantId || fix.target !== target) return play;
  return withFix(play, { ...fix, stage: 'rebuy' });
}

/** Records Replace result: the new mix replaces the return once; the correction draft goes. */
export function replacedRecords(next: PlayRecord, participantId: string): PlayRecord {
  return advancedFix(next, participantId, 'count');
}

/** Records Back in the game: the result and its return are gone; nothing is issued. */
export function removedRecords(next: PlayRecord, participantId: string): PlayRecord {
  return advancedFix(next, participantId, 'result');
}

/** The Return to play popup of a player with a result. */
export function returnToPlayData(play: PlayRecord, participantId: string, name: string): ReturnToPlayData | null {
  const result = resultOf(play, participantId);
  if (!result) return null;
  return {
    playerName: name,
    handBack: coloredMix(play, result.mix),
    buyInsText: formatEur(contributionsOf(play, participantId)),
  };
}

const noResult = (name: string) => rejected('noResult', `${name} has no confirmed result.`);

export function createCorrectionOperations(rt: Runtime) {
  /** Shared start of every correction: access, and a confirmed result to correct. */
  function correctable(state: AppState, gameId: string, participantId: string) {
    const found = cashParticipant(state, gameId, participantId);
    if (!found.ok) return found;
    if (!resultOf(found.access.play, participantId)) {
      return { ok: false as const, rejection: noResult(found.access.participant.name) };
    }
    return found;
  }

  async function saveTexts(state: AppState, access: CashAccess, texts: readonly string[]): Promise<CorrectionEditResult> {
    if (sameTexts(correctionTexts(access.play, access.participant.id), texts)) return { status: 'accepted' };
    await rt.apply(withPlayRecord(state, access.game, withCorrectionTexts(access.play, access.participant.id, texts)));
    return { status: 'accepted' };
  }

  return {
    /**
     * The count editor as a correction draft (`kind: 'correction'`): the saved draft, or the
     * confirmed counts while none is saved. `null` unless an In progress cash game where the
     * participant has a confirmed result.
     */
    getCorrectionEditor(gameId: string, participantId: string, options: { showErrors?: boolean } = {}): CountEditorView | null {
      const game = findGame(rt.state(), gameId);
      const showErrors = options.showErrors ?? false;
      return rt.memo(`play.correction:${gameId}:${participantId}:${showErrors}`, [game], () => {
        const found = cashParticipant(rt.state(), gameId, participantId);
        if (!found.ok || !resultOf(found.access.play, participantId)) return null;
        const { play } = found.access;
        return buildCountEditor(found.access, showErrors, correctionTexts(play, participantId), 'correction');
      });
    },

    /**
     * Saves one denomination's text of the correction draft exactly as typed. The confirmed result
     * stays in force; nothing moves. A draft equal to the confirmed counts is dropped.
     */
    async setCorrectionText(gameId: string, participantId: string, denominationValue: number, text: string): Promise<CorrectionEditResult> {
      const state = rt.state();
      const found = correctable(state, gameId, participantId);
      if (!found.ok) return found.rejection;
      const index = found.access.play.terms.chipSet.findIndex((d) => d.value === denominationValue);
      if (index < 0) return rejected('denominationNotFound', 'This chip is not in the game’s chip set.');
      const texts = correctionTexts(found.access.play, participantId);
      texts[index] = text;
      return saveTexts(state, found.access, texts);
    },

    /** "Set remaining quantities to zero" in the correction draft: blanks only. */
    async setRemainingCorrectionToZero(gameId: string, participantId: string): Promise<CorrectionEditResult> {
      const state = rt.state();
      const found = correctable(state, gameId, participantId);
      if (!found.ok) return found.rejection;
      const texts = correctionTexts(found.access.play, participantId).map((t) => (t === '' ? '0' : t));
      return saveTexts(state, found.access, texts);
    },

    /** Discards the correction draft; the confirmed result is untouched. */
    async discardCorrection(gameId: string, participantId: string): Promise<CorrectionEditResult> {
      const state = rt.state();
      const found = correctable(state, gameId, participantId);
      if (!found.ok) return found.rejection;
      return saveTexts(state, found.access, resultTexts(found.access.play, participantId));
    },

    /**
     * "Review correction →". Changes nothing. The Replace result popup, the first quantity to fix,
     * `blocked` (inventory-impossible) or `dependent` (a later rebuy uses these chips: open the fix).
     */
    reviewCorrection(gameId: string, participantId: string): ReviewCorrectionResult {
      const found = correctable(rt.state(), gameId, participantId);
      if (!found.ok) return found.rejection;
      const { access } = found;
      const parsed = parseCount(access.play, correctionTexts(access.play, participantId), false);
      if (!parsed.complete) {
        const first = parsed.entries.find((e) => e.state !== 'entered')!;
        return { status: 'needsCorrection', firstDenominationValue: first.value, problem: COUNT_INCOMPLETE };
      }
      const change = resultChange(access.play, participantId, parsed.counts, rt.now().toISOString());
      if (change.kind === 'blocked') return { status: 'blocked', blocked: change.blocked };
      if (change.kind === 'dependent') return { status: 'dependent', fix: { participantId, target: 'count' } };
      return { status: 'needsConfirmation', confirmation: confirmation(access, parsed, 'replace') };
    },

    /**
     * Replace result: if the correction draft still gives `counts`, replaces the recorded return
     * with them once (the old return is reversed, not duplicated) and drops the draft, in one
     * commit. Otherwise nothing changes.
     */
    async replaceResult(gameId: string, participantId: string, reviewed: { counts: readonly number[] }): Promise<ReplaceResultResult> {
      const state = rt.state();
      const found = correctable(state, gameId, participantId);
      if (!found.ok) return found.rejection;
      const { access } = found;
      const parsed = parseCount(access.play, correctionTexts(access.play, participantId), false);
      if (!parsed.complete) return rejected('countIncomplete', 'Enter every quantity, including zero.');
      if (!sameTexts(parsed.counts.map(String), reviewed.counts.map(String))) return rejected('countChanged', COUNT_CHANGED_MESSAGE);
      const change = resultChange(access.play, participantId, parsed.counts, rt.now().toISOString());
      if (change.kind === 'blocked') return { status: 'blocked', blocked: change.blocked };
      if (change.kind === 'dependent') return { status: 'dependent', fix: { participantId, target: 'count' } };
      await rt.apply(withPlayRecord(state, access.game, replacedRecords(change.next, participantId)));
      return { status: 'accepted' };
    },

    /**
     * Back in the game (Return to play): removes the result and its return, and any correction
     * draft; keeps the buy-in and every rebuy; issues nothing. The player is playing again.
     */
    async returnToPlay(gameId: string, participantId: string): Promise<ReturnToPlayResult> {
      const state = rt.state();
      const found = correctable(state, gameId, participantId);
      if (!found.ok) return found.rejection;
      const { access } = found;
      const change = resultChange(access.play, participantId, null, rt.now().toISOString());
      if (change.kind === 'blocked') return { status: 'blocked', blocked: change.blocked };
      if (change.kind === 'dependent') return { status: 'dependent', fix: { participantId, target: 'result' } };
      await rt.apply(withPlayRecord(state, access.game, removedRecords(change.next, participantId)));
      return { status: 'accepted' };
    },
  };
}
