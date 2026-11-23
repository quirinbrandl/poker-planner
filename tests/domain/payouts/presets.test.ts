import {
  PAYOUT_PRESETS,
  formatSharePercent,
  isPresetAvailable,
  matchingPreset,
  presetRows,
  suggestedPreset,
  validatePayoutSchedule,
} from '@/domain/payouts';

describe('payout presets', () => {
  it('offers the five presets with their exact shares', () => {
    expect(PAYOUT_PRESETS.map((p) => [p.name, p.shares.map(formatSharePercent).join(' / ')])).toEqual([
      ['Winner takes all', '100%'],
      ['Top 2', '70% / 30%'],
      ['Top 3', '50% / 30% / 20%'],
      ['Top 4', '50% / 25% / 15% / 10%'],
      ['Top 5', '40% / 25% / 20% / 10% / 5%'],
    ]);
    for (const preset of PAYOUT_PRESETS) {
      expect(validatePayoutSchedule(presetRows(preset.id), 99).schedule).toEqual({ valid: true, shares: preset.shares });
    }
  });

  it.each([
    [0, null],
    [1, null],
    [2, 'winnerTakesAll'],
    [3, 'top2'],
    [6, 'top2'],
    [7, 'top3'],
    [30, 'top3'],
  ])('suggests for %i players: %s', (players, preset) => {
    expect(suggestedPreset(players)).toBe(preset);
  });

  it('marks presets with more places than players unavailable', () => {
    const available = (players: number) => PAYOUT_PRESETS.filter((p) => isPresetAvailable(p.id, players)).map((p) => p.id);
    expect(available(1)).toEqual(['winnerTakesAll']);
    expect(available(2)).toEqual(['winnerTakesAll', 'top2']);
    expect(available(3)).toEqual(['winnerTakesAll', 'top2', 'top3']);
    expect(available(4)).toEqual(['winnerTakesAll', 'top2', 'top3', 'top4']);
    expect(available(5)).toEqual(['winnerTakesAll', 'top2', 'top3', 'top4', 'top5']);
  });

  it('recognises a schedule equal to a preset, otherwise it is custom', () => {
    expect(matchingPreset([5000, 3000, 2000])).toBe('top3');
    expect(matchingPreset([10000])).toBe('winnerTakesAll');
    expect(matchingPreset([5000, 3000, 2000, 0])).toBeNull();
    expect(matchingPreset([6000, 4000])).toBeNull();
    expect(matchingPreset([])).toBeNull();
    const typed = validatePayoutSchedule(['50,00', '30', '20.0'], 5);
    expect(typed.schedule.valid && matchingPreset(typed.schedule.shares)).toBe('top3');
  });
});
