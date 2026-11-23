/**
 * Corrections of recorded play: replacing or removing a confirmed cash result, undoing a rebuy,
 * forgotten rebuys and Correct mix, and the one-step-at-a-time fix for dependent records.
 * Everything returned here becomes part of `app.play` (and its Completed guard).
 */
import type { Runtime } from '../../core/runtime';
import { createFixOperations } from './fix';
import { createRebuyRecordOperations } from './rebuys';
import { createCorrectionOperations } from './result';

export function createCorrectionsOperations(rt: Runtime) {
  return {
    ...createCorrectionOperations(rt),
    ...createRebuyRecordOperations(rt),
    ...createFixOperations(rt),
  };
}
