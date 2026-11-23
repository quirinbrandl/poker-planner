import { act, fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { CountEditor, type CountEditorDialog } from '@/features/count/CountEditor';
import { countEditorData, resultConfirmation, reviewFixtureCount } from '@/features/count/fixtures';
import type { ConfirmOutcome } from '@/features/count/types';
import type { Cents } from '@/domain/types';

import { renderUi } from '../ui/render';

const CONTRIBUTIONS = 2000 as Cents;

/** Parent stand-in: owns the raw text and uses the fixture review, like game management will. */
function Harness({
  texts: initial,
  kind,
  onConfirm,
  onLeave,
  dialog,
}: {
  texts: string[];
  kind?: 'count' | 'correction';
  onConfirm: () => Promise<ConfirmOutcome>;
  onLeave: () => void;
  dialog?: CountEditorDialog;
}) {
  const [texts, setTexts] = useState(initial);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [problem, setProblem] = useState<{ title: string; message: string } | null>(null);
  const data = countEditorData('Clara', texts, CONTRIBUTIONS, { kind, errors, problem });
  return (
    <CountEditor
      data={data}
      initialDialog={dialog}
      onChangeQuantity={(value, text) => setTexts((old) => old.map((t, i) => (data.entries[i].value === value ? text : t)))}
      onSetRemainingToZero={() => setTexts((old) => old.map((t) => (t === '' ? '0' : t)))}
      onLeave={onLeave}
      onReview={async () => {
        const review = reviewFixtureCount(data, CONTRIBUTIONS);
        setErrors(review.errors);
        setProblem(review.problem);
        return review.outcome;
      }}
      onConfirm={onConfirm}
    />
  );
}

async function renderCount(texts: string[], options: { kind?: 'count' | 'correction'; dialog?: CountEditorDialog; confirm?: () => Promise<ConfirmOutcome> } = {}) {
  const handlers = { onConfirm: jest.fn(options.confirm ?? (async (): Promise<ConfirmOutcome> => ({ kind: 'accepted' }))), onLeave: jest.fn() };
  await renderUi(<Harness texts={texts} kind={options.kind} dialog={options.dialog} {...handlers} />);
  return handlers;
}

const quantity = () => screen.getByLabelText('Quantity (chips)');
const tab = (name: RegExp) => screen.getByRole('tab', { name });

it('shows one denomination at a time and tells a blank from an explicit zero', async () => {
  await renderCount(['12', '', '0', '', '']);
  expect(screen.getByText('Clara · Final chips')).toBeTruthy();
  expect(screen.getByText('Draft')).toBeTruthy();
  expect(screen.getByLabelText('1 chip unit, White (1 of 5)')).toBeTruthy();
  expect(tab(/^1 chip unit, White, 12 chips$/)).toBeSelected();
  expect(tab(/^5 chip units, Red, quantity not entered$/)).toBeTruthy();
  expect(tab(/^25 chip units, Blue, 0 chips$/)).toBeTruthy();
  // The tray shows the difference: a blank is a dash, an explicit zero is ×0.
  expect(screen.getByText('×12')).toBeTruthy();
  expect(screen.getByText('×0')).toBeTruthy();
  expect(screen.getAllByText('–')).toHaveLength(3);
});

it('navigates with Next, Previous and the picker, keeping raw text', async () => {
  await renderCount(['12', '', '', '', '']);
  await fireEvent.press(screen.getByRole('button', { name: 'Next denomination' }));
  expect(screen.getByLabelText('5 chip units, Red (2 of 5)')).toBeTruthy();
  await fireEvent.changeText(quantity(), '3a');
  expect(tab(/^5 chip units, Red, invalid quantity$/)).toBeTruthy();
  expect(screen.getByText('Check entry')).toBeTruthy();
  await fireEvent.press(tab(/^500 chip units/));
  expect(screen.getByText('Back to first')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Previous denomination' }));
  await fireEvent.press(tab(/^5 chip units/));
  expect(quantity().props.value).toBe('3a');
});

it('steps the quantity by one and updates the live totals', async () => {
  await renderCount(['12', '', '', '', '']);
  expect(screen.getByLabelText('12 chip units so far, EUR 1.20')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Increase 1 chip unit, White by one' }));
  expect(quantity().props.value).toBe('13');
  await fireEvent.press(screen.getByRole('button', { name: 'Next denomination' }));
  expect(screen.getByRole('button', { name: 'Decrease 5 chip units, Red by one' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Increase 5 chip units, Red by one' }));
  expect(screen.getByLabelText('18 chip units so far, EUR 1.80')).toBeTruthy();
  // The win / loss appears only once every quantity is entered.
  expect(screen.queryByLabelText(/^Win \/ loss/)).toBeNull();
});

it('fills only blanks with Rest is 0, then shows the win / loss', async () => {
  await renderCount(['15', '2', '5', '1', '']);
  await fireEvent.press(screen.getByRole('button', { name: 'Rest is 0: set remaining quantities to zero' }));
  expect(tab(/^1 chip unit, White, 15 chips$/)).toBeTruthy();
  expect(tab(/^500 chip units, Green, 0 chips$/)).toBeTruthy();
  expect(screen.getByLabelText('Win / loss: +EUR 5.00')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Rest is 0: set remaining quantities to zero' })).toBeDisabled();
});

it('marks missing quantities on review, keeps entries and confirms nothing', async () => {
  const { onConfirm } = await renderCount(['12', '', '', '', '']);
  await fireEvent.press(screen.getByRole('button', { name: 'Review result' }));
  expect(screen.getByText('Enter a quantity, including zero.')).toBeTruthy();
  expect(screen.getByLabelText('5 chip units, Red (2 of 5)')).toBeTruthy();
  expect(screen.queryByText('Confirm Clara’s result?')).toBeNull();
  expect(onConfirm).not.toHaveBeenCalled();
  await fireEvent.press(tab(/^1 chip unit/));
  expect(quantity().props.value).toBe('12');
});

it('reviews the result with the counted mix and four facts; Cancel records nothing', async () => {
  const { onConfirm } = await renderCount(['15', '2', '5', '1', '0']);
  await fireEvent.press(screen.getByRole('button', { name: 'Review result' }));
  expect(screen.getByText('Confirm Clara’s result?')).toBeTruthy();
  expect(screen.getByLabelText('0 × 500 Green')).toBeTruthy();
  expect(screen.getByLabelText('Final chip units: 250')).toBeTruthy();
  // The live summary behind the popup shows the same facts.
  expect(screen.getByLabelText('Chip value: EUR 25.00')).toBeTruthy();
  expect(screen.getByLabelText('250 chip units, EUR 25.00')).toBeTruthy();
  expect(screen.getAllByLabelText('All contributions: EUR 20.00')).toHaveLength(2);
  expect(screen.getAllByLabelText('Win / loss: +EUR 5.00')).toHaveLength(2);
  expect(screen.queryByText(/provisional/i)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByText('Confirm Clara’s result?')).toBeNull();
  expect(onConfirm).not.toHaveBeenCalled();
});

it('confirms once while busy', async () => {
  let finish: (outcome: ConfirmOutcome) => void = () => {};
  const { onConfirm } = await renderCount(['15', '2', '5', '1', '0'], {
    dialog: { kind: 'confirm', confirmation: resultConfirmation('Clara', [15, 2, 5, 1, 0], CONTRIBUTIONS) },
    confirm: () => new Promise((resolve) => (finish = resolve)),
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm result' }));
  const saving = screen.getByRole('button', { name: 'Saving…' });
  expect(saving).toBeDisabled();
  await fireEvent.press(saving);
  expect(onConfirm).toHaveBeenCalledTimes(1);
  await act(async () => finish({ kind: 'accepted' }));
});

it('shows the zero-chips notice and the replace wording', async () => {
  await renderCount(['0', '0', '0', '0', '0'], {
    dialog: { kind: 'confirm', confirmation: resultConfirmation('Clara', [0, 0, 0, 0, 0], CONTRIBUTIONS) },
  });
  expect(screen.getByText(/This records a result with no chips/)).toBeTruthy();
  await renderCount(['10', '3', '5', '1', '0'], {
    kind: 'correction',
    dialog: { kind: 'confirm', confirmation: resultConfirmation('Alice', [10, 3, 5, 1, 0], CONTRIBUTIONS, 'replace') },
  });
  expect(screen.getByText('Correction draft')).toBeTruthy();
  expect(screen.getByText('Replace Alice’s result?')).toBeTruthy();
  expect(screen.getByText('Replaces the previous return once. This corrects records, not chips.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Replace result' })).toBeTruthy();
});

it('blocks more chips than the game has with nothing saved and the entry kept', async () => {
  const { onConfirm } = await renderCount(['136', '0', '0', '0', '0']);
  await fireEvent.press(screen.getByRole('button', { name: 'Review result' }));
  expect(screen.getByText('More chips than the game has')).toBeTruthy();
  expect(screen.getByLabelText('White chip, value 1, +1')).toBeTruthy();
  expect(screen.getByText('That’s 1 White chip more than the game has. Check the quantities you entered.')).toBeTruthy();
  expect(screen.getByText('Nothing was saved.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Back to editing' }));
  expect(screen.queryByText('More chips than the game has')).toBeNull();
  expect(quantity().props.value).toBe('136');
  expect(onConfirm).not.toHaveBeenCalled();
});

it('leaves the count for now with Back, without confirming', async () => {
  const { onLeave, onConfirm } = await renderCount(['12', '', '', '', '']);
  expect(screen.queryByRole('button', { name: 'Leave count for now' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(onLeave).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
});
