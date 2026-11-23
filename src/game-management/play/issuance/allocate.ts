/**
 * One later stack (rebuy or late entry) from the current bank under the started terms, with the
 * shared-reserve protection and the wording every popup shows. Pure: nothing is recorded here.
 */
import { allocateLaterStack } from '@/domain/distribution';
import { formatEur } from '@/domain/money';
import type { ChipMix } from '@/domain/types';

import type { GameDocument, PlayRecord } from '../../core/documents';
import { withColors } from '../../planning/distribution';
import { formatCount } from '../../shared/numbers';
import { bankMix, mixValue, reserveUnconsumed, totalContributions } from '../ledger';
import type { ExtraFact, HandoutStack, IssueBlockCode, IssueBlockReason, ReserveAfter } from './types';

export type LaterStack =
  | {
      kind: 'qualifying';
      mix: ChipMix;
      /** Still-targeted stacks formable at once after this one. */
      reserveAfter: number;
      /** Still-targeted stacks that should stay formable (unconsumed target minus this request). */
      reserveToKeep: number;
      weakened: boolean;
    }
  | { kind: 'reducedCoverage'; mix: ChipMix; achievedCoverage: number }
  | { kind: 'blocked'; code: IssueBlockCode | 'coverageShortage'; reason: IssueBlockReason; message: string };

const unitsText = (play: PlayRecord) => formatCount(play.terms.stackValue);

/** "500", "500 and 1,000", "100, 500 and 1,000". */
function valueList(values: readonly number[]): string {
  const texts = values.map(formatCount);
  return texts.length === 1 ? texts[0] : `${texts.slice(0, -1).join(', ')} and ${texts[texts.length - 1]}`;
}

/** Why the bank has the value but no combination of exactly T units. */
function unsuitableMessage(play: PlayRecord, bank: ChipMix): string {
  const target = play.terms.stackValue;
  const head = `No exact ${unitsText(play)}-unit stack can be formed.`;
  const smaller = mixValue(bank.filter((c) => c.value < target));
  const larger = bank.filter((c) => c.value > target && c.count > 0);
  if (smaller >= target || larger.length === 0) return `${head} The chips in the bank cannot add up to exactly ${unitsText(play)} units.`;
  const chips = larger.length === 1 && larger[0].count === 1 ? 'chip cannot' : 'chips cannot';
  return `${head} The smaller chips make only ${formatCount(smaller)} units, and the ${valueList(larger.map((c) => c.value))}-unit ${chips} be split.`;
}

export function coverageBlockMessage(stackUnits: string, achieved: number, required: number): string {
  return `An exact ${stackUnits}-unit stack is possible, but it covers only ${achieved} of the required ${required} payments of each blind. Late arrivals need full coverage; reduced coverage is for rebuys only.`;
}

/**
 * The proposal for the next later stack. Each rebuy or late entry consumes one unit of the started
 * target, so the stack keeps `unconsumed − 1` (at least 0) still-targeted stacks formable; the
 * solver protects what is actually achievable and never refuses a feasible request for the reserve.
 */
export function proposeLaterStack(play: PlayRecord, allowReducedCoverage: boolean): LaterStack {
  const { terms } = play;
  const bank = bankMix(play);
  const reserveToKeep = Math.max(0, reserveUnconsumed(play) - 1);
  const result = allocateLaterStack({
    bank,
    blinds: terms.blinds,
    stackValue: terms.stackValue,
    coverage: terms.coverage,
    preference: terms.preference,
    reserveToKeep,
    allowReducedCoverage,
  });
  const allocation = (code: IssueBlockCode, message: string): LaterStack => ({
    kind: 'blocked',
    code,
    reason: { kind: 'allocation', message },
    message,
  });
  switch (result.kind) {
    case 'qualifying':
      return { kind: 'qualifying', mix: result.mix, reserveAfter: result.reserveAfter, reserveToKeep, weakened: result.reserveWeakened };
    case 'reducedCoverage':
      return { kind: 'reducedCoverage', mix: result.mix, achievedCoverage: result.achievedCoverage };
    case 'searchLimitReached':
      return allocation(
        'tooComplex',
        `Working out an exact ${unitsText(play)}-unit stack from this bank is too complex for the phone.`,
      );
    case 'impossible':
      if (result.reason === 'insufficientValue') {
        return allocation(
          'insufficientValue',
          `An exact ${unitsText(play)}-unit stack is needed, but the bank holds only ${formatCount(mixValue(bank))} chip units.`,
        );
      }
      if (result.reason === 'unsuitableDenominations') return allocation('unsuitableDenominations', unsuitableMessage(play, bank));
      {
        const achieved = result.achievableCoverage ?? 0;
        return {
          kind: 'blocked',
          code: 'coverageShortage',
          reason: { kind: 'coverage', achieved, required: terms.coverage, stackUnitsText: unitsText(play) },
          message: coverageBlockMessage(unitsText(play), achieved, terms.coverage),
        };
      }
  }
}

export function handoutStack(play: PlayRecord, mix: ChipMix): HandoutStack {
  return { unitsText: unitsText(play), chips: withColors(mix, play.terms.chipSet) };
}

export function reserveAfterView(stacks: number): ReserveAfter {
  return { value: formatCount(stacks), unit: stacks === 1 ? 'stack left' : 'stacks left' };
}

/**
 * The quiet reserve line under a proposal: the target was already used up before this request
 * (further feasible requests stay allowed), or the remaining guarantee is weaker than its target.
 */
export function reserveNote(play: PlayRecord, stack: LaterStack, targetUsed: string): string | null {
  if (reserveUnconsumed(play) === 0) return targetUsed;
  if (stack.kind === 'qualifying' && stack.weakened) {
    return `${formatCount(stack.reserveAfter)} of ${formatCount(stack.reserveToKeep)} still-targeted stacks can be supplied.`;
  }
  return null;
}

/** Tournaments: the prize pool before → after this contribution. */
export function prizePoolFacts(game: GameDocument & { play: PlayRecord }): readonly ExtraFact[] | undefined {
  if (game.mode !== 'tournament') return undefined;
  const pool = totalContributions(game.play.issuances);
  return [{ label: 'Prize pool', value: `${formatEur(pool)} → ${formatEur(pool + game.play.terms.buyIn)}` }];
}

/** "+EUR 20.00 contribution · 200 chip units issued". */
export function issuedLine(play: PlayRecord): string {
  return `+${formatEur(play.terms.buyIn)} contribution · ${unitsText(play)} chip units issued`;
}

export const counts = (mix: ChipMix): number[] => mix.map((c) => c.count);

export function sameCounts(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((count, i) => count === b[i]);
}
