/**
 * The one-step-at-a-time fix of a correction (or a result removal) blocked by a later rebuy that
 * uses the returned chips: 1 undo that rebuy → 2 save the correction (or removal) → 3 give the
 * rebuy's owner a newly computed rebuy (the ordinary proposal) → done. Each step is its own
 * confirmed operation; nothing cascades.
 *
 * Step 1 is derived from the current records (nothing is stored until its undo is accepted, so
 * "Back to count" changes nothing). From then on the fix is recorded in `PlayRecord.fix`, survives
 * leaving and restart, and Play offers to continue it.
 */
import { formatEur } from '@/domain/money';

import type { FixRecord, PlayRecord } from '../../core/documents';
import { rejected } from '../../core/results';
import type { Runtime } from '../../core/runtime';
import { findGame } from '../../planning/draft';
import { formatCount } from '../../shared/numbers';
import { countDraftOf, issuancesOf, resultOf, totalContributions } from '../ledger';
import { confirmation, parseCount, sameTexts } from '../results/count';
import { type CashAccess, cashParticipant, chipsName, coloredMix } from '../results/shared';
import type { ResultConfirmationData, UndoRebuyData } from '../results/types';
import { correctionTexts, removedRecords, replacedRecords, resultChange, returnToPlayData } from './result';
import { blockedChip, chipsHandedOutAgain, nameOf, rebuyNumberOf, undoData, withFix, withPlayRecord } from './shared';
import type {
  FinishFixResult,
  FixStart,
  FixView,
  SaveFixStepResult,
  UndoFixBlockerResult,
} from './types';

const FIX_CHANGED = 'The records changed. Review the correction again.';

/** A recorded fix that still waits for a step (not yet `done`). */
export function unfinishedFix(play: PlayRecord): FixRecord | null {
  return play.fix && play.fix.stage !== 'done' ? play.fix : null;
}

/** "Fixing Alice’s count · Step 2 of 3": the line Play shows while a fix waits. */
export function fixLine(play: PlayRecord): string | null {
  const fix = unfinishedFix(play);
  if (!fix) return null;
  return `Fixing ${nameOf(play, fix.participantId)}’s ${fix.target} · Step ${fix.stage === 'save' ? 2 : 3} of 3`;
}

/** A rebuy issued for the owner of the undone rebuy completes step 3. */
export function withFixAdvancedByRebuy(play: PlayRecord, participantId: string): PlayRecord {
  const fix = play.fix;
  if (!fix || fix.stage !== 'rebuy' || fix.blocker.participantId !== participantId) return play;
  return withFix(play, { ...fix, stage: 'done' });
}

/** The counts a count fix saves: the correction draft while it is complete, else the retained counts. */
function fixCounts(access: CashAccess, fix: Pick<FixRecord, 'participantId' | 'counts'>): number[] | null {
  const { play } = access;
  if (!resultOf(play, fix.participantId) && !fix.counts) return null;
  if (countDraftOf(play, fix.participantId) && resultOf(play, fix.participantId)) {
    const parsed = parseCount(play, correctionTexts(play, fix.participantId), false);
    if (parsed.complete) return parsed.counts;
  }
  return fix.counts ?? null;
}

function replaceConfirmation(access: CashAccess, counts: readonly number[]): ResultConfirmationData {
  const units = access.play.terms.chipSet.reduce((sum, d, i) => sum + d.value * counts[i], 0);
  return confirmation(access, { counts: [...counts], units }, 'replace');
}

/** Step 1 from the current records: the dependent rebuy, if the start still needs one. */
function analyze(access: CashAccess, start: FixStart, now: string) {
  const { play } = access;
  if (!resultOf(play, start.participantId)) return null;
  let counts: number[] | null = null;
  if (start.target === 'count') {
    const parsed = parseCount(play, correctionTexts(play, start.participantId), false);
    if (!parsed.complete) return null;
    counts = parsed.counts;
  }
  const change = resultChange(play, start.participantId, counts, now);
  return change.kind === 'dependent' ? { ...change, counts } : null;
}

