/**
 * Display contracts of the tournament screens of a started game. Plain data only: game management
 * derives every place, payout, prize pool, winner and late-entry state and hands them over already
 * worded and formatted ("EUR 98.00", "4th", "1st–4th", "70%"). The screens only show them.
 */

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
  /** "Tournament · 23 Nov, 19:30"; Completed adds " · finished 23:41". */
  context: string;
  /** Where the top-left control leads. */
  backLabel: 'Games' | 'History';
}

/** One locked game term on Play's Blinds / Rebuy / Stack panel. */
export interface TournamentTerm {
  /** "Blinds", "Rebuy", "Stack". */
  label: string;
  /** "1 / 2", "20.00", "200". Never a chip money value. */
  value: string;
  /** "chip units", "EUR". */
  unit: string;
}

// ---------------------------------------------------------------------------------------------
// Play · layout B · Standings
// ---------------------------------------------------------------------------------------------

/** Who holds a paid place on the prize ladder. */
export interface PrizeRungHolder {
  playerId: string;
  name: string;
  /** True on the 1st rung once one player is left: shows "Winner" under the name. */
  isWinner: boolean;
}

/** One rung of the prize-pool hero: one paid place of the locked payout schedule. */
export interface PrizeRung {
  /** 1-based finishing place; stable key. */
  place: number;
  /** "1st". */
  placeLabel: string;
  /** "70%": spoken with the rung. */
  shareText: string;
  /** The share as a number 0–100, only for the share bar. */
  sharePercent: number;
  /** The place's current payout from the whole prize pool: "EUR 98.00". */
  amountText: string;
  /** Who finished here, or `null` while the place is still open ("Open"). */
  holder: PrizeRungHolder | null;
}

/** The prize-pool hero at the top of Play. */
export interface PrizePoolData {
  /** "EUR 140.00". */
  amountText: string;
  /** What it is made of: "6 buy-ins + 1 rebuy". */
  detail: string;
  /** One rung per paid place, 1st first. */
  rungs: readonly PrizeRung[];
}

/** What recording this player's elimination now would mean, shown in "<name> is out?". */
export interface EliminationPreview {
  /** The finishing place they get: "4th". */
  placeLabel: string;
  /** "EUR 42.00", or "No payout" for an unpaid place. */
  payoutText: string;
  /** True for the first elimination: adds the row "Late entry · Closes". */
  closesLateEntry: boolean;
  /** With two left: the other player becomes the winner ("Winner · Alice · EUR 98.00"). */
  winner: { name: string; payoutText: string } | null;
}

/** A player still in the tournament, with + Rebuy and Out beside them. */
export interface StillInPlayer {
  playerId: string;
  name: string;
  /** Contributions so far: "EUR 40.00 · 1 rebuy". */
  contributionText: string;
  /** What the Out popup shows for this player. */
  elimination: EliminationPreview;
}

/** Whether Add player (late entry) is possible. */
export type LateEntryState =
  | {
      /** Nobody is out: Add player opens the late-entry flow. */
      status: 'open';
    }
  | {
      /** At least one elimination is recorded: Add player is locked and explains why. */
      status: 'closed';
      /** How many eliminations are recorded, worded: "2 eliminations", "1 elimination". */
      eliminationsText: string;
    };

/** The "Still in · N" card. Absent once a winner is derived. */
export interface StillInData {
  /** N in "Still in · N". */
  count: number;
  /** "Playing for 1st–4th · next out 4th · no payout" (or "· EUR 42.00" on a paid place). */
  summary: string;
  /** Players still in, in joining order. */
  players: readonly StillInPlayer[];
  /** True with three or more left: offers "Several out in the same hand…". */
  sameHandAvailable: boolean;
  /**
   * The places the next eliminations take, best first: ["2nd", "3rd", "4th"] with four left. When
   * k players go out in one hand they take the last k of these, in the order the host sets.
   */
  nextPlaceLabels: readonly string[];
}

/** A player who is out and finished on an unpaid place, on Play's short "Out" ladder. */
export interface UnpaidFinisher {
  playerId: string;
  name: string;
  /** "5th". */
  placeLabel: string;
  /** "EUR 20.00", "EUR 40.00 · 1 rebuy". */
  contributionText: string;
  /** "No payout". */
  payoutText: string;
}

/** Everything tournament Play shows. */
export interface TournamentPlayData {
  frame: TournamentFrameData;
  /** Blinds / Rebuy / Stack. */
  terms: readonly TournamentTerm[];
  prizePool: PrizePoolData;
  /** The Still in card, or `null` once one player is left. */
  stillIn: StillInData | null;
  /** The derived winner (one player left), or `null`. A winner never completes the game. */
  winner: { playerId: string; name: string } | null;
  lateEntry: LateEntryState;
  /** Players out on unpaid places, best place first. Paid finishers sit on the prize rungs. */
  unpaidFinishers: readonly UnpaidFinisher[];
  /** "2 reserve stacks available": opens the bank view. */
  reserveText: string;
}

// ---------------------------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------------------------

/** The big status card at the top of tournament Results. */
export type FinishingStatus =
  | {
      /** More than one player is still playing. */
      kind: 'incomplete';
      /** "2/5" in the ring: eliminations recorded / needed. */
      ringText: string;
      /** Eliminations recorded, for the progress bar. */
      recorded: number;
      /** Eliminations needed for a winner (players − 1), for the progress bar. */
      needed: number;
      /** "4 still playing". */
      title: string;
      /** "Alice, Bob, Clara, Emma". */
      names: string;
      /** "2 of 5 eliminations recorded". */
      progressLabel: string;
    }
  | {
      /** One player is left. */
      kind: 'winner';
      /** "Alice wins". */
      title: string;
      /** "All 5 eliminations recorded · 6 players". */
      description: string;
    };

