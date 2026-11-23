import { fireEvent, screen } from '@testing-library/react-native';

import { DETAILS_FIXTURES } from '@/features/details/fixtures';
import { GameDetailsView } from '@/features/details/GameDetailsView';
import type { GameDetailsData } from '@/features/details/types';

import { renderUi } from '../ui/render';

async function renderDetails(data: GameDetailsData, onViewBank?: () => void) {
  await renderUi(
    <GameDetailsView data={data} onViewBank={onViewBank} onSelectTab={jest.fn()} onBack={jest.fn()} onMore={jest.fn()} />,
  );
}

it('shows the locked cash-game setup and the In progress closing line', async () => {
  const onViewBank = jest.fn();
  await renderDetails(DETAILS_FIXTURES.cash, onViewBank);
  expect(screen.getByLabelText('Buy-in / rebuy: EUR 20.00')).toBeTruthy();
  expect(screen.getByLabelText('Cash-game rate: EUR 0.10 per chip unit')).toBeTruthy();
  expect(screen.getByLabelText('Blinds: 1 / 2 chip units')).toBeTruthy();
  expect(screen.getByText('Starting stack · 200 chip units')).toBeTruthy();
  expect(screen.getByLabelText('15 × 1 White')).toBeTruthy();
  expect(screen.getByLabelText('135 × 1 White')).toBeTruthy();
  // The locked chip set keeps its colour names readable as text, not only as chip colour.
  expect(screen.getByText('(1 · White)')).toBeTruthy();
  expect(screen.getByText('Players · 7')).toBeTruthy();
  expect(screen.getByText('Joined late')).toBeTruthy();
  expect(screen.queryByText(/Payouts/)).toBeNull();
  expect(screen.getByText('Setup is locked. To change it, use ⋯ → Return to Planning.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'View current bank & reserve' }));
  expect(onViewBank).toHaveBeenCalledTimes(1);
});

it('shows requested against used depth and configured against actual reserve', async () => {
  await renderDetails(DETAILS_FIXTURES['cash-adjusted']);
  expect(screen.getByLabelText('Starting depth: 98 BB (requested 100 BB)')).toBeTruthy();
  expect(screen.getByLabelText('Reserve at start: 1 stack (configured 3)')).toBeTruthy();
});

it('is read-only when Completed', async () => {
  await renderDetails(DETAILS_FIXTURES['cash-completed'], jest.fn());
  expect(screen.getByText('Completed')).toBeTruthy();
  expect(screen.getByLabelText('Finished: 13 Nov 2026 · 23:41')).toBeTruthy();
  expect(screen.getByText('Read-only. To change something, reopen the game from ⋯.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'View current bank & reserve' })).toBeNull();
});

it('leads a tournament with the locked payout schedule and gives chips no money value', async () => {
  await renderDetails(DETAILS_FIXTURES.tournament);
  expect(screen.getByText('Payouts · Top 2')).toBeTruthy();
  expect(screen.getByLabelText('1st place, 70%, EUR 98.00')).toBeTruthy();
  expect(screen.getByLabelText('2nd place, 30%, EUR 42.00')).toBeTruthy();
  expect(screen.getByLabelText('Chips: No chip money value')).toBeTruthy();
  expect(screen.queryByText(/per chip unit/)).toBeNull();
});
