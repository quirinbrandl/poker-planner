/**
 * Data contracts of the forgotten-rebuy / Correct mix editor and its confirmation.
 * Plain data only: game management fills these (`play.getRebuyMixEditor`, `play.reviewRebuyMix`).
 * The chip picker types come from the count editor.
 */
import type { BlockedMixData } from '@/features/count/types';
import type { MixWarning, RebuyMixConfirmationData, RebuyMixEditorView } from '@/game-management';

export type { ExtraFact, MixGoal, MixWarning, RebuyMixConfirmationData } from '@/game-management';

/** Everything the rebuy-mix editor shows. */
export interface RebuyMixEditorData extends RebuyMixEditorView {
  /** "Cash game · 16 Nov, 19:30". */
  context: string;
}

/** What the host accepted when confirming. */
export interface MixAcceptance {
  /** The warnings shown, all explicitly accepted (empty without warnings). */
  acceptedWarnings: readonly MixWarning['code'][];
}

/** What game management answers to "Review rebuy →". */
export type MixReviewOutcome =
  | { kind: 'confirm'; confirmation: RebuyMixConfirmationData }
  /** Missing quantities or a wrong total: `problem` / entry errors say what; go to that denomination if any. */
  | { kind: 'needsCorrection'; firstDenominationValue: number | null }
  /** The bank doesn't have these chips: "Not enough chips for this mix". Nothing was saved. */
  | { kind: 'blocked'; blocked: BlockedMixData }
  /** The caller has already explained why (toast). Nothing to show here. */
  | { kind: 'handled' };