/** One finisher in the finishing order (the winner or someone out), best place first. */
export interface FinisherRow {
  playerId: string;
  name: string;
  /** "1st". */
  placeLabel: string;
  /** True for paid places: their badge is highlighted and the payout is in full weight. */
  paid: boolean;
  /** True for the derived winner: "Winner" under the name. */
  isWinner: boolean;
  /** "EUR 40.00 · 1 rebuy" (not shown for the winner, who reads "Winner"). */
  contributionText: string;
  /** "EUR 98.00" or "No payout". */
  payoutText: string;
}

/** Whether Calculate Payments… can run from Results. */
export type CalculateState =
  | {
      /** One player left: the primary Calculate Payments… opens the Payments step. */
      kind: 'ready';
    }
  | {
      /** Several still playing: unavailable; pressing it explains and changes nothing. */
      kind: 'blocked';
      /** "4 players": used in "4 players still playing." */
      stillPlayingText: string;
    }
  | {
      /** Completed: read-only, no calculation and no Edit order. */
      kind: 'readOnly';
    };

/** Everything tournament Results shows. */
export interface TournamentResultsData {
  phase: 'inProgress' | 'completed';
  frame: TournamentFrameData;
  status: FinishingStatus;
  /** The still-open places as one line, or `null` once there is a winner. */
  openPlaces: {
    /** "1st–4th". */
    rangeLabel: string;
    /** "Still playing · 1st 98.00 · 2nd 42.00 open". */
    description: string;
  } | null;
  /** Winner (if any) and everyone out, best place first. */
  finishers: readonly FinisherRow[];
  /** True when the order has at least one elimination and the game is In progress. */
  canEditOrder: boolean;
  calculate: CalculateState;
  /** Reopened after a completion: "Reopened · calculate Payments again when you’re done." */
  reopened: boolean;
}

// ---------------------------------------------------------------------------------------------
// Finishing order editor (a draft until saved)
// ---------------------------------------------------------------------------------------------

/** One elimination in the draft, best place first. */
export interface OrderDraftRow {
  playerId: string;
  name: string;
  /** Place in the draft: "4th". */
  placeLabel: string;
  /** "was 5th" when the draft moved them; "missed" when added in this draft; otherwise none. */
  marker: { kind: 'was'; text: string } | { kind: 'missed' } | null;
  /** Payout at the draft place: "EUR 42.00" or "No payout". */
  payoutText: string;
  /** False on the best eliminated place. */
  canMoveUp: boolean;
  /** False on the first one out. */
  canMoveDown: boolean;
  /** Spoken names of the row's controls: "Move David up to 3rd". */
  moveUpLabel: string;
  /** "Move David down to 5th". */
  moveDownLabel: string;
}

/** Where a missed elimination can go: one finishing place in the draft. */
export interface MissedSlot {
  /** Opaque key the host gets back in `onAddMissed`. */
  slotId: string;
  /** "5th". */
  placeLabel: string;
  /** "between Felix and David", "out after David (most recent)", "out before Felix", "first one out". */
  description: string;
}

/** One line of "Save the new order?" / "Back in the game?": only what changes. */
export interface OrderChangeRow {
  /** Stable key. */
  key: string;
  /** "David", "Winner", "Late entry". */
  label: string;
  /** Shown struck through before `value` (the withdrawn winner: ~~Alice~~). */
  struck?: string;
  /** "5th → 4th", "Out · 5th · no payout", "· none yet", "Opens again", "Back in (was 5th)". */
  value: string;
  /** Spoken value when it differs from what is shown: "Alice withdrawn, none yet". */
  spokenValue?: string;
}

/** Everything the finishing-order editor shows. */
export interface OrderEditorData {
  /** "Tournament · 23 Nov, 19:30". */
  context: string;
  /** The draft differs from the saved order: "Changes not saved yet", Save available. */
  hasChanges: boolean;
  /** The line above the eliminations: who is still playing, or the winner of the draft. */
  top:
    | { kind: 'stillPlaying'; rangeLabel: string; names: string }
    | { kind: 'winner'; placeLabel: string; name: string };
  /** Eliminations in the draft, best place first. */
  rows: readonly OrderDraftRow[];
  /** Add a missed elimination…: who could have been out and where; `null` when fewer than two are left. */
  missed: {
    /** Players still in the draft, in joining order. */
    candidates: readonly { playerId: string; name: string }[];
    /** Every slot, best place first. */
    slots: readonly MissedSlot[];
    /** Preselected slot (the most recent). */
    defaultSlotId: string;
  } | null;
  /** The confirmation summary: only what changes against the saved order. */
  changes: readonly OrderChangeRow[];
}

// ---------------------------------------------------------------------------------------------
// Player page: tournament sections
// ---------------------------------------------------------------------------------------------

/** The result card of a finished player (eliminated or the derived winner). */
export interface TournamentPlayerResult {
  /** "5th". */
  placeLabel: string;
  /** True for paid places. */
  paid: boolean;
  /** "Out · 5th place" or "Winner · last player left". */
  statusText: string;
  /** Payout minus contributions: "+EUR 22.00", "−EUR 20.00", "EUR 0.00". */
  balanceText: string;
  direction: 'gain' | 'loss' | 'even';
  /** "Won", "Lost", "Break-even". */
  balanceCaption: string;
  /** "EUR 42.00" or "No payout". */
  payoutText: string;
  /** "EUR 20.00". */
  contributionsText: string;
}

/** "<name> back in the game?": removes the elimination only. */
export interface BackInData {
  name: string;
  /** What changes: the player's place, shifted places, a withdrawn winner, reopened late entry, buy-ins unchanged. */
  changes: readonly OrderChangeRow[];
}

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
