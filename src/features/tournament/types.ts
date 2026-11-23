/**
 * Display contracts of the tournament screens of a started game. Plain data only: game management
 * derives every place, payout, prize pool, winner and late-entry state and hands them over already
 * worded and formatted ("EUR 98.00", "4th", "1st–4th", "70%"). The screens only show them.
 *
 * The data types are game management's read models (re-exported here); a screen's data adds only
 * its workspace frame or context line.
 */
import type { OrderEditorView, TournamentPlayView, TournamentResultsView } from '@/game-management';

export type {
  BackInData,
  CalculateState,
  EliminationPreview,
  FinisherRow,
  FinishingStatus,
  LateEntryState,
  MissedSlot,
  OrderChangeRow,
  OrderDraftRow,
  PrizePoolData,
  PrizeRung,
  PrizeRungHolder,
  StillInData,
  StillInPlayer,
  TournamentPlayerResult,
  TournamentTerm,
  UnpaidFinisher,
} from '@/game-management';

/** Outcome of a host operation started from a tournament screen. */
export type TournamentActionResult =
  | {
      /** Recorded and saved; the popup closes and the screen shows the new data. */
      status: 'accepted';
    }
  | {
      /** Nothing changed. The popup closes and the host shows `message` (e.g. as a toast). */
      status: 'rejected';
      /** Actionable reason in words, e.g. "Alice is already out." */
      message: string;
    };

/** The frame of a started game's workspace tab (see `WorkspaceFrame`). */
export interface TournamentFrameData {
  /** "Tournament · 23 Nov, 19:30"; Completed adds "–23:41". */
  context: string;
  /** Where the top-left control leads. */
  backLabel: 'Games' | 'History';
}

/** Everything tournament Play shows. */
export type TournamentPlayData = Omit<TournamentPlayView, 'gameId'> & { frame: TournamentFrameData };

/** Everything tournament Results shows. */
export type TournamentResultsData = Omit<TournamentResultsView, 'gameId'> & { frame: TournamentFrameData };

/** Everything the finishing-order editor shows. */
export type OrderEditorData = Omit<OrderEditorView, 'gameId'> & {
  /** "Tournament · 23 Nov, 19:30". */
  context: string;
};

/** A prize pool before → after a contribution (rebuy, late entry, forgotten rebuy). */
export interface PrizePoolChange {
  /** "EUR 140.00". */
  beforeText: string;
  /** "EUR 160.00". */
  afterText: string;
}

/** Extra rows for the forgotten-rebuy confirmation of an eliminated player. */
export interface ForgottenRebuyTournamentData {
  name: string;
  /** "6th": the place stays. */
  placeLabel: string;
  prizePool: PrizePoolChange;
  /** Payouts of the paid places, before → after: "98.00 / 42.00" → "112.00 / 48.00". */
  payouts: { beforeText: string; afterText: string };
}
