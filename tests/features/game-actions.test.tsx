import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';

import { ACTION_GAMES, type ActionGameName, RETURN_TO_PLANNING_FIXTURES } from '@/features/game/actions/fixtures';
import { type GameActionsViewProps, GameActionsView } from '@/features/game/actions/GameActionsView';
import { clearsParts, keepsParts } from '@/features/game/actions/texts';
import type { GameAction } from '@/features/game/actions/types';

import { renderUi } from '../ui/render';

type Callbacks = Pick<GameActionsViewProps, 'onDelete' | 'onReopen' | 'onReturnToPlanning'>;

/** Keeps the sheet and confirmation state like a container; confirming sets busy. */
function Host({ game, callbacks, data = RETURN_TO_PLANNING_FIXTURES.cash }: { game: ActionGameName; callbacks: Callbacks; data?: GameActionsViewProps['returnToPlanning'] }) {
  const [sheet, setSheet] = useState(true);
  const [confirmation, setConfirmation] = useState<GameAction | null>(null);
  const [busy, setBusy] = useState<GameAction | null>(null);
  const wrap = (action: GameAction, callback?: () => void) =>
    callback
      ? () => {
          callback();
          setBusy(action);
        }
      : undefined;
  return (
    <GameActionsView
      game={ACTION_GAMES[game]}
      sheetVisible={sheet}
      onCloseSheet={() => setSheet(false)}
      confirmation={confirmation}
      onChoose={(action) => {
        setSheet(false);
        setConfirmation(action);
      }}
      onCancelConfirmation={() => setConfirmation(null)}
      busy={busy}
      onDelete={wrap('delete', callbacks.onDelete)!}
      onReopen={wrap('reopen', callbacks.onReopen)}
      onReturnToPlanning={wrap('returnToPlanning', callbacks.onReturnToPlanning)}
      returnToPlanning={data}
    />
  );
}

function all(): Required<Callbacks> {
  return { onDelete: jest.fn(), onReopen: jest.fn(), onReturnToPlanning: jest.fn() };
}

const sheetLabels = () =>
  ['Return to Planning…', 'Reopen game…', 'Delete game…'].filter((name) => screen.queryByRole('button', { name }));

it('offers only Delete in Planning', async () => {
  await renderUi(<Host game="planning" callbacks={all()} />);
  expect(screen.getByText('Planning · Cash game · 25 Nov, 19:30')).toBeTruthy();
  expect(sheetLabels()).toEqual(['Delete game…']);
});

it('offers Return to Planning and Delete In progress', async () => {
  await renderUi(<Host game="inProgress" callbacks={all()} />);
  expect(sheetLabels()).toEqual(['Return to Planning…', 'Delete game…']);
  expect(screen.getByText('Clear play and hand out new stacks.')).toBeTruthy();
});

it('offers Reopen and Delete on a Completed game, never Return to Planning', async () => {
  await renderUi(<Host game="completed" callbacks={all()} />);
  expect(sheetLabels()).toEqual(['Reopen game…', 'Delete game…']);
  expect(screen.getByText('Change results or buy-ins, then calculate again.')).toBeTruthy();
});

it('leaves out actions the host does not supply yet', async () => {
  await renderUi(<Host game="completed" callbacks={{ onDelete: jest.fn() }} />);
  expect(sheetLabels()).toEqual(['Delete game…']);
});

it('Return to Planning? lists real counts, keeps and the chip warning; Cancel calls nothing', async () => {
  const callbacks = all();
  await renderUi(<Host game="inProgress" callbacks={callbacks} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Return to Planning…' }));
  expect(await screen.findByText('Return to Planning?')).toBeTruthy();
  expect(screen.getByLabelText('Clears: 2 rebuys · 6 results · all handed-out stacks')).toBeTruthy();
  expect(screen.getByLabelText('Keeps: 6 players · buy-ins · settings')).toBeTruthy();
  expect(screen.getByText('Collect all chips. You’ll hand out new stacks after Start.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByText('Return to Planning?')).toBeNull());
  expect(callbacks.onReturnToPlanning).not.toHaveBeenCalled();
  expect(callbacks.onDelete).not.toHaveBeenCalled();
});

it('omits zero parts from what Return to Planning clears', () => {
  expect(clearsParts({ eliminations: 0, rebuys: 0, results: 6 })).toEqual(['6 results', 'all handed-out stacks']);
  expect(clearsParts({ eliminations: 0, rebuys: 0, results: 0 })).toEqual(['all handed-out stacks']);
  expect(clearsParts({ eliminations: 2, rebuys: 1, results: 0 })).toEqual(['2 eliminations', '1 rebuy', 'all handed-out stacks']);
  expect(keepsParts({ players: 6, mode: 'tournament' })).toEqual(['6 players', 'buy-ins', 'settings', 'payout schedule']);
  expect(keepsParts({ players: 1, mode: 'cash' })).toEqual(['1 player', 'buy-ins', 'settings']);
});

it('confirms Return to Planning once; a second press while busy does nothing', async () => {
  const callbacks = all();
  await renderUi(<Host game="tournamentInProgress" callbacks={callbacks} data={RETURN_TO_PLANNING_FIXTURES.tournament} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Return to Planning…' }));
  expect(await screen.findByLabelText('Clears: 2 eliminations · 1 rebuy · all handed-out stacks')).toBeTruthy();
  const confirm = screen.getByRole('button', { name: 'Return to Planning' });
  await fireEvent.press(confirm);
  await fireEvent.press(confirm);
  expect(callbacks.onReturnToPlanning).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Returning…' })).toBeDisabled();
});

it('Reopen this game? keeps records; Cancel calls nothing', async () => {
  const callbacks = all();
  await renderUi(<Host game="completed" callbacks={callbacks} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Reopen game…' }));
  expect(
    await screen.findByText('Results and buy-ins stay. These Payments stop being final. Calculate them again when you’re done.'),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByText('Reopen this game?')).toBeNull());
  expect(callbacks.onReopen).not.toHaveBeenCalled();
});

it('Reopen this game? words the tournament variant and reopens once', async () => {
  const callbacks = all();
  await renderUi(<Host game="tournamentCompleted" callbacks={callbacks} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Reopen game…' }));
  expect(await screen.findByText('Places and buy-ins stay. These Payments stop being final.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Reopen game' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Reopening…' }));
  expect(callbacks.onReopen).toHaveBeenCalledTimes(1);
});

it('Delete this game? identifies the game and what stays; deletes once', async () => {
  const callbacks = all();
  await renderUi(<Host game="completed" callbacks={callbacks} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Delete game…' }));
  expect(await screen.findByText('Delete this game?')).toBeTruthy();
  expect(screen.getByText('Completed · Cash game')).toBeTruthy();
  expect(screen.getByText('Alice, Bob, Clara, David, Emma, Felix')).toBeTruthy();
  expect(screen.getByText('23 Nov 2026 · 19:30')).toBeTruthy();
  expect(screen.getByText('Everything recorded in this game is deleted. This can’t be undone.')).toBeTruthy();
  expect(screen.getByText('Saved players and chip set templates stay.')).toBeTruthy();
  const confirm = screen.getByRole('button', { name: 'Delete game' });
  await fireEvent.press(confirm);
  await fireEvent.press(confirm);
  expect(callbacks.onDelete).toHaveBeenCalledTimes(1);
  expect(callbacks.onReopen).not.toHaveBeenCalled();
});
