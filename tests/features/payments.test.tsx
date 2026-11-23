import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { CalculateBlocked } from '@/features/payments/CalculateBlocked';
import { CalculatePaymentsDialog } from '@/features/payments/CalculatePaymentsDialog';
import { CALCULATE_FIXTURES, PAYMENTS_FIXTURES, type PaymentsFixtureName } from '@/features/payments/fixtures';
import { PaymentsView } from '@/features/payments/PaymentsView';

import { renderUi } from '../ui/render';

async function renderPayments(name: PaymentsFixtureName, backLabel: 'Games' | 'History' = 'Games') {
  const handlers = { onBack: jest.fn(), onMore: jest.fn(), onSelectTab: jest.fn(), onOpenPlayer: jest.fn() };
  await renderUi(<PaymentsView data={PAYMENTS_FIXTURES[name]} backLabel={backLabel} {...handlers} />);
  return handlers;
}

it('lists who pays whom with the total, then every balance in words', async () => {
  await renderPayments('ready');
  expect(screen.getByText('Who pays whom. The app doesn’t track payments.')).toBeTruthy();
  expect(screen.getByText('3 payments')).toBeTruthy();
  expect(screen.getByText('EUR 21.00 in total')).toBeTruthy();
  expect(screen.getByLabelText('Bob pays Clara EUR 8.00')).toBeTruthy();
  expect(screen.getByLabelText('David pays Alice EUR 7.00')).toBeTruthy();
  expect(screen.getByLabelText('Emma pays Alice EUR 6.00')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Alice, Final result EUR 33.00, Buy-ins EUR 20.00, Gets +EUR 13.00' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Bob, Final result EUR 32.00, Buy-ins EUR 40.00, Pays −EUR 8.00' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Felix, Final result EUR 20.00, Buy-ins EUR 20.00, Even EUR 0.00' })).toBeTruthy();
  expect(screen.queryByText('No payments needed')).toBeNull();
});

it('opens a player, the other tabs, the actions and the list it came from', async () => {
  const handlers = await renderPayments('two', 'History');
  expect(screen.getByText('1 payment')).toBeTruthy();
  expect(screen.getByLabelText('Bob pays Alice EUR 10.00')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: /^Bob,/ }));
  expect(handlers.onOpenPlayer).toHaveBeenCalledWith('p-1');
  await fireEvent.press(screen.getByRole('tab', { name: 'Results' }));
  expect(handlers.onSelectTab).toHaveBeenCalledWith('results');
  await fireEvent.press(screen.getByRole('button', { name: 'Game actions' }));
  expect(handlers.onMore).toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: /History/ }));
  expect(handlers.onBack).toHaveBeenCalled();
});

it('says no payments are needed when everyone broke even', async () => {
  await renderPayments('even');
  expect(screen.getByText('No payments needed')).toBeTruthy();
  expect(screen.getByText('Everyone broke even.')).toBeTruthy();
  expect(screen.queryByText(/payments$/)).toBeNull();
  expect(screen.getAllByText('Even')).toHaveLength(6);
});

it('keeps ten payments and cent amounts readable', async () => {
  await renderPayments('big');
  expect(screen.getByText('10 payments')).toBeTruthy();
  expect(screen.getByText('EUR 70.00 in total')).toBeTruthy();
  expect(screen.getByLabelText('Felix pays Grace EUR 7.10')).toBeTruthy();
  await renderPayments('cents');
  expect(screen.getByLabelText('Bob pays Alice EUR 1.26')).toBeTruthy();
  expect(screen.getByText('Final result EUR 12.51')).toBeTruthy();
});

it('shows places, payouts and buy-ins in a tournament', async () => {
  await renderPayments('tournament');
  expect(screen.getByText('5 payments')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Alice, 1st, Payout EUR 98.00, Buy-ins EUR 20.00, Gets +EUR 78.00' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Bob, 3rd, No payout, Buy-ins EUR 40.00, Pays −EUR 40.00' })).toBeTruthy();
});

describe('Calculate Payments?', () => {
  async function renderDialog(busy = false, mode: 'cash' | 'tournament' = 'cash') {
    const handlers = { onConfirm: jest.fn(), onCancel: jest.fn() };
    await renderUi(<CalculatePaymentsDialog visible data={CALCULATE_FIXTURES[mode]} busy={busy} {...handlers} />);
    return handlers;
  }

  it('confirms the count and finishing; Cancel calls nothing else', async () => {
    const { onConfirm, onCancel } = await renderDialog();
    expect(screen.getByText('Calculate Payments?')).toBeTruthy();
    expect(screen.getByLabelText('All 6 counted · 1,600 chip units')).toBeTruthy();
    expect(screen.getByText('This finishes the game. Results become read-only; you can reopen it later.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('runs at most once, and reads Calculating… while busy', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    function Host() {
      const [busy, setBusy] = useState(false);
      return (
        <CalculatePaymentsDialog
          visible
          data={CALCULATE_FIXTURES.cash}
          busy={busy}
          onConfirm={() => {
            onConfirm();
            setBusy(true);
          }}
          onCancel={onCancel}
        />
      );
    }
    await renderUi(<Host />);
    const button = screen.getByRole('button', { name: 'Calculate Payments' });
    await fireEvent.press(button);
    await fireEvent.press(button);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Calculating…' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Calculating…' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('lists the prize pool and paid places in a tournament', async () => {
    await renderDialog(false, 'tournament');
    expect(screen.getByLabelText('Alice wins · all 5 eliminations recorded')).toBeTruthy();
    expect(screen.getByLabelText('Prize pool: EUR 140.00')).toBeTruthy();
    expect(screen.getByLabelText('1st · Alice: EUR 98.00')).toBeTruthy();
  });
});

it('explains why Payments cannot be calculated yet', async () => {
  await renderUi(<CalculateBlocked reason="Find the missing chips first." />);
  expect(screen.getByText('Can’t calculate Payments yet')).toBeTruthy();
  expect(screen.getByText(/Find the missing chips first\./)).toBeTruthy();
});
