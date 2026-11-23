/**
 * The Payout schedule step's read model (C · Prize ladder): everything the step shows, ready to render.
 */
import {
  FULL_SHARE,
  formatSharePercent,
  isPresetAvailable,
  PAYOUT_PRESETS,
  payoutPreset,
  type PayoutPresetId,
  placeLabel,
  prizeAmounts,
  sharePercentText,
  suggestedPreset,
} from '@/domain/payouts';
import { formatEur } from '@/domain/money';
import type { Cents } from '@/domain/types';

import type { GameDocument } from '../core/documents';
import type { Problem } from '../core/problems';
import { MIN_PLAYERS } from './validation';
import { type PayoutStepValidation, shareFieldKey } from './payout-validation';
import type { FieldView } from './view';

export type PrizePoolView =
  /** "EUR 120.00" with "6 × EUR 20.00". */
  | { kind: 'amount'; cents: Cents; amountText: string; detail: string }
  /** No valid buy-in: show `label` ("Add a buy-in") and an Edit game settings button. */
  | { kind: 'noBuyIn'; label: string };

export interface PayoutPresetOption {
  id: PayoutPresetId;
  /** "Top 2". */
  name: string;
  /** "70 / 30%". */
  splitText: string;
  /** Carries the Suggested tag. */
  suggested: boolean;
  /** The schedule is currently this preset (check mark). */
  current: boolean;
  /** Pays no more places than there are players. */
  available: boolean;
  /** "Needs 4 players" when unavailable, else `null`. */
  unavailableReason: string | null;
}

export type PrizeAmountView =
  | { kind: 'amount'; cents: Cents; text: string }
  /** The schedule is not valid yet or there is no buy-in: show `text` ("—"). */
  | { kind: 'none'; text: string };

export interface PayoutPlaceView {
  id: string;
  /** 1-based finishing place. */
  place: number;
  /** "1st", "2nd" … for the badge. */
  placeLabel: string;
  /** The percentage field; accessible name in `shareLabel`. Same contract as every Planning field. */
  share: FieldView;
  /** "1st place share". */
  shareLabel: string;
  /** Share bar fill, 0–100 (the typed percentage, 0 while it is not a number, capped at 100). */
  barPercent: number;
  amount: PrizeAmountView;
  /** Show the remove icon: the last place while more than one exists. */
  removable: boolean;
  /** "Remove 3rd place". */
  removeLabel: string;
}

export interface PayoutTotalView {
  kind: 'exact' | 'under' | 'over' | 'incomplete';
  /** "Total 100%", "Total 95% · 5% left", "Total 105% · 5% too much", "Total 70% so far". */
  text: string;
  /** `exact` shows a check icon before the text (“✓ Total 100%”). */
  icon: 'check' | null;
  /** `ok` when exact; otherwise `warning` (amber) while editing, `error` (red) after Continue was tried. */
  tone: 'ok' | 'warning' | 'error';
}

export interface PayoutScheduleView {
  /** No schedule yet and fewer than two players: show "Add players first" with Edit players. */
  needsPlayers: boolean;
  playerCount: number;
  prizePool: PrizePoolView;
  /** The Preset button. */
  preset: {
    id: PayoutPresetId | null;
    /** The preset name or "Custom". */
    name: string;
    /** "Suggested" when this is the suggestion, "Suggested for 6 players: Top 2" otherwise, `null` without a suggestion. */
    suggestionLine: string | null;
  };
  /** The suggestion for the current player count, `null` below two players. */
  suggested: { id: PayoutPresetId; name: string } | null;
  /** The preset sheet, in display order. Under it: "Or type your own percentages on the ladder." */
  presets: readonly PayoutPresetOption[];
  /** One ladder card per paid place, 1st place first. Empty while no schedule is chosen. */
  places: readonly PayoutPlaceView[];
  addPlace: { available: boolean; /** "Can’t pay more places than players (N)." */ reason: string | null };
  /** `null` while no schedule is chosen. */
  total: PayoutTotalView | null;
  /** "Equal shares are fine. Places still come from the elimination order." when two places share a number. */
  equalSharesNote: string | null;
  /** More paid places than players: the alert and its one-tap fix (`null` fix below two players). */
  tooManyPlaces: { problem: Problem; fix: { presetId: PayoutPresetId; label: string } | null } | null;
  /** Step problems in screen order (as Continue returns them). */
  problems: readonly Problem[];
  continueAttempted: boolean;
}

