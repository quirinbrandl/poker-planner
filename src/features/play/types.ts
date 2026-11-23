/**
 * Display contracts of the cash-game Play workspace, the rebuy popup and the bank and reserve view.
 * Plain data only: game management computes every value and wording (see `@/game-management`);
 * the screens only show it. The workspace adds the context line and the back label.
 */
import type { BankReserveScreenView, PlayScreenView } from '@/game-management';

export type {
  DisplayChip,
  ExtraFact,
  FinishedPlayerRow,
  HandoutStack,
  IssueBlockReason,
  PlayingPlayerRow,
  RebuyPopupData,
  ReducedCoverage,
  ReserveAfter,
} from '@/game-management';

/** Everything the Play workspace of an In progress cash game shows. */
export interface PlayData extends PlayScreenView {
  /** "Cash game · 13 Nov, 19:30". */
  context: string;
  /** Where the top-left control leads. */
  backLabel: 'Games' | 'History';
}

/** What the Bank & reserve view shows. */
export interface BankReserveData extends BankReserveScreenView {
  /** "Cash game · 13 Nov, 19:30". */
  context: string;
}
