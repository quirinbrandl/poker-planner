import { fireEvent, screen } from '@testing-library/react-native';

import { AddPlayerView } from '@/features/entry/AddPlayerView';
import { ADD_PLAYER_DATA, entryFixture, type EntryStoryName } from '@/features/entry/fixtures';
import type { EntryNotice } from '@/features/entry/types';

import { renderUi } from '../ui/render';

async function renderEntry({
  selectedId = null,
  story,
  busy = false,
  notice = null,
}: { selectedId?: string | null; story?: EntryStoryName; busy?: boolean; notice?: EntryNotice | null } = {}) {
  const calls = {
    onSelect: jest.fn(),
    onSearch: jest.fn(),
    onReview: jest.fn(),
    onConfirmEntry: jest.fn(),
    onCancelReview: jest.fn(),
    onViewBank: jest.fn(),
    onNewPlayer: jest.fn(),
    onBack: jest.fn(),
    onMore: jest.fn(),
  };
  await renderUi(
    <AddPlayerView
      data={ADD_PLAYER_DATA}
      selectedId={selectedId}
      search=""
      notice={notice}
      review={story ? entryFixture(story, 'Nora') : null}
      busy={busy}
      {...calls}
    />,
  );
  return calls;
}

const button = (name: string) => screen.getByRole('button', { name });

it('stages a saved player; players in the game are listed after them, not selectable', async () => {
  const { onSelect } = await renderEntry();
  expect(screen.getByLabelText('Search saved names')).toBeTruthy();
  expect(screen.queryByRole('radio', { name: /Alice/ })).toBeNull();
  expect(screen.getByLabelText('Alice, already in this game')).toBeTruthy();
  expect(screen.getAllByLabelText(/, already in this game$/)).toHaveLength(6);
  expect(screen.getAllByRole('radio')).toHaveLength(2);
  await fireEvent.press(screen.getByLabelText('Alice, already in this game'));
  await fireEvent.press(screen.getByRole('radio', { name: /Nora/ }));
  expect(onSelect.mock.calls).toEqual([['sp-nora']]);
});

it('asks for a choice before Review entry', async () => {
  const { onReview } = await renderEntry();
  await fireEvent.press(button('Review entry'));
  expect(onReview).not.toHaveBeenCalled();
  expect(screen.getByText('Choose a saved player, or create a new one, to review their entry.')).toBeTruthy();
});

it('reviews the staged choice and opens the new-name editor separately', async () => {
  const { onReview, onNewPlayer } = await renderEntry({ selectedId: 'sp-nora' });
  expect(screen.getByRole('radio', { name: /Nora/ })).toBeChecked();
  await fireEvent.press(button('Review entry'));
  await fireEvent.press(button('New player'));
  expect(onReview).toHaveBeenCalledTimes(1);
  expect(onNewPlayer).toHaveBeenCalledTimes(1);
});

it('shows the stack and reserve after entry, with the price on the add button; Cancel adds nobody', async () => {
  const { onConfirmEntry, onCancelReview } = await renderEntry({ selectedId: 'sp-nora', story: 'normal' });
  expect(screen.getByText('Add Nora')).toBeTruthy();
  expect(screen.getByLabelText('Stack to hand out: 200 chip units')).toBeTruthy();
  expect(screen.getByLabelText('3 chips of value 25 (Blue)')).toBeTruthy();
  expect(screen.getByLabelText('Reserve after entry: 1 stack left')).toBeTruthy();
  expect(screen.queryByLabelText(/^Initial contribution/)).toBeNull();
  expect(screen.queryByText(/total contribution/i)).toBeNull();
  await fireEvent.press(button('Cancel'));
  expect(onCancelReview).toHaveBeenCalledTimes(1);
  expect(onConfirmEntry).not.toHaveBeenCalled();
  await fireEvent.press(button('Add Nora · EUR 20.00'));
  await fireEvent.press(button('Add Nora · EUR 20.00'));
  expect(onConfirmEntry).toHaveBeenCalledTimes(1);
});

it('cannot add twice while the entry is being recorded', async () => {
  const { onConfirmEntry } = await renderEntry({ selectedId: 'sp-nora', story: 'normal', busy: true });
  await fireEvent.press(button('Adding…'));
  expect(onConfirmEntry).not.toHaveBeenCalled();
});

it.each<[EntryStoryName, RegExp]>([
  ['reduced', /covers only 3 of the required 4 payments of each blind\. Late arrivals need full coverage/],
  ['zero', /covers only 0 of the required 4 payments/],
  ['impossible', /No exact 200-unit stack can be formed/],
  ['shortage', /the bank holds only 180 chip units/],
])('blocks a %s entry with no accept or fallback action', async (story, reason) => {
  const { onCancelReview, onViewBank, onConfirmEntry } = await renderEntry({ selectedId: 'sp-nora', story });
  expect(screen.getByText('Cannot add Nora')).toBeTruthy();
  expect(screen.getByLabelText(reason)).toBeTruthy();
  expect(screen.getByText('Nora has not joined. No contribution recorded; chips and reserve unchanged.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Add player|Add Nora|Accept|issue/ })).toBeNull();
  await fireEvent.press(button('View bank'));
  await fireEvent.press(button('Back to player selection'));
  expect(onViewBank).toHaveBeenCalledTimes(1);
  expect(onCancelReview).toHaveBeenCalledTimes(1);
  expect(onConfirmEntry).not.toHaveBeenCalled();
});

it('keeps the choice and says nobody joined after a cancelled review', async () => {
  await renderEntry({ selectedId: 'sp-nora', notice: { tone: 'info', message: 'Nora has not joined.' } });
  expect(screen.getByRole('radio', { name: /Nora/ })).toBeChecked();
  expect(screen.getByLabelText('Note: Nora has not joined.')).toBeTruthy();
});