export const EQUAL_SHARES_NOTE = 'Equal shares are fine. Places still come from the elimination order.';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

function totalView(check: NonNullable<PayoutStepValidation['check']>, continueAttempted: boolean): PayoutTotalView {
  const { total } = check;
  const tone = continueAttempted ? 'error' : 'warning';
  const sum = formatSharePercent(total.total);
  switch (total.kind) {
    case 'exact':
      return { kind: 'exact', text: `Total ${sum}`, icon: 'check', tone: 'ok' };
    case 'under':
      return { kind: 'under', text: `Total ${sum} · ${formatSharePercent(total.left)} left`, icon: null, tone };
    case 'over':
      return { kind: 'over', text: `Total ${sum} · ${formatSharePercent(total.excess)} too much`, icon: null, tone };
    case 'incomplete':
      return { kind: 'incomplete', text: `Total ${sum} so far`, icon: null, tone };
  }
}

export function buildPayoutScheduleView(
  game: GameDocument,
  validation: PayoutStepValidation,
  buyInCents: Cents | null,
  editedFields: readonly string[],
  continueAttempted: boolean,
): PayoutScheduleView {
  const { rows } = game.planning.payoutSchedule;
  const playerCount = game.planning.participants.length;
  const { check, presetId } = validation;
  const suggestedId = suggestedPreset(playerCount);
  const suggested = suggestedId ? { id: suggestedId, name: payoutPreset(suggestedId).name } : null;

  const poolCents = buyInCents === null ? null : buyInCents * playerCount;
  const prizePool: PrizePoolView =
    poolCents === null || buyInCents === null
      ? { kind: 'noBuyIn', label: 'Add a buy-in' }
      : {
          kind: 'amount',
          cents: poolCents,
          amountText: formatEur(poolCents),
          detail: `${playerCount} × ${formatEur(buyInCents)}`,
        };

  const amounts = validation.valid && poolCents !== null ? prizeAmounts(poolCents, validation.valid.shares) : null;
  const places: PayoutPlaceView[] = rows.map((row, index) => {
    const key = shareFieldKey(row.id);
    const edited = editedFields.includes(key);
    const share = check?.fields[index].share ?? null;
    const label = placeLabel(index + 1);
    return {
      id: row.id,
      place: index + 1,
      placeLabel: label,
      share: {
        text: row.shareText,
        problem: validation.problems.find((p) => p.field === key) ?? null,
        edited,
        revealed: edited || continueAttempted,
      },
      shareLabel: `${label} place share`,
      barPercent: share === null ? 0 : Math.min(100, Math.max(0, (share * 100) / FULL_SHARE)),
      amount: amounts ? { kind: 'amount', cents: amounts[index], text: formatEur(amounts[index]) } : { kind: 'none', text: '—' },
      removable: index === rows.length - 1 && rows.length > 1,
      removeLabel: `Remove ${label} place`,
    };
  });

  const tooManyProblem = validation.problems.find((p) => p.code === 'tooManyPaidPlaces') ?? null;
  const atLimit = rows.length >= playerCount;

  return {
    needsPlayers: rows.length === 0 && playerCount < MIN_PLAYERS,
    playerCount,
    prizePool,
    preset: {
      id: presetId,
      name: presetId ? payoutPreset(presetId).name : 'Custom',
      suggestionLine: !suggested
        ? null
        : suggested.id === presetId
          ? 'Suggested'
          : `Suggested for ${plural(playerCount, 'player')}: ${suggested.name}`,
    },
    suggested,
    presets: PAYOUT_PRESETS.map((preset) => {
      const available = isPresetAvailable(preset.id, playerCount);
      return {
        id: preset.id,
        name: preset.name,
        splitText: `${preset.shares.map(sharePercentText).join(' / ')}%`,
        suggested: preset.id === suggestedId,
        current: preset.id === presetId,
        available,
        unavailableReason: available ? null : `Needs ${preset.shares.length} players`,
      };
    }),
    places,
    addPlace: {
      available: !atLimit,
      reason: atLimit ? `Can’t pay more places than players (${playerCount}).` : null,
    },
    total: check ? totalView(check, continueAttempted) : null,
    equalSharesNote: check?.hasEqualShares ? EQUAL_SHARES_NOTE : null,
    tooManyPlaces: tooManyProblem
      ? {
          problem: tooManyProblem,
          fix: suggested ? { presetId: suggested.id, label: `Use ${suggested.name}` } : null,
        }
      : null,
    problems: validation.problems,
    continueAttempted,
  };
}
