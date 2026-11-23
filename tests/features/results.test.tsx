import { fireEvent, screen } from '@testing-library/react-native';

import { RESULTS_FIXTURES, type ResultsFixtureName } from '@/features/results/fixtures';
import { ResultsView } from '@/features/results/ResultsView';

import { renderUi } from '../ui/render';

async function renderResults(name: ResultsFixtureName) {
  const handlers = {
    onSelectTab: jest.fn(),
    onBack: jest.fn(),
    onMore: jest.fn(),
    onOpenPlayer: jest.fn(),
    onCount: jest.fn(),
    onCalculatePayments: jest.fn(),
  };
  await renderUi(<ResultsView data={RESULTS_FIXTURES[name]} {...handlers} />);
  return handlers;
}

const calculate = () => screen.getByRole('button', { name: 'Calculate Payments…' });

it('names who is still to count and offers Count / Resume by row state', async () => {
  const { onCount, onOpenPlayer } = await renderResults('incomplete');
  expect(screen.getByLabelText('5 still to count. Bob, Clara, David, Emma, Felix')).toBeTruthy();
  expect(screen.getByLabelText('1 of 6 players counted')).toBeTruthy();
  // Only open work is tagged; an uncounted row says so in its spoken name.
  expect(screen.queryByText('Uncounted')).toBeNull();
  expect(screen.getByRole('button', { name: 'Bob, contributed EUR 40.00, 1 rebuy, Not counted yet' })).toBeTruthy();
  expect(screen.getByText('Count draft')).toBeTruthy();
  expect(screen.getByLabelText('Won +EUR 5.00')).toBeTruthy();
  expect(screen.queryByText('Won')).toBeNull();
  expect(screen.queryByText('Result confirmed')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Count for Bob' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Resume count for Clara' }));
  expect(onCount.mock.calls).toEqual([['p2'], ['p3']]);
  expect(screen.queryByRole('button', { name: /for Alice/ })).toBeNull();
  await fireEvent.press(screen.getByText('Alice'));
  expect(onOpenPlayer).toHaveBeenCalledWith('p1');
});

it.each([
  ['incomplete', 'Count everyone first.'],
  ['missing', 'Find the missing chips first.'],
  ['too-many', 'Fix the extra chips first.'],
] as const)('keeps Calculate Payments unavailable in %s and explains its one reason', async (name, reason) => {
  const { onCalculatePayments } = await renderResults(name);
  expect(calculate()).toBeDisabled();
  expect(screen.getByText(reason)).toBeTruthy();
  expect(screen.queryByText('Can’t calculate Payments yet.')).toBeNull();
  await fireEvent.press(calculate());
  expect(onCalculatePayments).not.toHaveBeenCalled();
  expect(screen.getByLabelText(`Error: Can’t calculate Payments yet.. ${reason}`)).toBeTruthy();
});

it('shows a missing or extra chip unit with its money and counts', async () => {
  await renderResults('missing');
  expect(screen.getByLabelText('1 chip unit missing. EUR 0.10 · 1,399 of 1,400 counted. Recount, or correct a result.')).toBeTruthy();
  await renderResults('too-many');
  expect(screen.getByText('1 chip unit too many')).toBeTruthy();
});

it('makes Calculate Payments the primary action only when everything adds up', async () => {
  const { onCalculatePayments } = await renderResults('balanced');
  expect(screen.getByLabelText('Everything adds up. All 6 counted · 1,600 chip units')).toBeTruthy();
  expect(calculate()).toBeEnabled();
  await fireEvent.press(calculate());
  expect(onCalculatePayments).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Lost minus EUR 8.00')).toBeTruthy();
  expect(screen.getByLabelText('Break-even EUR 0.00')).toBeTruthy();
});

it('adds the reopened line under Calculate Payments', async () => {
  await renderResults('reopened');
  expect(screen.getByText('Reopened · calculate Payments again when you’re done.')).toBeTruthy();
});

it('shows Completed results read-only', async () => {
  await renderResults('completed');
  expect(screen.getByText('Completed')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Calculate Payments…' })).toBeNull();
  expect(screen.queryByRole('button', { name: /^Count for|Resume/ })).toBeNull();
});

it('shows exact sub-cent amounts and a correction draft tag', async () => {
  await renderResults('sub-cent');
  expect(screen.getByText('+EUR 5.0025')).toBeTruthy();
  expect(screen.queryByText(/provisional/i)).toBeNull();
  await renderResults('drafts');
  expect(screen.getByText('Correction draft')).toBeTruthy();
});
