/**
 * Data contract of the cash-game Results workspace tab. Plain data only: game management fills it.
 * Every amount and count arrives formatted; the screen only chooses layout and tone from the kinds.
 */

/** The accounting status card above the player list. Drafts never count. */
export type ResultsStatus =
  /** Some players have no confirmed result yet. */
  | {
      kind: 'toCount';
      /** "5 still to count". */
      title: string;
      /** Uncounted players in joining order: "Bob, Clara, David, Emma, Felix". */
      namesText: string;
      /** Players with a confirmed result. */
      counted: number;
      /** All players. */
      total: number;
    }
  /** Everyone counted, fewer chip units than issued. */
  | {
      kind: 'missing';
      /** "1 chip unit missing". */
      title: string;
      /** "EUR 0.10 · 1,399 of 1,400 counted. Recount, or correct a result." */
      description: string;
    }
  /** Everyone counted, more chip units than issued. */
  | {
      kind: 'tooMany';
      /** "1 chip unit too many". */
      title: string;
      /** "EUR 0.10 · 1,401 of 1,400 counted. Recount, or correct a result." */
      description: string;
    }
  /** Everyone counted and the counted units equal the issued units. */
  | {
      kind: 'addsUp';
      /** "All 6 counted · 1,600 chip units". */
      description: string;
    };

/** One player row, in joining order. */
export interface ResultsPlayerRow {
  /** Participant id: passed back in callbacks. */
  id: string;
  name: string;
  /** "EUR 40.00 contribution · 1 rebuy". */
  contributionText: string;
  /**
   * `uncounted`: no result, no draft (tag Uncounted, Count chips).
   * `countDraft`: no result, a saved count draft (tag Count draft, Resume).
   * `result`: a confirmed result (signed amount, no tag unless a correction is drafted).
   */
  state: 'uncounted' | 'countDraft' | 'result';
  /** A confirmed result with an unconfirmed correction draft (tag Correction draft). */
  correctionDraft: boolean;
  /**
   * The player's win / loss for `result` rows, else `null`. In progress the exact value
   * ("+EUR 5.0025"); Completed the allocated cents ("+EUR 5.00").
   */
  result: {
    /** "+EUR 13.00", "−EUR 8.00", "EUR 0.00". */
    amountText: string;
    /** Tone and caption: Won / Lost / Break-even. */
    direction: 'gain' | 'loss' | 'even';
  } | null;
}

/** Everything the Results tab shows. */
export interface ResultsData {
  /** In progress (editable) or Completed (read-only, allocated cents). */
  phase: 'inProgress' | 'completed';
  /** "Cash game · 23 Nov, 19:30" (Completed adds " · finished 23:41"). */
  context: string;
  /** Where the top-left control leads. */
  backLabel: 'Games' | 'History';
  /** The game was reopened after Payments: shows the "calculate Payments again" line. */
  reopened: boolean;
  status: ResultsStatus;
  players: readonly ResultsPlayerRow[];
}
