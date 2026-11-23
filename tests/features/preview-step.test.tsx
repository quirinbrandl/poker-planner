import { act, fireEvent, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import { PREVIEW_FIXTURES, type PreviewFixtureName } from '@/features/planning/preview/fixtures';
import { type PreviewFrameProps, PreviewStep } from '@/features/planning/preview/PreviewStep';
import type { StartResult } from '@/game-management';

import { renderUi } from '../ui/render';

/** Stand-in for the wizard frame: content, the footer note and the primary action. */
function Frame({ children, footerNote, primaryAction }: PreviewFrameProps) {
  return (
    <View>
      {children}
      {footerNote ? <Text>{footerNote}</Text> : null}
      {primaryAction}
    </View>
  );
}

async function renderPreview(name: PreviewFixtureName, start: (accept: unknown) => Promise<StartResult> = async () => ({ status: 'accepted' })) {
  const handlers = {
    onOpenStep: jest.fn(),
    onStart: jest.fn(start),
    onStarted: jest.fn(),
    onStartRejected: jest.fn(),
  };
  await renderUi(<PreviewStep data={PREVIEW_FIXTURES[name]} renderFrame={(frame) => <Frame {...frame} />} {...handlers} />);
  return handlers;
}

const label = (name: string) => screen.getByLabelText(name);

it('shows one starting stack as labelled towers, the game terms and the whole bank', async () => {
  await renderPreview('feasible');
  expect(label('1 starting stack: 200 chip units')).toBeTruthy();
  expect(label('15 chips of value 1 (Grey)')).toBeTruthy();
  expect(label('3 chips of value 25 (Blue)')).toBeTruthy();
  expect(label('1 chip of value 100 (Green)')).toBeTruthy();
  expect(label('Blinds, 1 / 2, 100 BB depth')).toBeTruthy();
  expect(label('Cash value, EUR 20.00, EUR 0.10 / unit')).toBeTruthy();
  expect(label('Reserve, 3 stacks, Shared in bank')).toBeTruthy();
  expect(screen.getByText('Unissued bank (374 chips)')).toBeTruthy();
  expect(screen.getByText('Covers 3 reserved stacks')).toBeTruthy();
  expect(label('110 × 1 Grey')).toBeTruthy();
  expect(label('44 × 100 Green')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Start cash game' })).toBeEnabled();
});

it('marks an adjusted depth and a reduced reserve in place and keeps Start available', async () => {
  await renderPreview('both');
  expect(label('Depth adjusted from 100 BB to 98 BB')).toBeTruthy();
  expect(label('Blinds, 1 / 2, 98 BB, adjusted from 100 BB')).toBeTruthy();
  expect(label('Reserve, 1 stack, adjusted from 3, 1 of 3 possible')).toBeTruthy();
  expect(screen.getByText('Covers 1 reserved stack')).toBeTruthy();
  expect(screen.queryByText(/before starting|No valid distribution/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Start cash game' })).toBeEnabled();
});

it('shows a rounded small blind and the zero-reserve wording', async () => {
  await renderPreview('rounded-sb');
  expect(label('Blinds, 2 / 5, Rounded SB · 100 BB')).toBeTruthy();
  await renderPreview('zero-reserve');
  expect(label('Reserve, 0 stacks, 0 stacks')).toBeTruthy();
  expect(screen.getByText('0 reserved')).toBeTruthy();
});

it('shows the prize pool and the payouts card in a tournament; its edit icon opens Payout schedule', async () => {
  const { onOpenStep } = await renderPreview('tournament');
  expect(label('Prize pool, EUR 120.00, No chip money value')).toBeTruthy();
  expect(screen.getByText('Payouts · Top 2')).toBeTruthy();
  expect(label('1st place, 70%, EUR 84.00')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Edit payout schedule' }));
  expect(onOpenStep).toHaveBeenCalledWith('payouts');
  expect(screen.getByRole('button', { name: 'Start tournament' })).toBeEnabled();
});

it('lists setup problems with direct fixes and disables Start', async () => {
  const { onOpenStep } = await renderPreview('incomplete');
  expect(screen.getByText('Setup incomplete')).toBeTruthy();
  expect(screen.getByText('Enter the buy-in per player.')).toBeTruthy();
  expect(screen.getByText('Fix setup inputs before starting.')).toBeTruthy();
  const start = screen.getByRole('button', { name: 'Start game' });
  expect(start).toBeDisabled();
  await fireEvent.press(start);
  expect(screen.queryByText('Start cash game?')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Edit chip set' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Edit game settings' }));
  expect(onOpenStep.mock.calls).toEqual([['chipSet'], ['settings']]);
});

it('offers Fix payouts for a tournament payout blocker', async () => {
  const { onOpenStep } = await renderPreview('tournament-incomplete');
  expect(screen.getByText('Total is 95%, needs 100%.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Fix payouts' }));
  expect(onOpenStep).toHaveBeenCalledWith('payouts');
  expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled();
});

it('names the shortfall when no distribution exists and links every recovery step', async () => {
  const { onOpenStep } = await renderPreview('no-valid-coverage');
  expect(screen.getByText('No valid distribution')).toBeTruthy();
  expect(screen.getByText('Not enough blind-paying chips')).toBeTruthy();
  expect(screen.getByText('No valid distribution for current setup.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled();
  for (const name of ['Edit chip set', 'Edit game settings', 'Edit players (6)']) {
    await fireEvent.press(screen.getByRole('button', { name }));
  }
  expect(onOpenStep.mock.calls).toEqual([['chipSet'], ['settings'], ['players']]);
});

it('summarises the cash game in the Start popup; Cancel starts nothing', async () => {
  const { onStart } = await renderPreview('both');
  await fireEvent.press(screen.getByRole('button', { name: 'Start cash game' }));
  expect(screen.getByText('Start cash game?')).toBeTruthy();
  expect(screen.getByText('Records initial stacks for 6 players and locks setup.')).toBeTruthy();
  expect(label('Each starting stack: 196 chip units')).toBeTruthy();
  expect(label('Blinds: 1 / 2 · 98 BB (requested 100 BB)')).toBeTruthy();
  expect(label('Buy-in: EUR 20.00 (EUR 0.102 / unit)')).toBeTruthy();
  expect(label('Reserve: 1 of 3 stacks')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByText('Start cash game?')).toBeNull();
  expect(onStart).not.toHaveBeenCalled();
});

it('summarises the prize pool and payouts in the Start tournament popup', async () => {
  await renderPreview('tournament');
  await fireEvent.press(screen.getByRole('button', { name: 'Start tournament' }));
  expect(screen.getByText('Records initial stacks for 6 players and locks setup and payouts.')).toBeTruthy();
  expect(label('Blinds: 1 / 2 · 100 BB')).toBeTruthy();
  expect(label('Prize pool: EUR 120.00 (6 × 20.00)')).toBeTruthy();
  expect(label('Payouts: 70% / 30%')).toBeTruthy();
  expect(label('Reserve: 3 stacks')).toBeTruthy();
});

it('starts once with the previewed depth and reserve', async () => {
  let finish: (result: StartResult) => void = () => {};
  const { onStart, onStarted } = await renderPreview('both', () => new Promise((resolve) => (finish = resolve)));
  await fireEvent.press(screen.getByRole('button', { name: 'Start cash game' }));
  const confirm = screen.getAllByRole('button', { name: 'Start cash game' }).at(-1)!;
  await fireEvent.press(confirm);
  await fireEvent.press(confirm);
  expect(onStart).toHaveBeenCalledTimes(1);
  expect(onStart).toHaveBeenCalledWith({ depthBb: 98, reserveStacks: 1 });
  await act(async () => finish({ status: 'accepted' }));
  expect(onStarted).toHaveBeenCalledTimes(1);
});

it('closes the popup and reports a rejected Start', async () => {
  const { onStartRejected, onStarted } = await renderPreview('feasible', async () => ({
    status: 'rejected',
    reason: { code: 'previewChanged', message: 'The preview changed.' },
  }));
  await fireEvent.press(screen.getByRole('button', { name: 'Start cash game' }));
  await act(async () => {
    fireEvent.press(screen.getAllByRole('button', { name: 'Start cash game' }).at(-1)!);
  });
  expect(onStartRejected).toHaveBeenCalledWith('The preview changed.');
  expect(onStarted).not.toHaveBeenCalled();
  expect(screen.queryByText('Start cash game?')).toBeNull();
});