function usageText(play: PlayRecord, owner: string, rebuyNumber: number, shortages: FixRecord['blocker']['shortages']): string {
  const chips = shortages.map((s) => ({ index: play.terms.chipSet.findIndex((d) => d.value === s.value), count: s.count }));
  const lead = `${owner}’s rebuy ${rebuyNumber} is using`;
  if (chips.length === 1) {
    const name = chipsName(play, shortages[0].value, 2).replace(/^2 /, '');
    return `${lead} ${formatCount(chips[0].count)} of these ${name}`;
  }
  return `${lead} ${shortages.map((s) => chipsName(play, s.value, s.count)).join(' and ')}`;
}

function buildView(access: CashAccess, fix: FixRecord, step: FixView['step'], start: FixStart | null, undo: UndoRebuyData): FixView {
  const { play } = access;
  const ownerName = nameOf(play, fix.blocker.participantId);
  const first = fix.blocker.shortages[0];
  const counts = fix.target === 'count' ? fixCounts(access, fix) : null;
  const name = nameOf(play, fix.participantId);
  return {
    playerName: name,
    target: fix.target,
    step,
    blocker: {
      ownerName,
      rebuyNumber: fix.blocker.rebuyNumber,
      amountText: formatEur(fix.blocker.contribution),
      mix: coloredMix(play, fix.blocker.mix),
      chip: blockedChip(play, { index: play.terms.chipSet.findIndex((d) => d.value === first.value), count: first.count }),
      usageText: usageText(play, ownerName, fix.blocker.rebuyNumber, fix.blocker.shortages),
    },
    undo,
    correction:
      fix.target === 'count' && counts && resultOf(play, fix.participantId)
        ? { mix: coloredMix(play, play.terms.chipSet.map((d, i) => ({ value: d.value, count: counts[i] }))), confirmation: replaceConfirmation(access, counts) }
        : null,
    removal:
      fix.target === 'result'
        ? (returnToPlayData(play, fix.participantId, name) ?? { playerName: name, handBack: [], buyInsText: formatEur(totalContributions(issuancesOf(play, fix.participantId))) })
        : null,
    newRebuy: { participantId: fix.blocker.participantId, note: `Swap ${ownerName}’s chips so they match this stack.` },
    start,
  };
}

