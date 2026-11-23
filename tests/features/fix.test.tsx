import { act, fireEvent, screen } from '@testing-library/react-native';

import type { ConfirmOutcome } from '@/features/count/types';
import { fixData } from '@/features/fix/fixtures';
import { FixPage } from '@/features/fix/FixPage';
import type { FixData } from '@/features/fix/types';

import { renderUi } from '../ui/render';

async function renderFix(data: FixData, operation: () => Promise<ConfirmOutcome> = async () => ({ kind: 'accepted' })) {
  const handlers = {
    onBack: jest.fn(),
    onUndo: jest.fn(operation),
    onBackToCount: jest.fn(),
    onSave: jest.fn(operation),
    onEditCount: jest.fn(),
    onReviewNewRebuy: jest.fn(),
    onFinish: jest.fn(),
  };
  await renderUi(<FixPage data={data} {...handlers} />);
  return handlers;
}

it('step 1 names the blocking rebuy and changes nothing on Back to count', async () => {
  const { onBackToCount, onUndo } = await renderFix(fixData(1));
  expect(screen.getByText('Fix Alice’s count')).toBeTruthy();
  expect(screen.getByLabelText('Step 1 of 3')).toBeTruthy();
  expect(screen.getByLabelText('Can’t save Alice’s count yet')).toBeTruthy();
  expect(screen.getByLabelText('White chip, value 1, minus 5')).toBeTruthy();
  expect(screen.getByText('Bob’s rebuy 2 is using 5 of these White chips')).toBeTruthy();
  expect(screen.getByText('Bob · Rebuy 2')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Back to count' }));
  expect(onBackToCount).toHaveBeenCalledTimes(1);
  expect(onUndo).not.toHaveBeenCalled();
});

it('step 1 undoes the rebuy only after its own popup, once', async () => {
  let finish: (outcome: ConfirmOutcome) => void = () => {};
  const { onUndo } = await renderFix(fixData(1), () => new Promise((resolve) => (finish = resolve)));
  await fireEvent.press(screen.getByRole('button', { name: 'Undo Bob’s rebuy 2…' }));
  expect(screen.getByText('Undo Bob’s rebuy 2?')).toBeTruthy();
  expect(screen.getByText('Only the record is removed. Bob keeps the chips until the new rebuy.')).toBeTruthy();
  expect(screen.getByLabelText('Bob’s contributions: EUR 60.00 → EUR 40.00')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Undo rebuy' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Undoing…' }));
  expect(onUndo).toHaveBeenCalledTimes(1);
  await act(async () => finish({ kind: 'accepted' }));
  expect(screen.queryByText('Undo Bob’s rebuy 2?')).toBeNull();
});

it('step 2 saves the retained correction through Replace result, or edits it first', async () => {
  const { onSave, onEditCount } = await renderFix(fixData(2));
  expect(screen.getByLabelText('✓ Bob’s rebuy undone')).toBeTruthy();
  expect(screen.getByText('Now save Alice’s corrected count')).toBeTruthy();
  expect(screen.getByLabelText('10 × 1 White')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Edit count first' }));
  expect(onEditCount).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Save Alice’s count…' }));
  expect(screen.getByText('Replace Alice’s result?')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(onSave).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Save Alice’s count…' }));
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Replace result' }));
  });
  expect(onSave).toHaveBeenCalledTimes(1);
});

it('step 3 asks for the new rebuy; done lists the three operations', async () => {
  const { onReviewNewRebuy } = await renderFix(fixData(3));
  expect(screen.getByText('Give Bob a new rebuy')).toBeTruthy();
  expect(screen.getByText(/Swap Bob’s chips so they match it/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Review Bob’s new rebuy…' }));
  expect(onReviewNewRebuy).toHaveBeenCalledTimes(1);

  const { onFinish } = await renderFix(fixData('done'));
  expect(screen.getByLabelText('All 3 steps done')).toBeTruthy();
  for (const line of ['Bob’s old rebuy 2 undone', 'Alice’s count saved', 'Bob got a new rebuy']) {
    expect(screen.getByLabelText(`Done: ${line}`)).toBeTruthy();
  }
  await fireEvent.press(screen.getByRole('button', { name: 'Back to Play' }));
  expect(onFinish).toHaveBeenCalledTimes(1);
});

it('fixes a result removal with the Return to play popup at step 2', async () => {
  await renderFix(fixData(2, 'result'));
  expect(screen.getByText('Fix Alice’s result')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Remove Alice’s result…' }));
  expect(screen.getByText('Alice back in the game?')).toBeTruthy();
});
