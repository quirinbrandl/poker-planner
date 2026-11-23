import { fireEvent, screen } from '@testing-library/react-native';

import { BankReserveView } from '@/features/play/BankReserveView';
import { bankFixture, playFixture, type PlayStoryName, rebuyFixture, tournamentRebuyFixture } from '@/features/play/fixtures';
import { PlayView } from '@/features/play/PlayView';
import type { RebuyPopupData } from '@/features/play/types';

import { renderUi } from '../ui/render';

function handlers() {
  return {
    onRebuy: jest.fn(),
    onConfirmRebuy: jest.fn(),
    onCancelRebuy: jest.fn(),
    onResult: jest.fn(),
    onOpenPlayer: jest.fn(),
    onAddPlayer: jest.fn(),
    onViewBank: jest.fn(),
    onSelectTab: jest.fn(),
    onBack: jest.fn(),
    onMore: jest.fn(),
  };
}

async function renderPlay(story: PlayStoryName, rebuy: RebuyPopupData | null = null, rebuyBusy = false) {
  const calls = handlers();
  const result = await renderUi(<PlayView data={playFixture(story)} rebuy={rebuy} rebuyBusy={rebuyBusy} {...calls} />);
  return { ...calls, ...result };
}

const button = (name: string) => screen.getByRole('button', { name });

it('shows the terms, the reserve line, both groups and the total', async () => {
  const { onViewBank, onAddPlayer } = await renderPlay('normal');
  expect(screen.getByLabelText('Blinds: 1 / 2 chip units')).toBeTruthy();
  expect(screen.getByLabelText('Rebuy: 20.00 EUR')).toBeTruthy();
  expect(screen.getByLabelText('Stack: 200 chip units')).toBeTruthy();
  expect(screen.getByText('Playing · 5')).toBeTruthy();
  expect(screen.getByText('Finished playing · 1')).toBeTruthy();
  expect(screen.getByText('EUR 140.00 total contributions')).toBeTruthy();
  await fireEvent.press(button('2 reserve stacks. Bank and reserve'));
  expect(onViewBank).toHaveBeenCalledTimes(1);
  await fireEvent.press(button('Add player'));
  expect(onAddPlayer).toHaveBeenCalledTimes(1);
});

it('gives playing rows Rebuy and Count, or Resume for a count draft, for the named player', async () => {
  const { onRebuy, onResult, onOpenPlayer } = await renderPlay('normal');
  expect(button('Ben, contributed EUR 40.00, 1 rebuy')).toBeTruthy();
  expect(button('Clara, contributed EUR 20.00, Count draft')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Count for Clara' })).toBeNull();
  await fireEvent.press(button('Rebuy for Ben'));
  await fireEvent.press(button('Count for David'));
  await fireEvent.press(button('Resume count for Clara'));
  await fireEvent.press(button('Ben, contributed EUR 40.00, 1 rebuy'));
  expect(onRebuy.mock.calls).toEqual([['ben']]);
  expect(onResult.mock.calls).toEqual([['david'], ['clara']]);
  expect(onOpenPlayer.mock.calls).toEqual([['ben']]);
});

it('shows finished players with their signed balance, no Rebuy and no result tag', async () => {
  await renderPlay('mixed');
  expect(button('Alice, contributed EUR 20.00, Won +EUR 5.00, Correction draft')).toBeTruthy();
  expect(button('Felix, contributed EUR 20.00, Lost minus EUR 5.00')).toBeTruthy();
  // The word lives in the spoken name only; on screen the sign and colour say it.
  expect(screen.queryByText('Won')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Rebuy for Alice' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Rebuy for Felix' })).toBeNull();
  expect(screen.queryByText(/Result confirmed|provisional/)).toBeNull();
});

it('points to Results once everyone is counted', async () => {
  const { onSelectTab } = await renderPlay('allFinished');
  expect(screen.getByText('Playing · 0')).toBeTruthy();
  expect(screen.getByText('Everyone is counted')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^Rebuy for/ })).toBeNull();
  await fireEvent.press(button('Go to Results'));
  expect(onSelectTab).toHaveBeenCalledWith('results');
});

it('shows the actual stack and the facts in the rebuy popup; Cancel issues nothing', async () => {
  const { onConfirmRebuy, onCancelRebuy } = await renderPlay('normal', rebuyFixture('normal', 'ben'));
  expect(screen.getByText('Rebuy for Ben')).toBeTruthy();
  expect(screen.getByLabelText('Stack to hand out: 200 chip units')).toBeTruthy();
  expect(screen.getByLabelText('15 chips of value 1 (White)')).toBeTruthy();
  expect(screen.getByLabelText('1 chip of value 100 (Black)')).toBeTruthy();
  expect(screen.getByLabelText('Reserve after rebuy: 1 stack left')).toBeTruthy();
  // The price is on the issue button, not repeated as a row.
  expect(screen.queryByLabelText(/^Additional contribution/)).toBeNull();
  expect(screen.getByLabelText('New total contribution: EUR 60.00')).toBeTruthy();
  expect(screen.queryByText(/bank/i)).toBeNull();
  await fireEvent.press(button('Cancel'));
  expect(onCancelRebuy).toHaveBeenCalledTimes(1);
  expect(onConfirmRebuy).not.toHaveBeenCalled();
  await fireEvent.press(button('Issue rebuy · EUR 20.00'));
  expect(onConfirmRebuy).toHaveBeenCalledTimes(1);
});