export function createFixOperations(rt: Runtime) {
  /** The In progress cash game for a fix (the participant is the one whose record is fixed). */
  function cashAccess(gameId: string, participantId: string) {
    return cashParticipant(rt.state(), gameId, participantId);
  }

  return {
    /**
     * The fix page: the recorded fix at its current step, or, with `start` and none recorded,
     * step 1 for that blocked correction (or removal) as the records stand. `null` when there is
     * nothing to fix (any more).
     */
    getFix(gameId: string, start?: FixStart): FixView | null {
      const game = findGame(rt.state(), gameId);
      const startKey = start ? `${start.participantId}:${start.target}` : '';
      return rt.memo(`play.fix:${gameId}:${startKey}`, [game], () => {
        const play = game?.phase === 'inProgress' ? game.play : undefined;
        if (!play) return null;
        if (play.fix) {
          const found = cashAccess(gameId, play.fix.participantId);
          if (!found.ok) return null;
          const fix = play.fix;
          const step = fix.stage === 'save' ? 2 : fix.stage === 'rebuy' ? 3 : 'done';
          const after = totalContributions(issuancesOf(play, fix.blocker.participantId));
          const undo: UndoRebuyData = {
            rebuyId: '',
            playerName: nameOf(play, fix.blocker.participantId),
            rebuyNumber: fix.blocker.rebuyNumber,
            mix: coloredMix(play, fix.blocker.mix),
            contributionsBeforeText: formatEur(after + fix.blocker.contribution),
            contributionsAfterText: formatEur(after),
            context: 'fix',
          };
          return buildView(found.access, fix, step, null, undo);
        }
        if (!start) return null;
        const found = cashAccess(gameId, start.participantId);
        if (!found.ok) return null;
        const dependent = analyze(found.access, start, rt.now().toISOString());
        if (!dependent) return null;
        const fix = recordFor(found.access.play, start, dependent);
        return buildView(found.access, fix, 1, start, undoData(found.access.play, dependent.blocker, 'fix'));
      });
    },

    /**
     * Step 1, Undo <owner>’s rebuy k: undoes exactly the dependent rebuy the page showed
     * (`rebuyId`) and records the fix at step 2, retaining the corrected counts. Nothing else.
     */
    async undoFixBlocker(gameId: string, start: FixStart, rebuyId: string): Promise<UndoFixBlockerResult> {
      const state = rt.state();
      const found = cashAccess(gameId, start.participantId);
      if (!found.ok) return found.rejection;
      const { access } = found;
      if (unfinishedFix(access.play)) {
        return rejected('fixInProgress', 'Another fix is still in progress. Finish it from Play first.');
      }
      if (!resultOf(access.play, start.participantId)) {
        return rejected('noResult', `${access.participant.name} has no confirmed result.`);
      }
      const dependent = analyze(access, start, rt.now().toISOString());
      if (!dependent || dependent.blocker.id !== rebuyId) return rejected('fixChanged', FIX_CHANGED);
      const play = access.play;
      const next = withFix(
        { ...play, issuances: play.issuances.filter((i) => i !== dependent.blocker) },
        recordFor(play, start, dependent),
      );
      await rt.apply(withPlayRecord(state, access.game, next));
      return { status: 'accepted' };
    },

    /**
     * Step 2: Replace result with the counts the page showed (`counts`), or remove the result
     * (Back in the game) for a removal. Moves the fix to step 3.
     */
    async saveFixStep(gameId: string, reviewed: { counts?: readonly number[] } = {}): Promise<SaveFixStepResult> {
      const state = rt.state();
      const fix = findGame(state, gameId)?.play?.fix;
      const found = cashAccess(gameId, fix?.participantId ?? '');
      if (!found.ok) return found.rejection.reason.code === 'participantNotFound' ? rejected('noFix', 'There is nothing to fix.') : found.rejection;
      const { access } = found;
      const recorded = access.play.fix;
      if (!recorded || recorded.stage !== 'save') return rejected('noFix', 'There is nothing to save in this fix.');
      if (!resultOf(access.play, recorded.participantId)) {
        return rejected('noResult', `${access.participant.name} has no confirmed result.`);
      }
      let counts: number[] | null = null;
      if (recorded.target === 'count') {
        counts = fixCounts(access, recorded);
        if (!counts || !reviewed.counts || !sameTexts(counts.map(String), reviewed.counts.map(String))) {
          return rejected('countChanged', 'The count changed. Review it again.');
        }
      }
      const change = resultChange(access.play, recorded.participantId, counts, rt.now().toISOString());
      if (change.kind === 'blocked') return { status: 'blocked', blocked: change.blocked };
      if (change.kind === 'dependent') return { status: 'blocked', blocked: chipsHandedOutAgain(access.play, change.short) };
      const next = counts ? replacedRecords(change.next, recorded.participantId) : removedRecords(change.next, recorded.participantId);
      await rt.apply(withPlayRecord(state, access.game, next));
      return { status: 'accepted' };
    },

    /** Done → Back to Play (or leaving a finished fix): forgets the recorded fix. */
    async finishFix(gameId: string): Promise<FinishFixResult> {
      const state = rt.state();
      const fix = findGame(state, gameId)?.play?.fix;
      const found = cashAccess(gameId, fix?.participantId ?? '');
      if (!found.ok) return found.rejection.reason.code === 'participantNotFound' ? rejected('noFix', 'There is nothing to fix.') : found.rejection;
      await rt.apply(withPlayRecord(state, found.access.game, withFix(found.access.play, undefined)));
      return { status: 'accepted' };
    },
  };
}

/** The fix record step 1 creates: the dependent rebuy as it was and the retained counts. */
function recordFor(
  play: PlayRecord,
  start: FixStart,
  dependent: { blocker: PlayRecord['issuances'][number]; short: { index: number; count: number }[]; counts: number[] | null },
): FixRecord {
  const { blocker } = dependent;
  return {
    participantId: start.participantId,
    target: start.target,
    blocker: {
      participantId: blocker.participantId,
      rebuyNumber: rebuyNumberOf(play, blocker),
      contribution: blocker.contribution,
      mix: blocker.mix,
      shortages: dependent.short.map((s) => ({ value: play.terms.chipSet[s.index].value, count: s.count })),
    },
    ...(dependent.counts ? { counts: dependent.counts } : {}),
    stage: 'save',
  };
}

