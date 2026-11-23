import { act, fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import type { ConfirmOutcome } from '@/features/count/types';
import { mixEditorData, reviewFixtureMix } from '@/features/rebuy-mix/fixtures';
import { RebuyMixEditor } from '@/features/rebuy-mix/RebuyMixEditor';
import type { MixAcceptance, RebuyMixEditorData } from '@/features/rebuy-mix/types';

import { renderUi } from '../ui/render';

/** Parent stand-in: owns the raw text and uses the fixture review. */
function Harness({
  texts: initial,
  kind = 'forgotten',
  onConfirm,
}: {
  texts: string[];
  kind?: 'forgotten' | 'correct';
  onConfirm: (acceptance: MixAcceptance) => Promise<ConfirmOutcome>;
}) {
  const [texts, setTexts] = useState(initial);
  const [problem, setProblem] = useState<RebuyMixEditorData['problem']>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const data = mixEditorData(kind === 'correct' ? 'Bob' : 'Alice', texts, {
    kind,
    rebuyNumber: kind === 'correct' ? 1 : undefined,
    resultStays: kind !== 'correct',
    problem,
    errors,
  });
  return (
    <RebuyMixEditor
      data={data}
      onChangeQuantity={(value, text) => setTexts((old) => old.map((t, i) => (data.entries[i].value === value ? text : t)))}
      onSetRemainingToZero={() => setTexts((old) => old.map((t) => (t === '' ? '0' : t)))}
      onLeave={jest.fn()}
      onReview={async () => {
        const review = reviewFixtureMix(data);
        setProblem(review.problem);
        setErrors(review.errors);
        return review.outcome;
      }}
      onConfirm={onConfirm}
    />
  );
}

async function renderMix(texts: string[], kind?: 'forgotten' | 'correct', confirm?: (a: MixAcceptance) => Promise<ConfirmOutcome>) {
  const onConfirm = jest.fn(confirm ?? (async (): Promise<ConfirmOutcome> => ({ kind: 'accepted' })));
  await renderUi(<Harness texts={texts} kind={kind} onConfirm={onConfirm} />);
  return { onConfirm };
}

const review = () => fireEvent.press(screen.getByRole('button', { name: 'Review rebuy' }));

it('shows the instruction line and the bar toward 200 as quantities change', async () => {
  await renderMix(['15', '2', '', '', '']);
  expect(screen.getByText('Alice · Forgotten rebuy')).toBeTruthy();
  expect(screen.getByText('Enter the chips Alice actually got. They must add up to 200. Alice’s result stays.')).toBeTruthy();
  expect(screen.getByText('175 to go')).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: /^25 chip units/ }));
  await fireEvent.changeText(screen.getByLabelText('Quantity (chips)'), '3');
  await fireEvent.press(screen.getByRole('tab', { name: /^100 chip units/ }));
  await fireEvent.changeText(screen.getByLabelText('Quantity (chips)'), '1');
  expect(screen.getByText('200 so far · enter the rest, even if 0')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Set remaining quantities to zero' }));
  expect(screen.getByText('Exactly 200 ✓')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Quantity (chips)'), '2');
  expect(screen.getByText('100 over')).toBeTruthy();
});

it('rejects a wrong total on review with the entries kept and no popup', async () => {
  const { onConfirm } = await renderMix(['15', '2', '2', '1', '0']);
  await review();
  expect(screen.getByLabelText('Error: 175 chip units, not 200.. Check the quantities you entered.')).toBeTruthy();
  expect(screen.queryByText('Add Alice’s forgotten rebuy?')).toBeNull();
  expect(onConfirm).not.toHaveBeenCalled();
});

it('adds an ordinary forgotten rebuy with Cancel / Add rebuy', async () => {
  const { onConfirm } = await renderMix(['15', '2', '3', '1', '0']);
  await review();
  expect(screen.getByText('Add Alice’s forgotten rebuy?')).toBeTruthy();
  expect(screen.getByLabelText('Alice’s buy-ins: EUR 20.00 → EUR 40.00')).toBeTruthy();
  expect(screen.getByText('Alice’s result stays.')).toBeTruthy();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Add rebuy' }));
  });
  expect(onConfirm).toHaveBeenCalledWith({ acceptedWarnings: [] });
});

it.each([
  [['10', '3', '3', '1', '0'], 'Covers only 3 of 4 blind payments with separate chips.', 'reducedCoverage'],
  [['0', '0', '0', '2', '0'], 'Covers only 0 of 4 blind payments with separate chips.', 'reducedCoverage'],
  [['40', '2', '2', '1', '0'], 'Leaves chips for only 0 of 1 reserve stacks (was 2).', 'weakenedReserve'],
])('needs an explicit Accept & add for %j; Decline changes nothing', async (texts, warning, code) => {
  const { onConfirm } = await renderMix(texts);
  await review();
  expect(screen.getByLabelText(`Warning: ${warning}`)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Decline' }));
  expect(onConfirm).not.toHaveBeenCalled();
  await review();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Accept & add' }));
  });
  expect(onConfirm).toHaveBeenCalledWith({ acceptedWarnings: [code] });
});

it('shows Not enough chips with Back to editing only', async () => {
  const { onConfirm } = await renderMix(['200', '0', '0', '0', '0']);
  await review();
  expect(screen.getByText('Not enough chips for this mix')).toBeTruthy();
  expect(screen.getByText('The bank is 155 White chips short. Check the quantities you entered.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Accept|Add rebuy/ })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Back to editing' }));
  expect(onConfirm).not.toHaveBeenCalled();
});

it('corrects a rebuy mix with Accept & save, once while busy', async () => {
  let finish: (outcome: ConfirmOutcome) => void = () => {};
  const { onConfirm } = await renderMix(['10', '3', '3', '1', '0'], 'correct', () => new Promise((resolve) => (finish = resolve)));
  expect(screen.getByText('Bob · Rebuy 1')).toBeTruthy();
  expect(screen.queryByText(/result stays/)).toBeNull();
  await review();
  expect(screen.getByText('Correct Bob’s rebuy 1?')).toBeTruthy();
  expect(screen.queryByText(/buy-ins/)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Accept & save' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Saving…' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  await act(async () => finish({ kind: 'accepted' }));
});
