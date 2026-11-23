/**
 * Development and test fixtures for the fix flow: Alice's correction [10, 3, 5, 1, 0] (instead of
 * her effective [15, 2, 5, 1, 0]) needs 5 White chips that Bob's rebuy 2 now uses.
 */
import type { Cents } from '@/domain/types';
import { CONTEXT, eur, mix, resultConfirmation } from '@/features/count/fixtures';

import type { FixData } from './types';

const BOB_REBUY_2 = [15, 2, 3, 1, 0];
const ALICE_CORRECTED = [10, 3, 5, 1, 0];

function fixData(step: FixData['step'], target: FixData['target'] = 'count'): FixData {
  return {
    context: CONTEXT,
    playerName: 'Alice',
    target,
    step,
    blocker: {
      ownerName: 'Bob',
      rebuyNumber: 2,
      amountText: eur(2000),
      mix: mix(BOB_REBUY_2),
      chip: { value: 1, color: 'white', deltaText: '−5' },
      usageText: target === 'count' ? 'Bob’s rebuy 2 is using 5 of these White chips' : 'Bob’s rebuy 2 is using 15 of these White chips',
    },
    undo: {
      rebuyId: 'p2-r2',
      playerName: 'Bob',
      rebuyNumber: 2,
      mix: mix(BOB_REBUY_2),
      contributionsBeforeText: eur(6000),
      contributionsAfterText: eur(4000),
      context: 'fix',
    },
    correction:
      target === 'count'
        ? { mix: mix(ALICE_CORRECTED), confirmation: resultConfirmation('Alice', ALICE_CORRECTED, 2000 as Cents, 'replace') }
        : null,
    removal: target === 'result' ? { playerName: 'Alice', handBack: mix([15, 2, 5, 1, 0]), buyInsText: eur(2000) } : null,
  };
}

export const FIX_FIXTURES = {
  step1: fixData(1),
  step2: fixData(2),
  step3: fixData(3),
  done: fixData('done'),
  'removal-step1': fixData(1, 'result'),
  'removal-step2': fixData(2, 'result'),
  'removal-done': fixData('done', 'result'),
} satisfies Record<string, FixData>;

export type FixFixtureName = keyof typeof FIX_FIXTURES;
export { fixData };
