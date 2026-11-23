/**
 * Rebuy records, both modes: Undo a mistaken rebuy, add a forgotten historical rebuy and correct a
 * rebuy's mix to the chips actually handed out. Historical mixes are facts the host enters, never
 * a recommendation: they keep the buy-in price and the exact stack value, must fit the bank's
 * inventory, and need explicit acceptance when their blind-payment coverage is reduced or they
 * leave fewer still-targeted reserve stacks formable. A forgotten rebuy never touches a recorded
 * result or elimination.
 */
import { measureMix, reserveCapacity } from '@/domain/distribution';
import { formatEur } from '@/domain/money';
import { placeLabel } from '@/domain/payouts';

import type { IssuanceRecord, PlayRecord } from '../../core/documents';
import { rejected } from '../../core/results';
import type { Runtime } from '../../core/runtime';
import { findGame } from '../../planning/draft';
import { formatCount } from '../../shared/numbers';
import { bankMix, eliminationOrder, isEliminated, issuancesOf, reserveUnconsumed, resultOf, totalContributions } from '../ledger';
import { mixFrom, parseCount } from '../results/count';
import { coloredMix } from '../results/shared';
import type { EditorProblem } from '../results/types';
import {
  buyInRecords,
  checkInventory,
  moreThanTheGameHas,
  notEnoughChips,
  type PlayAccess,
  playParticipant,
  rebuyNumberOf,
  type StartedGame,
  undoOverfills,
  withPlayRecord,
} from './shared';
import type {
  MixGoal,
  MixWarning,
  PlayerBuyInsView,
  RebuyMixAcceptance,
  RebuyMixConfirmationData,
  RebuyMixEditorView,
  RebuyMixReviewResult,
  RebuyMixTarget,
  RecordRebuyMixResult,
  UndoRebuyResult,
} from './types';

const QUANTITIES_MISSING: EditorProblem = { title: 'Quantities missing.', message: 'Enter every quantity, including zero.' };

/** The recorded rebuy `rebuyId` of the participant, or why there is none. */
function findRebuy(play: PlayRecord, participantId: string | null, rebuyId: string) {
  const issuance = play.issuances.find((i) => i.id === rebuyId && (participantId === null || i.participantId === participantId));
  if (!issuance) return { ok: false as const, rejection: rejected('rebuyNotFound', 'This rebuy is no longer recorded.') };
  if (issuance.kind !== 'rebuy') {
    return { ok: false as const, rejection: rejected('notARebuy', 'The first stack cannot be undone or corrected.') };
  }
  return { ok: true as const, issuance };
}

/** "Alice’s result stays." / "Bob · Stays out · 6th": what a historical rebuy leaves alone. */
function stayNotes(access: PlayAccess): string[] {
  const { game, play, participant } = access;
  if (game.mode === 'cash') return resultOf(play, participant.id) ? [`${participant.name}’s result stays.`] : [];
  const index = eliminationOrder(play).indexOf(participant.id);
  if (index < 0) return [];
  return [`${participant.name} · Stays out · ${placeLabel(play.roster.length - index)}`];
}

function goalOf(play: PlayRecord, units: number, complete: boolean): MixGoal {
  const target = play.terms.stackValue;
  const status: MixGoal['status'] = units > target ? 'over' : units < target ? 'toGo' : complete ? 'exact' : 'exactSoFar';
  const targetText = formatCount(target);
  return {
    unitsText: formatCount(units),
    targetText,
    units,
    target,
    status,
    statusText: {
      over: `${formatCount(units - target)} over`,
      toGo: `${formatCount(target - units)} to go`,
      exact: `Exactly ${targetText} ✓`,
      exactSoFar: `${targetText} so far · enter the rest, even if 0`,
    }[status],
  };
}

function wrongTotal(play: PlayRecord, units: number): EditorProblem {
  return {
    title: `${formatCount(units)} chip units, not ${formatCount(play.terms.stackValue)}.`,
    message: 'Check the quantities you entered.',
  };
}

