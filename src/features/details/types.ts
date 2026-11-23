/**
 * Display contract of the locked Game details tab (In progress and Completed, cash game and
 * tournament). Plain data only: game management formats every value.
 */
import type { DisplayChip } from '@/features/play/types';

/** One paid place of a tournament's locked payout schedule. */
export interface DetailsPayoutPlace {
  /** Stable key. */
  id: string;
  /** "1st". */
  placeLabel: string;
  /** "70%". */
  shareText: string;
  /** The current prize: "EUR 98.00". */
  amountText: string;
}

/** A participant in joining order. */
export interface DetailsPlayer {
  /** Participant id. */
  id: string;
  /** Captured name. */
  name: string;
  /** "Joined late", or `null` for an initial player. */
  note: string | null;
}

export interface GameDetailsData {
  mode: 'cash' | 'tournament';
  phase: 'inProgress' | 'completed';
  /** "Cash game · 13 Nov, 19:30" (Completed adds "· finished 23:41"). */
  context: string;
  backLabel: 'Games' | 'History';
  /** "13 Nov 2026 · 19:30". */
  createdText: string;
  /** "13 Nov 2026 · 23:41"; `null` while In progress. */
  finishedText: string | null;
  /** The common buy-in, which every rebuy repeats: "EUR 20.00". */
  buyInText: string;
  /** Cash: "EUR 0.10 per chip unit"; tournament: "No chip money value". */
  chipValueText: string;
  /** "1 / 2 chip units". */
  blindsText: string;
  /** Used depth, with the requested one when it differs: "100 BB", "98 BB (requested 100 BB)". */
  depthText: string;
  /** "4 payments of each blind". */
  coverageText: string;
  /** "Fewer chips" / "More chips". */
  preferenceText: string;
  /** Started reserve, with the configured one when it differs: "3 stacks", "1 stack (configured 3)". */
  reserveText: string;
  /** The recorded initial stack of every player. */
  startingStack: { unitsText: string; chips: readonly DisplayChip[] };
  /** The game's configured chip set (quantities as configured, not the current bank). */
  chipSet: readonly DisplayChip[];
  /** Participants in joining order. */
  players: readonly DetailsPlayer[];
  /** Tournament only: the locked schedule with current amounts. */
  payouts: {
    /** "Top 2". */
    name: string;
    places: readonly DetailsPayoutPlace[];
    /** "Prize pool EUR 140.00 · 6 buy-ins + 1 rebuy. Rebuys raise every prize; the percentages stay." */
    note: string;
  } | null;
}
