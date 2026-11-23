import { act, fireEvent, screen } from '@testing-library/react-native';

import {
  backInData,
  editorData,
  fixtureGame,
  forgottenRebuyData,
  ORDERS,
  playData,
  prizePoolAfterOneMore,
  resultsData,
} from '@/features/tournament/fixtures';
import { OrderEditor } from '@/features/tournament/OrderEditor';
import { BackInDialog } from '@/features/tournament/PlayerSections';
import { forgottenRebuyTournamentRows, prizePoolChangeRow } from '@/features/tournament/rows';
import { TournamentPlay } from '@/features/tournament/TournamentPlay';
import { TournamentResults } from '@/features/tournament/TournamentResults';
import type { OrderEditorData, TournamentActionResult } from '@/features/tournament/types';

import { renderUi } from '../ui/render';

const accepted = async (): Promise<TournamentActionResult> => ({ status: 'accepted' });
const label = (name: string) => screen.getByLabelText(name);
const button = (name: string) => screen.getByRole('button', { name });

async function renderPlay(order: readonly string[], record: () => Promise<TournamentActionResult> = accepted) {
  const handlers = {
    onSelectTab: jest.fn(),
    onBack: jest.fn(),
    onMore: jest.fn(),
    onRebuy: jest.fn(),
    onRecordElimination: jest.fn(record),
    onRecordSameHand: jest.fn(record),
    onRejected: jest.fn(),
    onAddPlayer: jest.fn(),
    onOpenPlayer: jest.fn(),
    onOpenBank: jest.fn(),
  };
  await renderUi(<TournamentPlay data={playData(fixtureGame(order))} {...handlers} />);
  return handlers;
}

