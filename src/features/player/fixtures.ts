/** Development and test fixtures for the player page (the prototype's Alice / Bob story). */
import type { Cents } from '@/domain/types';
import { BUY_IN, CONTEXT, chipValueText, eur, grouped, mix, unitsOf, winLoss } from '@/features/count/fixtures';

import type { BuyInRecord, PlayerPageData } from './types';

const STACK = [15, 2, 3, 1, 0];

interface RebuyInput {
  counts?: readonly number[];
  addedLater?: boolean;
  corrected?: boolean;
  coverage?: number;
}

interface PlayerInput {
  id?: string;
  name: string;
  rebuys?: readonly RebuyInput[];
  /** Final chip counts; `undefined` still playing. */
  result?: readonly number[];
  countDraft?: boolean;
  correctionDraft?: boolean;
  phase?: PlayerPageData['phase'];
  buyIn?: Cents;
  backLabel?: string;
}

export function playerData({
  id = 'p1',
  name,
  rebuys = [],
  result,
  countDraft = false,
  correctionDraft = false,
  phase = 'inProgress',
  buyIn = BUY_IN,
  backLabel = 'Back to Play',
}: PlayerInput): PlayerPageData {
  const editable = phase === 'inProgress';
  const contributions = (buyIn * (1 + rebuys.length)) as Cents;
  const buyIns: BuyInRecord[] = [
    {
      id: `${id}-buy-in`,
      kind: 'buyIn',
      label: 'Buy-in',
      amountText: eur(buyIn),
      mix: mix(STACK),
      addedLater: false,
      corrected: false,
      coverageText: null,
      undo: null,
    },
    ...rebuys.map((rebuy, index): BuyInRecord => ({
      id: `${id}-r${index + 1}`,
      kind: 'rebuy',
      label: `Rebuy ${index + 1}`,
      amountText: eur(buyIn),
      mix: mix(rebuy.counts ?? STACK),
      addedLater: Boolean(rebuy.addedLater),
      corrected: Boolean(rebuy.corrected),
      coverageText: rebuy.coverage !== undefined && rebuy.coverage < 4 ? `${rebuy.coverage} of 4 coverage` : null,
      undo: editable
        ? {
            rebuyId: `${id}-r${index + 1}`,
            playerName: name,
            rebuyNumber: index + 1,
            mix: mix(rebuy.counts ?? STACK),
            contributionsBeforeText: eur(contributions),
            contributionsAfterText: eur(contributions - buyIn),
            context: 'page',
          }
        : null,
    })),
  ];
  const units = result ? unitsOf(result) : 0;
  return {
    phase,
    context: phase === 'completed' ? `${CONTEXT} · finished 23:41` : CONTEXT,
    playerId: id,
    name,
    backLabel,
    result: result
      ? {
          // Completed shows allocated cents: these fixtures are whole-cent already.
          winLoss: winLoss(units, contributions, buyIn),
          chipValueText: chipValueText(units, buyIn),
          contributionsText: `−${eur(contributions)}`,
          unitsText: grouped(units),
          finalChips: mix(result),
          correctionDraft,
        }
      : null,
    countDraft,
    buyInsTotalText: eur(contributions),
    buyIns,
    returnToPlay: result && editable ? { playerName: name, handBack: mix(result), buyInsText: eur(contributions) } : null,
  };
}

const ALICE_RESULT = [15, 2, 5, 1, 0];

export const PLAYER_FIXTURES = {
  /** Alice with a 250-unit result: +EUR 5.00. */
  alice: playerData({ name: 'Alice', result: ALICE_RESULT }),
  /** After adding a forgotten rebuy: her result stays, −EUR 15.00. */
  'alice-after-history': playerData({ name: 'Alice', result: ALICE_RESULT, rebuys: [{ addedLater: true }] }),
  /** Bob still playing with one rebuy. */
  bob: playerData({ id: 'p2', name: 'Bob', rebuys: [{}] }),
  /** Clara with a count draft. */
  'clara-draft': playerData({ id: 'p3', name: 'Clara', countDraft: true }),
  /** Every tag: added later, corrected, reduced coverage; plus a correction draft on the result. */
  tags: playerData({
    id: 'p4',
    name: 'David',
    result: [40, 6, 4, 2, 0],
    correctionDraft: true,
    rebuys: [{ counts: [10, 3, 3, 1, 0], corrected: true, coverage: 3 }, { addedLater: true }, { counts: [0, 0, 0, 2, 0], addedLater: true, coverage: 0 }],
  }),
  /** Alice back in the game: playing again, buy-in unchanged. */
  'return-after': playerData({ name: 'Alice' }),
  /** EUR 20.01 buy-in: exact sub-cent values. */
  'sub-cent': playerData({ name: 'Alice', result: ALICE_RESULT, buyIn: 2001 as Cents }),
  /** Completed: read-only. */
  completed: playerData({ id: 'p2', name: 'Bob', rebuys: [{}], result: [10, 1, 3, 2, 0], phase: 'completed', backLabel: 'Back to Payments' }),
  /** A confirmed zero result (nothing to hand back). */
  zero: playerData({ id: 'p6', name: 'Felix', result: [0, 0, 0, 0, 0] }),
  long: playerData({
    name: 'Maximiliane Alexandra von Hohenzollern-Sigmaringen',
    result: [135, 24, 27, 12, 1],
    rebuys: Array.from({ length: 4 }, () => ({ counts: [40, 2, 2, 1, 0], addedLater: true, corrected: true, coverage: 2 })),
  }),
} satisfies Record<string, PlayerPageData>;

export type PlayerFixtureName = keyof typeof PLAYER_FIXTURES;
