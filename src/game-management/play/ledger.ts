/**
 * Everything derived from a started game's records: bank, contributions, chips in play and reserve
 * consumption. Nothing here is stored. When later records move chips (final results returning a
 * mix), add their effect here so every view and check follows.
 */
import type { Cents, ChipMix } from '@/domain/types';

import type { CountDraft, IssuanceRecord, PlayRecord, ResultRecord } from '../core/documents';

/** Adds `sign × mix` to `counts` (same denomination order). */
function addMix(counts: number[], mix: ChipMix, sign: 1 | -1): void {
  mix.forEach((chip, i) => {
    counts[i] += sign * chip.count;
  });
}

export function mixOf(play: PlayRecord, counts: readonly number[]): ChipMix {
  return play.terms.chipSet.map((d, i) => ({ value: d.value, count: counts[i] }));
}

/** Bank = configured chip set − every recorded issuance + every confirmed final result's returned mix. */
export function bankMix(play: PlayRecord): ChipMix {
  const counts = play.terms.chipSet.map((d) => d.quantity);
  for (const issuance of play.issuances) addMix(counts, issuance.mix, -1);
  for (const result of play.results ?? []) addMix(counts, result.mix, 1);
  return mixOf(play, counts);
}

/** The participant's confirmed final result (cash games), if any. */
export function resultOf(play: PlayRecord, participantId: string): ResultRecord | undefined {
  return play.results?.find((r) => r.participantId === participantId);
}

/** The participant's unconfirmed final chip count draft (cash games), if any. */
export function countDraftOf(play: PlayRecord, participantId: string): CountDraft | undefined {
  return play.countDrafts?.find((d) => d.participantId === participantId);
}

/** Whether the participant has been finally eliminated (tournaments). */
export function isEliminated(play: PlayRecord, participantId: string): boolean {
  return play.eliminations?.some((e) => e.participantId === participantId) ?? false;
}

/** Chips handed out across the table (every issuance so far). */
export function issuedMix(issuances: readonly IssuanceRecord[], play: PlayRecord): ChipMix {
  const counts = play.terms.chipSet.map(() => 0);
  for (const issuance of issuances) addMix(counts, issuance.mix, 1);
  return mixOf(play, counts);
}

export function mixChips(mix: ChipMix): number {
  return mix.reduce((sum, c) => sum + c.count, 0);
}

export function mixValue(mix: ChipMix): number {
  return mix.reduce((sum, c) => sum + c.value * c.count, 0);
}

export function issuancesOf(play: PlayRecord, participantId: string): IssuanceRecord[] {
  return play.issuances.filter((i) => i.participantId === participantId);
}

export function totalContributions(issuances: readonly IssuanceRecord[]): Cents {
  return issuances.reduce((sum, i) => sum + i.contribution, 0);
}

/** Rebuys and late entries recorded after Start: each consumes one unit of the started reserve target. */
export function reserveConsumed(play: PlayRecord): number {
  return play.issuances.filter((i) => i.kind !== 'initial').length;
}

/** Still-targeted reserved stacks: started target minus consumption, floored at zero. */
export function reserveUnconsumed(play: PlayRecord): number {
  return Math.max(0, play.terms.reserve.target - reserveConsumed(play));
}