describe('Play · Standings', () => {
  it('shows open rungs, everyone still in and an open Add player before anyone is out', async () => {
    const { onAddPlayer, onOpenBank } = await renderPlay(ORDERS.open);
    expect(label('Prize pool EUR 140.00, 6 buy-ins + 1 rebuy')).toBeTruthy();
    expect(label('1st place, 70%, EUR 98.00, open')).toBeTruthy();
    expect(label('2nd place, 30%, EUR 42.00, open')).toBeTruthy();
    expect(screen.getByText('Still in · 6')).toBeTruthy();
    expect(screen.getByText('Next out: 6th')).toBeTruthy();
    expect(screen.queryByText('Late entry closed: someone is out.')).toBeNull();
    await fireEvent.press(button('Add player'));
    expect(onAddPlayer).toHaveBeenCalledTimes(1);
    await fireEvent.press(button('2 reserve stacks. Bank and reserve details'));
    expect(onOpenBank).toHaveBeenCalledTimes(1);
  });

  it('locks Add player once someone is out and explains why without opening late entry', async () => {
    const { onAddPlayer } = await renderPlay(ORDERS.midway);
    // The lock says it on screen; the reason is the spoken hint, and a toast when pressed.
    expect(screen.queryByText('Late entry closed: someone is out.')).toBeNull();
    const add = button('Add player');
    expect(add).toBeDisabled();
    expect(add.props.accessibilityHint).toBe(
      'Late entry closes once anyone is out (2 eliminations recorded). It opens again only if every elimination is undone.',
    );
    await fireEvent.press(add);
    expect(onAddPlayer).not.toHaveBeenCalled();
    expect(screen.getByText('Late entry closed: someone is out.')).toBeTruthy();
  });

  it('lists unpaid finishers on the Out ladder with spoken place and payout', async () => {
    const { onOpenPlayer } = await renderPlay(ORDERS.bubble);
    expect(screen.getByText('Next out: 3rd')).toBeTruthy();
    await fireEvent.press(button('Felix, 6th place, no payout, EUR 20.00'));
    expect(onOpenPlayer).toHaveBeenCalledWith('felix');
    expect(button('Emma, 4th place, no payout, EUR 20.00')).toBeTruthy();
  });

  it('shows heads-up for a paid place and, with a winner, fills the rungs and drops the Still in card', async () => {
    await renderPlay(ORDERS.heads);
    expect(screen.getByText('Next out: 2nd · EUR 42.00')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Several out in the same hand…' })).toBeNull();

    const { onOpenPlayer } = await renderPlay(ORDERS.winner);
    expect(screen.queryByText(/Still in/)).toBeNull();
    expect(screen.getByText('Alice wins')).toBeTruthy();
    expect(button('Alice wins. Go to Results')).toBeTruthy();
    await fireEvent.press(button('1st place, 70%, EUR 98.00, Alice, winner'));
    expect(onOpenPlayer).toHaveBeenCalledWith('alice');
    expect(button('2nd place, 30%, EUR 42.00, Clara')).toBeTruthy();
  });

  it('previews the first elimination with its place, no payout and late entry closing; Cancel records nothing', async () => {
    const { onRecordElimination } = await renderPlay(ORDERS.open);
    await fireEvent.press(button('Clara is out…'));
    expect(screen.getByText('Clara is out?')).toBeTruthy();
    expect(label('Finishing place: 6th')).toBeTruthy();
    expect(label('Payout: No payout')).toBeTruthy();
    expect(label('Late entry: Closes')).toBeTruthy();
    expect(screen.queryByLabelText(/^Winner/)).toBeNull();
    await fireEvent.press(button('Cancel'));
    expect(screen.queryByText('Clara is out?')).toBeNull();
    expect(onRecordElimination).not.toHaveBeenCalled();
  });

  it('previews a paid place and the derived winner with two left, and records once', async () => {
    let finish: (result: TournamentActionResult) => void = () => {};
    const { onRecordElimination } = await renderPlay(ORDERS.heads, () => new Promise((resolve) => (finish = resolve)));
    await fireEvent.press(button('Clara is out…'));
    expect(screen.getByText(/Clara finishes/)).toBeTruthy();
    expect(screen.getByText(/Alice is the last player left and wins\./)).toBeTruthy();
    expect(label('Payout: EUR 42.00')).toBeTruthy();
    expect(label('Winner: Alice · EUR 98.00')).toBeTruthy();
    expect(screen.queryByLabelText('Late entry: Closes')).toBeNull();
    const confirm = button('Clara is out');
    await fireEvent.press(confirm);
    await fireEvent.press(confirm);
    expect(onRecordElimination).toHaveBeenCalledTimes(1);
    expect(onRecordElimination).toHaveBeenCalledWith('clara');
    await act(async () => finish({ status: 'accepted' }));
    expect(screen.queryByText('Clara is out?')).toBeNull();
  });

  it('offers Rebuy instead from the Out popup', async () => {
    const { onRebuy, onRecordElimination } = await renderPlay(ORDERS.midway);
    await fireEvent.press(button('Bob is out…'));
    await fireEvent.press(button('Rebuy for Bob instead'));
    expect(onRebuy).toHaveBeenCalledWith('bob');
    expect(onRecordElimination).not.toHaveBeenCalled();
    expect(screen.queryByText('Bob is out?')).toBeNull();
  });

  it('reports a rejected elimination and closes the popup', async () => {
    const { onRejected } = await renderPlay(ORDERS.midway, async () => ({ status: 'rejected', message: 'Bob is already out.' }));
    await fireEvent.press(button('Bob is out…'));
    await act(async () => {
      fireEvent.press(button('Bob is out'));
    });
    expect(onRejected).toHaveBeenCalledWith('Bob is already out.');
    expect(screen.queryByText('Bob is out?')).toBeNull();
  });

  it('records several out in the same hand in the order the host sets', async () => {
    const { onRecordSameHand } = await renderPlay(ORDERS.midway);
    await fireEvent.press(button('Bob is out…'));
    await fireEvent.press(screen.getAllByRole('button', { name: 'Several out in the same hand…' }).at(-1)!);
    expect(screen.getByText('Out in the same hand')).toBeTruthy();
    expect(button('Record eliminations')).toBeDisabled();
    await fireEvent.press(screen.getByRole('checkbox', { name: /Clara/ }));
    expect(label('3rd place, Bob')).toBeTruthy();
    expect(label('4th place, Clara')).toBeTruthy();
    await fireEvent.press(button('Move Clara up'));
    expect(label('3rd place, Clara')).toBeTruthy();
    expect(label('4th place, Bob')).toBeTruthy();
    await act(async () => {
      fireEvent.press(button('Record 2 eliminations'));
    });
    expect(onRecordSameHand).toHaveBeenCalledWith(['clara', 'bob']);
  });

  it('keeps one player in when ticking players out in one hand', async () => {
    await renderPlay(ORDERS.heads.slice(0, 3));
    await fireEvent.press(button('Several out in the same hand…'));
    await fireEvent.press(screen.getByRole('checkbox', { name: /Alice/ }));
    await fireEvent.press(screen.getByRole('checkbox', { name: /Bob/ }));
    expect(screen.getByRole('checkbox', { name: /Clara/ })).toBeDisabled();
  });
});

async function renderResults(game = fixtureGame(ORDERS.midway)) {
  const handlers = {
    onSelectTab: jest.fn(),
    onBack: jest.fn(),
    onMore: jest.fn(),
    onEditOrder: jest.fn(),
    onOpenPlayer: jest.fn(),
    onCalculatePayments: jest.fn(),
  };
  await renderUi(<TournamentResults data={resultsData(game)} {...handlers} />);
  return handlers;
}

describe('Results', () => {
  it('shows the incomplete order and blocks Calculate Payments with an explanation that changes nothing', async () => {
    const { onCalculatePayments, onEditOrder } = await renderResults();
    expect(screen.getByText('4 still playing')).toBeTruthy();
    expect(label('2 of 5 eliminations recorded')).toBeTruthy();
    expect(label('1st–4th place, still playing')).toBeTruthy();
    expect(button('David, 5th place, EUR 20.00, no payout')).toBeTruthy();
    expect(screen.getByText('Record eliminations until one player is left.')).toBeTruthy();
    const calculate = button('Calculate Payments…');
    expect(calculate).toBeDisabled();
    await fireEvent.press(calculate);
    expect(onCalculatePayments).not.toHaveBeenCalled();
    expect(screen.getByText('4 players still playing. Record eliminations until one player is left.')).toBeTruthy();
    await fireEvent.press(button('Edit order'));
    expect(onEditOrder).toHaveBeenCalledTimes(1);
  });

  it('makes Calculate Payments available once a winner is derived', async () => {
    const { onCalculatePayments } = await renderResults(fixtureGame(ORDERS.winner, { reopened: true }));
    expect(screen.getByText('Alice wins')).toBeTruthy();
    expect(button('Alice, 1st place, winner, payout EUR 98.00')).toBeTruthy();
    expect(button('Clara, 2nd place, EUR 20.00, payout EUR 42.00')).toBeTruthy();
    expect(screen.getByText('Reopened')).toBeTruthy();
    await fireEvent.press(button('Calculate Payments…'));
    expect(onCalculatePayments).toHaveBeenCalledTimes(1);
  });

  it('is read-only when Completed', async () => {
    await renderResults(fixtureGame(ORDERS.winner, { phase: 'completed' }));
    expect(screen.queryByRole('button', { name: 'Edit order' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Calculate Payments…' })).toBeNull();
    expect(screen.getByText('Read-only. To change something, reopen the game from ⋯.')).toBeTruthy();
  });
});

async function renderEditor(data: OrderEditorData, save: () => Promise<TournamentActionResult> = accepted) {
  const handlers = {
    onMoveUp: jest.fn(),
    onMoveDown: jest.fn(),
    onUndoElimination: jest.fn(),
    onAddMissed: jest.fn(),
    onSave: jest.fn(save),
    onDiscard: jest.fn(),
    onRejected: jest.fn(),
  };
  await renderUi(<OrderEditor data={data} {...handlers} />);
  return handlers;
}

describe('Finishing order editor', () => {
  const game = fixtureGame(ORDERS.midway);
  const edited = editorData(game, { order: ['felix', 'emma', 'david'], added: ['emma'] });

  it('reports row intentions and marks moved and missed rows', async () => {
    const { onMoveUp, onMoveDown, onUndoElimination } = await renderEditor(edited);
    expect(screen.getByText('Unsaved')).toBeTruthy();
    expect(label('David, 4th place, was 5th, no payout')).toBeTruthy();
    expect(label('Emma, 5th place, missed, added now, no payout')).toBeTruthy();
    expect(button('Move David up to 3rd')).toBeDisabled();
    expect(button('Move Felix down to 7th')).toBeDisabled();
    await fireEvent.press(button('Move David up to 3rd'));
    expect(onMoveUp.mock.calls).toEqual([]);
    await fireEvent.press(button('Move Emma up to 4th'));
    await fireEvent.press(button('Move Emma down to 6th'));
    await fireEvent.press(button('Undo Felix’s elimination'));
    expect(onMoveUp).toHaveBeenCalledWith('emma');
    expect(onMoveDown).toHaveBeenCalledWith('emma');
    expect(onUndoElimination).toHaveBeenCalledWith('felix');
  });

  it('adds a missed elimination at the chosen place', async () => {
    const { onAddMissed } = await renderEditor(editorData(game, { order: game.order, added: [] }));
    expect(button('Save order…')).toBeDisabled();
    await fireEvent.press(button('Add a missed elimination…'));
    await fireEvent.press(screen.getByRole('radio', { name: /Emma/ }));
    await fireEvent.press(screen.getByRole('radio', { name: /5th · between Felix and David/ }));
    await fireEvent.press(button('Add to order'));
    expect(onAddMissed).toHaveBeenCalledWith({ playerId: 'emma', slotId: '1' });
  });

  it('lists only what changes, saves once, and Cancel in the summary saves nothing', async () => {
    let finish: (result: TournamentActionResult) => void = () => {};
    const { onSave } = await renderEditor(edited, () => new Promise((resolve) => (finish = resolve)));
    await fireEvent.press(button('Save order…'));
    expect(screen.getByText('Save the new order?')).toBeTruthy();
    expect(label('David: 5th → 4th')).toBeTruthy();
    expect(label('Emma: Out · 5th · no payout')).toBeTruthy();
    expect(screen.queryByLabelText(/^Felix:/)).toBeNull();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Cancel' }).at(-1)!);
    expect(onSave).not.toHaveBeenCalled();
    await fireEvent.press(button('Save order…'));
    const confirm = button('Save order');
    await fireEvent.press(confirm);
    await fireEvent.press(confirm);
    expect(onSave).toHaveBeenCalledTimes(1);
    await act(async () => finish({ status: 'accepted' }));
    expect(screen.queryByText('Save the new order?')).toBeNull();
  });

  it('summarises undoing every elimination: places back in and late entry reopening', async () => {
    await renderEditor(editorData(game, { order: [], added: [] }));
    await fireEvent.press(button('Save order…'));
    expect(label('David: Back in (was 5th)')).toBeTruthy();
    expect(label('Felix: Back in (was 6th)')).toBeTruthy();
    expect(label('Late entry: Opens again')).toBeTruthy();
  });

  it('asks before discarding changes; Keep editing discards nothing', async () => {
    const { onDiscard } = await renderEditor(edited);
    await fireEvent.press(button('Cancel'));
    expect(screen.getByText('Discard order changes?')).toBeTruthy();
    await fireEvent.press(button('Keep editing'));
    expect(onDiscard).not.toHaveBeenCalled();
    await fireEvent.press(button('Cancel'));
    await fireEvent.press(button('Discard'));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('leaves without asking when nothing changed', async () => {
    const { onDiscard } = await renderEditor(editorData(game, { order: game.order, added: [] }));
    expect(screen.getByText('Nothing changed yet.')).toBeTruthy();
    await fireEvent.press(button('Cancel'));
    expect(screen.queryByText('Discard order changes?')).toBeNull();
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});

describe('Player page sections', () => {
  it('shows a withdrawn winner in Back in the game? and cannot confirm while busy', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const data = backInData(fixtureGame(ORDERS.winner), 'clara');
    await renderUi(<BackInDialog visible data={data} busy onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByText('Clara back in the game?')).toBeTruthy();
    expect(screen.getByText('Removes Clara’s elimination. To buy back in, give Clara a rebuy afterwards.')).toBeTruthy();
    expect(label('Clara: Back in (was 2nd)')).toBeTruthy();
    expect(label('Winner: Alice withdrawn, none yet')).toBeTruthy();
    expect(label('Buy-ins: EUR 20.00 · unchanged')).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button').at(-1)!);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('builds the prize pool and payout rows for the shared popups', () => {
    const game = fixtureGame(ORDERS.midway);
    expect(prizePoolChangeRow(prizePoolAfterOneMore(game))).toEqual({
      label: 'Prize pool',
      value: 'EUR 140.00 → EUR 160.00',
    });
    expect(forgottenRebuyTournamentRows(forgottenRebuyData(game, 'felix')).map((row) => `${row.label}: ${row.value}`)).toEqual([
      'Prize pool: EUR 140.00 → EUR 160.00',
      'Payouts: 98.00 / 42.00 → 112.00 / 48.00',
      'Felix: Stays out · 6th',
    ]);
  });
});
