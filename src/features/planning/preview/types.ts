import type { GameMode } from '@/domain/types';
import type { PlanningView, StartAcceptance, StartResult, StepId } from '@/game-management';

/** One paid place on the preview's Payouts card and in the Start tournament? popup. */
export interface PreviewPayoutPlace {
  id: string;
  /** "1st". */
  placeLabel: string;
  /** The share as the host typed it, with the percent sign: "70%". */
  shareText: string;
  /** "EUR 84.00", or "—" while no amount can be shown. */
  amountText: string;
}

/** Everything Distribution preview shows, taken straight from the Planning view. */
export interface PreviewData {
  mode: GameMode;
  /** Initial players: "Edit players (N)". */
  playerCount: number;
  preview: PlanningView['preview'];
  /** Tournament payout schedule ("Payouts · Top 2"); `null` in cash games. */
  payouts: { name: string; places: readonly PreviewPayoutPlace[] } | null;
}

export type { StartAcceptance, StartResult, StepId };
