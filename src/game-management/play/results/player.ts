/**
 * The cash player page: the result summary, final chips and every stack handed to the player with
 * its actual mix (from `play.issuances`, so rebuys and late entries appear as they are recorded).
 * Completed: read-only, with the allocated cents of the stored settlement.
 */
import { formatEur } from '@/domain/money';

import { countDraftOf, issuancesOf, resultOf } from '../ledger';
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

  let rebuyNumber = 0;
  const buyIns: BuyInRecord[] = issuancesOf(play, participant.id).map((issuance) => {
    const rebuy = issuance.kind === 'rebuy';
    if (rebuy) rebuyNumber += 1;
    return {
      id: issuance.id,
      kind: rebuy ? 'rebuy' : 'buyIn',
      label: rebuy ? `Rebuy ${rebuyNumber}` : 'Buy-in',
      amountText: formatEur(issuance.contribution),
      mix: coloredMix(play, issuance.mix),
      addedLater: false,
      corrected: false,
      coverageText:
        issuance.reducedCoverage !== undefined
          ? `${formatCount(issuance.reducedCoverage)} of ${formatCount(play.terms.coverage)} coverage`
          : null,
      undo: null,
    };
  });

  let result: PlayerResult | null = null;
  if (recorded) {
    const units = unitsOf(recorded.mix);
    result = {
      winLoss: settled ? allocatedWinLoss(settled.balance) : winLoss(units, contributions, rate),
      chipValueText: settled ? formatEur(settled.finalResult) : chipValueText(units, rate),
      contributionsText: `−${formatEur(contributions)}`,
      unitsText: formatCount(units),
      finalChips: coloredMix(play, recorded.mix),
      correctionDraft: false,
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
    returnToPlay: null,
    actions: { countFinalChips: !recorded && !completion },
  };
}