/** The records with the historical rebuy added (`rebuy` absent) or its mix replaced. */
function recordsWith(play: PlayRecord, access: PlayAccess, counts: readonly number[], rebuy: IssuanceRecord | null, id: string, now: string) {
  const mix = mixFrom(play, counts);
  const issuances = rebuy
    ? play.issuances.map((i) => (i === rebuy ? { ...i, mix } : i))
    : [
        ...play.issuances,
        {
          id,
          participantId: access.participant.id,
          kind: 'rebuy' as const,
          contribution: play.terms.buyIn,
          mix,
          recordedAt: now,
          addedLater: true as const,
        },
      ];
  return { ...play, issuances };
}

/** Still-targeted reserve stacks the bank of `play` can form at once (counted up to `max`); `null` if too complex. */
function formable(play: PlayRecord, max: number): number | null {
  if (max === 0) return 0;
  const { terms } = play;
  const measured = reserveCapacity({ bank: bankMix(play), blinds: terms.blinds, stackValue: terms.stackValue, coverage: terms.coverage, max });
  return measured.kind === 'measured' ? measured.stacks : null;
}

type MixReview =
  | Exclude<RebuyMixReviewResult, { status: 'needsConfirmation' }>
  | { status: 'needsConfirmation'; confirmation: RebuyMixConfirmationData; next: PlayRecord; coverage: number };

function reviewMix(access: PlayAccess, rebuy: IssuanceRecord | null, texts: readonly string[], newId: string, now: string): MixReview {
  const { game, play, participant } = access;
  const { terms } = play;
  const parsed = parseCount(play, texts, false);
  if (!parsed.complete) {
    return { status: 'needsCorrection', firstDenominationValue: parsed.entries.find((e) => e.state !== 'entered')!.value, problem: QUANTITIES_MISSING };
  }
  if (parsed.units !== terms.stackValue) {
    return { status: 'needsCorrection', firstDenominationValue: null, problem: wrongTotal(play, parsed.units) };
  }
  const next = recordsWith(play, access, parsed.counts, rebuy, newId, now);
  const check = checkInventory(next);
  if (check.short.length > 0) return { status: 'blocked', blocked: notEnoughChips(play, check.short) };
  if (check.over.length > 0) return { status: 'blocked', blocked: moreThanTheGameHas(play, check.over) };

  const measured = measureMix({ mix: mixFrom(play, parsed.counts), blinds: terms.blinds, stackValue: terms.stackValue, coverage: terms.coverage });
  if (measured.kind !== 'measured') {
    return rejected('tooComplex', 'Checking this mix is too complex for the phone.');
  }
  const warnings: MixWarning[] = [];
  if (measured.coverage < terms.coverage) {
    warnings.push({
      code: 'reducedCoverage',
      text: `Covers only ${formatCount(measured.coverage)} of ${formatCount(terms.coverage)} blind payments with separate chips.`,
    });
  }
  // The guarantee this history leaves, against what the bank could form before it.
  const before = formable(play, reserveUnconsumed(play));
  const targeted = reserveUnconsumed(next);
  const after = formable(next, targeted);
  if (before !== null && after !== null && after < Math.min(targeted, before)) {
    warnings.push({
      code: 'weakenedReserve',
      text: `Leaves chips for only ${formatCount(after)} of ${formatCount(targeted)} reserve stacks (was ${formatCount(before)}).`,
    });
  }

  const contributions = totalContributions(issuancesOf(play, participant.id));
  const pool = totalContributions(play.issuances);
  const confirmation: RebuyMixConfirmationData = {
    kind: rebuy ? 'correct' : 'forgotten',
    playerName: participant.name,
    rebuyNumber: rebuy ? rebuyNumberOf(play, rebuy) : null,
    mix: coloredMix(play, mixFrom(play, parsed.counts)),
    buyInsChange: rebuy ? null : { beforeText: formatEur(contributions), afterText: formatEur(contributions + terms.buyIn) },
    extraFacts:
      game.mode === 'tournament' && !rebuy ? [{ label: 'Prize pool', value: `${formatEur(pool)} → ${formatEur(pool + terms.buyIn)}` }] : [],
    warnings,
    notes: stayNotes(access),
  };
  return { status: 'needsConfirmation', confirmation, next, coverage: measured.coverage };
}