it('issues once on a double press', async () => {
  const { onConfirmRebuy } = await renderPlay('normal', rebuyFixture('normal', 'ben'));
  await fireEvent.press(button('Issue rebuy · EUR 20.00'));
  await fireEvent.press(button('Issue rebuy · EUR 20.00'));
  expect(onConfirmRebuy).toHaveBeenCalledTimes(1);
});

it('cannot confirm or cancel while issuing', async () => {
  const calls = await renderPlay('normal', rebuyFixture('normal', 'ben'), true);
  expect(screen.getByRole('button', { name: 'Issuing…' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Issuing…' }));
  await fireEvent.press(button('Cancel'));
  expect(calls.onConfirmRebuy).not.toHaveBeenCalled();
  expect(calls.onCancelRebuy).not.toHaveBeenCalled();
});

it('keeps the reduced-coverage warning visible and needs Accept & issue; Decline issues nothing', async () => {
  const { onConfirmRebuy, onCancelRebuy } = await renderPlay('reduced', rebuyFixture('reduced', 'ben'));
  expect(screen.getByLabelText(/^Warning: 3 of 4 · Reduced blind-payment coverage\. Only 3 of the required 4/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^Issue rebuy/ })).toBeNull();
  expect(screen.getByText('More rebuys are still allowed when another stack is possible.')).toBeTruthy();
  await fireEvent.press(button('Decline'));
  expect(onCancelRebuy).toHaveBeenCalledTimes(1);
  expect(onConfirmRebuy).not.toHaveBeenCalled();
  await fireEvent.press(button('Accept & issue · EUR 20.00'));
  expect(onConfirmRebuy).toHaveBeenCalledTimes(1);
});

it('states zero coverage in words', async () => {
  await renderPlay('zero', rebuyFixture('zero', 'ben'));
  expect(screen.getByLabelText(/^Warning: 0 of 4 · No complete blind payment with separate chips/)).toBeTruthy();
  expect(screen.getByLabelText('New total contribution: EUR 80.00')).toBeTruthy();
  expect(button('Accept & issue · EUR 20.00')).toBeTruthy();
});

it('explains an impossible rebuy without any issue action', async () => {
  const { onCancelRebuy, onViewBank, onConfirmRebuy } = await renderPlay('impossible', rebuyFixture('impossible', 'ben'));
  expect(screen.getByLabelText(/^Error: Cannot issue rebuy\. No exact 200-unit stack/)).toBeTruthy();
  expect(screen.getByText('Nothing recorded. No chips or reserve consumed.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Issue|Accept/ })).toBeNull();
  await fireEvent.press(button('View bank'));
  await fireEvent.press(button('Back to Play'));
  expect(onViewBank).toHaveBeenCalledTimes(1);
  expect(onCancelRebuy).toHaveBeenCalledTimes(1);
  expect(onConfirmRebuy).not.toHaveBeenCalled();
});

it('adds extra rows such as a tournament prize pool', async () => {
  await renderPlay('normal', tournamentRebuyFixture());
  expect(screen.getByLabelText('Prize pool: EUR 140.00 → EUR 160.00')).toBeTruthy();
});

it('shows the bank per denomination and the shared reserve', async () => {
  const onBack = jest.fn();
  await renderUi(<BankReserveView data={bankFixture('normal')} backLabel="Back to Play" onBack={onBack} onMore={jest.fn()} />);
  expect(screen.getByLabelText('Bank: 1,480 chip units, 75 available chips')).toBeTruthy();
  expect(screen.getByLabelText('45 × 1 White')).toBeTruthy();
  expect(screen.getByLabelText('1 × 500 Green')).toBeTruthy();
  expect(screen.getByLabelText('Reserve: 2 of 3 stacks left')).toBeTruthy();
  expect(screen.queryByText(/can be formed now/)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Back to Play' }));
  expect(onBack).toHaveBeenCalledTimes(1);
});

it('adds what can be formed now only when corrections weakened the reserve', async () => {
  await renderUi(<BankReserveView data={bankFixture('weakened')} backLabel="Back to Play" onBack={jest.fn()} onMore={jest.fn()} />);
  expect(screen.getByLabelText('Reserve: 2 of 3 stacks left')).toBeTruthy();
  expect(screen.getByText('Only 1 can be formed now')).toBeTruthy();
});
