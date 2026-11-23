/**
 * A share of the prize pool in hundredths of a percent (basis points): 100% is 10000, 12.5% is 1250.
 * Shares are always whole numbers, so schedules are exact.
 */
export type ShareBasisPoints = number;

/** 100% in {@link ShareBasisPoints}. */
export const FULL_SHARE = 10000;

export type PayoutPresetId = 'winnerTakesAll' | 'top2' | 'top3' | 'top4' | 'top5';

/** A payout preset: English name and shares for 1st, 2nd … place. */
export interface PayoutPreset {
  readonly id: PayoutPresetId;
  readonly name: string;
  readonly shares: readonly ShareBasisPoints[];
}

/** The five presets in display order (Decision 12). */
export const PAYOUT_PRESETS: readonly PayoutPreset[] = [
  { id: 'winnerTakesAll', name: 'Winner takes all', shares: [10000] },
  { id: 'top2', name: 'Top 2', shares: [7000, 3000] },
  { id: 'top3', name: 'Top 3', shares: [5000, 3000, 2000] },
  { id: 'top4', name: 'Top 4', shares: [5000, 2500, 1500, 1000] },
  { id: 'top5', name: 'Top 5', shares: [4000, 2500, 2000, 1000, 500] },
];

/** The preset with this id. */
export function payoutPreset(id: PayoutPresetId): PayoutPreset {
  const preset = PAYOUT_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`Payouts: unknown preset ${id}.`);
  return preset;
}

/**
 * The suggested preset for a roster size: 2 players → Winner takes all, 3–6 → Top 2,
 * 7 or more → Top 3. Fewer than 2 players have no suggestion (`null`).
 */
export function suggestedPreset(playerCount: number): PayoutPresetId | null {
  if (playerCount < 2) return null;
  if (playerCount === 2) return 'winnerTakesAll';
  if (playerCount <= 6) return 'top2';
  return 'top3';
}

/**
 * Whether a preset can be used with `playerCount` players: it may not pay more places than there are
 * players. An unavailable preset "Needs N players", N being its number of places.
 */
export function isPresetAvailable(id: PayoutPresetId, playerCount: number): boolean {
  return payoutPreset(id).shares.length <= playerCount;
}

/** The preset whose shares equal `shares` exactly, place by place, or `null` for a custom schedule. */
export function matchingPreset(shares: readonly ShareBasisPoints[]): PayoutPresetId | null {
  const match = PAYOUT_PRESETS.find(
    (preset) => preset.shares.length === shares.length && preset.shares.every((share, i) => share === shares[i]),
  );
  return match ? match.id : null;
}

/** The raw text rows that picking a preset puts into the percentage fields: ["50", "30", "20"]. */
export function presetRows(id: PayoutPresetId): string[] {
  return payoutPreset(id).shares.map(sharePercentText);
}

/** A share as a plain percentage number without trailing zeros: 1250 → "12.5", 3000 → "30". */
export function sharePercentText(share: ShareBasisPoints): string {
  const sign = share < 0 ? '-' : '';
  const abs = Math.abs(share);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0').replace(/0+$/, '');
  return `${sign}${whole}${fraction ? `.${fraction}` : ''}`;
}

/** A share with a percent sign: 1250 → "12.5%". */
export function formatSharePercent(share: ShareBasisPoints): string {
  return `${sharePercentText(share)}%`;
}
