/**
 * The cash player page: the result summary, final chips and every stack handed to the player with
 * its actual mix (from `play.issuances`, so rebuys and late entries appear as they are recorded).
 * Completed: read-only, with the allocated cents of the stored settlement.
 */
import { formatEur } from '@/domain/money';

import { buyInRecords } from '../corrections/shared';
import { returnToPlayData } from '../corrections/result';
import { countDraftOf, resultOf } from '../ledger';
import { formatCount } from '../../shared/numbers';
import {
  allocatedWinLoss,
  type CashAccess,
  chipValueText,
  coloredMix,
  contributionsOf,
  settledOf,
  unitsOf,
  winLoss,
} from './shared';
import type { BuyInRecord, CashPlayerView, PlayerResult } from './types';

export function buildCashPlayerView(access: CashAccess): CashPlayerView {
  const { play, rate, participant, completion } = access;
  const settled = settledOf(completion, participant.id);
  const contributions = contributionsOf(play, participant.id);
  const recorded = resultOf(play, participant.id);

  const editable = !completion;
  const buyIns: BuyInRecord[] = buyInRecords(play, participant.id, editable);

  let result: PlayerResult | null = null;
  if (recorded) {
    const units = unitsOf(recorded.mix);
    result = {
      winLoss: settled ? allocatedWinLoss(settled.balance) : winLoss(units, contributions, rate),
      chipValueText: settled ? formatEur(settled.finalResult) : chipValueText(units, rate),
      contributionsText: `−${formatEur(contributions)}`,
      unitsText: formatCount(units),
      finalChips: coloredMix(play, recorded.mix),
      correctionDraft: editable && countDraftOf(play, participant.id) !== undefined,
    };
  }

  return {
    gameId: access.game.id,
    phase: completion ? 'completed' : 'inProgress',
    playerId: participant.id,
    name: participant.name,
    result,
    countDraft: !recorded && countDraftOf(play, participant.id) !== undefined,
    buyInsTotalText: formatEur(contributions),
    buyIns,
    returnToPlay: editable ? returnToPlayData(play, participant.id, participant.name) : null,
    actions: { countFinalChips: !recorded && editable },
  };
}
