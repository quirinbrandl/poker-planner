import { act, fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { ConfirmOutcome } from '@/features/count/types';
import { PLAYER_FIXTURES, type PlayerFixtureName } from '@/features/player/fixtures';
import { PlayerPage } from '@/features/player/PlayerPage';

import { renderUi } from '../ui/render';

async function renderPlayer(name: PlayerFixtureName, operation: () => Promise<ConfirmOutcome> = async () => ({ kind: 'accepted' })) {
  const handlers = {
    onBack: jest.fn(),
    onCountFinalChips: jest.fn(),
    onRebuy: jest.fn(),
    onCorrectResult: jest.fn(),
    onCorrectMix: jest.fn(),
    onAddForgottenRebuy: jest.fn(),
    onUndoRebuy: jest.fn(operation),
    onReturnToPlay: jest.fn(operation),
  };
  await renderUi(<PlayerPage data={PLAYER_FIXTURES[name]} {...handlers} />);
  return handlers;
}

it('shows a result: win / loss, final chips with Correct, buy-ins and Return to play', async () => {
  const { onCorrectResult, onAddForgottenRebuy } = await renderPlayer('alice');
  expect(screen.getByLabelText('Won +EUR 5.00')).toBeTruthy();
  expect(screen.queryByText('Won')).toBeNull();
  expect(screen.getByLabelText('Chips: EUR 25.00')).toBeTruthy();
  expect(screen.getByLabelText('Buy-ins: −EUR 20.00')).toBeTruthy();
  expect(screen.getByText('Final chips · 250')).toBeTruthy();
  expect(screen.getByLabelText('0 × 500 Green')).toBeTruthy();
  // The total is in the summary already; the section heading does not repeat it.
  expect(screen.getAllByText('Buy-ins')).toHaveLength(2);
  expect(screen.queryByText('Buy-ins · EUR 20.00')).toBeNull();
  expect(screen.queryByRole('button', { name: /Count final chips|Rebuy for/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Correct Alice’s final chips' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Add forgotten rebuy for Alice' }));
  expect(onCorrectResult).toHaveBeenCalledTimes(1);
  expect(onAddForgottenRebuy).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Return to play…' })).toBeTruthy();
});

it('tags rebuys and offers Correct mix and Undo on each', async () => {
  const { onCorrectMix } = await renderPlayer('tags');
  expect(screen.getByText('corrected')).toBeTruthy();
  expect(screen.getAllByText('added later')).toHaveLength(2);
  expect(screen.getByText('3 of 4 coverage')).toBeTruthy();
  expect(screen.getByText('0 of 4 coverage')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Correct mix of rebuy 2' }));
  expect(onCorrectMix).toHaveBeenCalledWith('p4-r2');
  expect(screen.getByRole('button', { name: 'Resume correction of David’s final chips' })).toBeTruthy();
});

it('offers Count chips and Rebuy while still playing', async () => {
  const { onCountFinalChips, onRebuy } = await renderPlayer('bob');
  expect(screen.getByText('Buy-ins · EUR 40.00')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Count chips' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Rebuy for Bob' }));
  expect(onCountFinalChips).toHaveBeenCalledTimes(1);
  expect(onRebuy).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Return to play…' })).toBeNull();
  await renderPlayer('clara-draft');
  expect(screen.getByRole('button', { name: 'Resume count' })).toBeTruthy();
  expect(screen.getByText('Count draft')).toBeTruthy();
});

it('undoes a rebuy only after its popup; Cancel undoes nothing', async () => {
  const { onUndoRebuy } = await renderPlayer('bob');
  await fireEvent.press(screen.getByRole('button', { name: 'Undo rebuy 1' }));
  expect(screen.getByText('Undo Bob’s rebuy 1?')).toBeTruthy();
  expect(screen.getByLabelText('Bob’s contributions: EUR 40.00 → EUR 20.00')).toBeTruthy();
  expect(screen.getByText('Only the record is removed. Take the chips back if Bob already has them.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(onUndoRebuy).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Undo rebuy 1' }));
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Undo rebuy' }));
  });
  expect(onUndoRebuy).toHaveBeenCalledWith('p2-r1');
  expect(screen.queryByText('Undo Bob’s rebuy 1?')).toBeNull();
});

it('returns a player to play once, after showing the chips to hand back', async () => {
  let finish: (outcome: ConfirmOutcome) => void = () => {};
  const { onReturnToPlay } = await renderPlayer('alice', () => new Promise((resolve) => (finish = resolve)));
  await fireEvent.press(screen.getByRole('button', { name: 'Return to play…' }));
  expect(screen.getByText('Alice back in the game?')).toBeTruthy();
  expect(screen.getByText('Hand Alice back these chips:')).toBeTruthy();
  expect(screen.getAllByLabelText('5 × 25 Blue').length).toBeGreaterThan(0);
  expect(screen.getByLabelText('Final result: Removed')).toBeTruthy();
  expect(screen.getByLabelText('Buy-ins: EUR 20.00 · unchanged')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Back in the game' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Saving…' }));
  expect(onReturnToPlay).toHaveBeenCalledTimes(1);
  await act(async () => finish({ kind: 'accepted' }));
  expect(screen.queryByText('Alice back in the game?')).toBeNull();
});

it('says there is nothing to hand back for a zero result', async () => {
  await renderPlayer('zero');
  await fireEvent.press(screen.getByRole('button', { name: 'Return to play…' }));
  expect(screen.getByText('Felix cashed out with no chips, so there’s nothing to hand back.')).toBeTruthy();
});

it('shows a Completed player read-only', async () => {
  await renderPlayer('completed');
  expect(screen.getByText('Completed')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Correct|Undo|Add forgotten|Return to play|Rebuy for/ })).toBeNull();
});

it('renders the extra summary and section slots', async () => {
  await renderUi(
    <PlayerPage
      data={PLAYER_FIXTURES.alice}
      onBack={jest.fn()}
      onCountFinalChips={jest.fn()}
      onRebuy={jest.fn()}
      onCorrectResult={jest.fn()}
      onCorrectMix={jest.fn()}
      onAddForgottenRebuy={jest.fn()}
      onUndoRebuy={jest.fn()}
      onReturnToPlay={jest.fn()}
      summaryExtra={<Text>Place 2nd</Text>}
      sectionsExtra={<Text>Back in the game…</Text>}
    />,
  );
  expect(screen.getByText('Place 2nd')).toBeTruthy();
  expect(screen.getByText('Back in the game…')).toBeTruthy();
});