export function createRebuyRecordOperations(rt: Runtime) {
  /** The participant, and the rebuy to correct when `target.rebuyId` is given. */
  function access(gameId: string, participantId: string, target: RebuyMixTarget) {
    const found = playParticipant(rt.state(), gameId, participantId);
    if (!found.ok) return found;
    if (target.rebuyId === undefined) return { ok: true as const, access: found.access, rebuy: null };
    const rebuy = findRebuy(found.access.play, participantId, target.rebuyId);
    if (!rebuy.ok) return rebuy;
    return { ok: true as const, access: found.access, rebuy: rebuy.issuance };
  }

  return {
    /**
     * The Buy-ins section of a player page (both modes): every stack with its actual mix and tags,
     * each rebuy's Undo popup, and whether + Add forgotten rebuy and + Rebuy are offered. Completed:
     * read-only. `null` unless a started game with this participant.
     */
    getPlayerBuyIns(gameId: string, participantId: string): PlayerBuyInsView | null {
      const game = findGame(rt.state(), gameId);
      return rt.memo(`play.buyIns:${gameId}:${participantId}`, [game], () => {
        if (!game?.play || game.phase === 'planning') return null;
        const play = game.play;
        if (!play.roster.some((p) => p.id === participantId)) return null;
        const editable = game.phase === 'inProgress';
        const playing = game.mode === 'cash' ? !resultOf(play, participantId) : !isEliminated(play, participantId);
        return {
          buyInsTotalText: formatEur(totalContributions(issuancesOf(play, participantId))),
          buyIns: buyInRecords(play, participantId, editable),
          actions: { addForgottenRebuy: editable, rebuy: editable && playing },
        };
      });
    },

    /**
     * Undo rebuy: removes that rebuy's contribution, issuance and reserve consumption, using its
     * actual mix. The first stack cannot be undone. `blocked` if a later result returned its chips.
     */
    async undoRebuy(gameId: string, rebuyId: string): Promise<UndoRebuyResult> {
      const state = rt.state();
      const owner = findGame(state, gameId)?.play?.issuances.find((i) => i.id === rebuyId)?.participantId ?? '';
      const found = playParticipant(state, gameId, owner);
      if (!found.ok) {
        return found.rejection.reason.code === 'participantNotFound'
          ? rejected('rebuyNotFound', 'This rebuy is no longer recorded.')
          : found.rejection;
      }
      const { game, play } = found.access;
      const rebuy = findRebuy(play, null, rebuyId);
      if (!rebuy.ok) return rebuy.rejection;
      const next: PlayRecord = { ...play, issuances: play.issuances.filter((i) => i !== rebuy.issuance) };
      const check = checkInventory(next);
      if (check.over.length > 0) return { status: 'blocked', blocked: undoOverfills(play, check.over) };
      await rt.apply(withPlayRecord(state, game, next));
      return { status: 'accepted', participantId: owner, feedback: { title: 'Rebuy undone' } };
    },

    /**
     * The forgotten-rebuy (no `rebuyId`) or Correct mix editor for the texts the screen holds
     * (omitted: blanks, or the recorded mix to correct). `showErrors` after a failed review.
     * `null` unless an In progress game with this participant (and rebuy).
     */
    getRebuyMixEditor(
      gameId: string,
      participantId: string,
      options: RebuyMixTarget & { texts?: readonly string[]; showErrors?: boolean } = {},
    ): RebuyMixEditorView | null {
      const game = findGame(rt.state(), gameId);
      const showErrors = options.showErrors ?? false;
      const textsKey = options.texts ? options.texts.join('\u0000') : null;
      return rt.memo(`play.rebuyMix:${gameId}:${participantId}:${options.rebuyId ?? ''}:${showErrors}`, [game, textsKey], () => {
        const found = access(gameId, participantId, options);
        if (!found.ok) return null;
        const { play, participant } = found.access;
        const texts = options.texts ?? play.terms.chipSet.map((_, i) => (found.rebuy ? String(found.rebuy.mix[i].count) : ''));
        const parsed = parseCount(play, texts, showErrors);
        const problem = !showErrors
          ? null
          : !parsed.complete
            ? QUANTITIES_MISSING
            : parsed.units !== play.terms.stackValue
              ? wrongTotal(play, parsed.units)
              : null;
        return {
          playerName: participant.name,
          kind: found.rebuy ? 'correct' : 'forgotten',
          rebuyNumber: found.rebuy ? rebuyNumberOf(play, found.rebuy) : null,
          stackUnitsText: formatCount(play.terms.stackValue),
          resultStays: stayNotes(found.access).length > 0,
          entries: parsed.entries,
          goal: goalOf(play, parsed.units, parsed.complete),
          problem,
        };
      });
    },

    /**
     * "Review rebuy →" for the entered quantities. Changes nothing. The confirmation with its
     * warnings, the quantities to fix (`needsCorrection`: missing, or not exactly the stack value),
     * or `blocked` when the bank cannot have supplied the mix.
     */
    reviewRebuyMix(gameId: string, participantId: string, input: RebuyMixTarget & { texts: readonly string[] }): RebuyMixReviewResult {
      const found = access(gameId, participantId, input);
      if (!found.ok) return found.rejection;
      const review = reviewMix(found.access, found.rebuy, input.texts, 'review', rt.now().toISOString());
      if (review.status !== 'needsConfirmation') return review;
      return { status: 'needsConfirmation', confirmation: review.confirmation };
    },

    /**
     * Add rebuy / Save correction (Accept & …): records exactly the reviewed mix, with every warning
     * it raises accepted. A forgotten rebuy costs the buy-in and consumes reserve like any rebuy and
     * is tagged "added later"; a correction replaces the mix in place (one issuance, one
     * contribution) and is tagged "corrected". Nothing else changes.
     */
    async recordRebuyMix(gameId: string, participantId: string, acceptance: RebuyMixAcceptance): Promise<RecordRebuyMixResult> {
      const state = rt.state();
      const found = access(gameId, participantId, acceptance);
      if (!found.ok) return found.rejection;
      const id = found.rebuy?.id ?? rt.newId();
      const review = reviewMix(found.access, found.rebuy, acceptance.counts.map(String), id, rt.now().toISOString());
      if (review.status === 'blocked') return review;
      if (review.status === 'rejected') return review as Extract<RecordRebuyMixResult, { status: 'rejected' }>;
      if (review.status === 'needsCorrection') {
        return rejected('wrongMix', `A rebuy is exactly ${formatCount(found.access.play.terms.stackValue)} chip units. Check the quantities.`);
      }
      const missing = review.confirmation.warnings.filter((w) => !acceptance.acceptedWarnings.includes(w.code));
      if (missing.length > 0) {
        return rejected('warningsNotAccepted', `Accept the warning to save this rebuy: ${missing.map((w) => w.text).join(' ')}`);
      }

      const { play } = found.access;
      const terms = play.terms;
      const rebuy = found.rebuy;
      const unchanged = rebuy !== null && rebuy.mix.every((c, i) => c.count === acceptance.counts[i]);
      const feedback = { title: rebuy ? 'Rebuy corrected' : 'Forgotten rebuy added' };
      if (unchanged) return { status: 'accepted', issuanceId: id, feedback };
      const issuances = review.next.issuances.map((i): IssuanceRecord => {
        if (i.id !== id) return i;
        const tagged: IssuanceRecord = { ...i, ...(rebuy ? { corrected: true as const } : {}) };
        if (review.coverage < terms.coverage) tagged.reducedCoverage = review.coverage;
        else delete tagged.reducedCoverage;
        return tagged;
      });
      await rt.apply(withPlayRecord(state, found.access.game as StartedGame, { ...review.next, issuances }));
      return { status: 'accepted', issuanceId: id, feedback };
    },
  };
}
