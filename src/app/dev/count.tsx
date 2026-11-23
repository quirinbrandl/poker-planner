/**
 * Development only: the final chip count editor with fixture data. Typing changes the totals;
 * Review uses a fixture stand-in for game management; Confirm resolves after a short delay.
 *   /dev/count?state=draft|complete|invalid|correction|zero|confirm|replace|zero-confirm|surplus
 */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { CountEditor, type CountEditorDialog } from '@/features/count/CountEditor';
import { countEditorData, resultConfirmation, reviewFixtureCount } from '@/features/count/fixtures';
import type { Cents } from '@/domain/types';
import { useToast } from '@/ui';

interface State {
  name: string;
  texts: string[];
  kind?: 'count' | 'correction';
  index?: number;
  dialog?: CountEditorDialog;
  errors?: Record<number, string>;
  problem?: { title: string; message: string };
}

const CONTRIBUTIONS = 2000 as Cents;
const COMPLETE = ['15', '2', '5', '1', '0'];

const STATES: Record<string, State> = {
  draft: { name: 'Clara', texts: ['12', '', '', '', ''] },
  complete: { name: 'Clara', texts: COMPLETE, index: 2 },
  invalid: {
    name: 'Clara',
    texts: ['12', '', 'x3', '', ''],
    index: 1,
    errors: { 5: 'Enter a quantity, including zero.', 25: 'Use a whole number, digits only.', 100: 'Enter a quantity, including zero.', 500: 'Enter a quantity, including zero.' },
    problem: { title: 'Count incomplete.', message: 'Your entries are kept. Fix the marked quantities.' },
  },
  correction: { name: 'Alice', texts: ['10', '3', '5', '1', '0'], kind: 'correction' },
  zero: { name: 'Clara', texts: ['0', '0', '0', '0', '0'] },
  confirm: { name: 'Clara', texts: COMPLETE, dialog: { kind: 'confirm', confirmation: resultConfirmation('Clara', [15, 2, 5, 1, 0], CONTRIBUTIONS) } },
  replace: {
    name: 'Alice',
    texts: ['10', '3', '5', '1', '0'],
    kind: 'correction',
    dialog: { kind: 'confirm', confirmation: resultConfirmation('Alice', [10, 3, 5, 1, 0], CONTRIBUTIONS, 'replace') },
  },
  'zero-confirm': { name: 'Clara', texts: ['0', '0', '0', '0', '0'], dialog: { kind: 'confirm', confirmation: resultConfirmation('Clara', [0, 0, 0, 0, 0], CONTRIBUTIONS) } },
  surplus: {
    name: 'Felix',
    texts: ['136', '0', '0', '0', '0'],
    dialog: {
      kind: 'blocked',
      blocked: {
        title: 'More chips than the game has',
        chips: [{ value: 1, color: 'white', deltaText: '+1' }],
        message: 'That’s 1 White chip more than the game has. Check the quantities you entered.',
      },
    },
  },
};

function Fixture({ initial }: { initial: State }) {
  const toast = useToast();
  const [texts, setTexts] = useState(initial.texts);
  const [errors, setErrors] = useState<Record<number, string>>(initial.errors ?? {});
  const [problem, setProblem] = useState(initial.problem ?? null);
  const data = countEditorData(initial.name, texts, CONTRIBUTIONS, { kind: initial.kind, errors, problem });
  const values = data.entries.map((entry) => entry.value);

  return (
    <CountEditor
      data={data}
      initialIndex={initial.index}
      initialDialog={initial.dialog}
      onChangeQuantity={(value, text) => {
        setTexts((current) => current.map((old, index) => (values[index] === value ? text : old)));
        setErrors(({ [value]: _cleared, ...rest }) => rest);
      }}
      onSetRemainingToZero={() => {
        setTexts((current) => current.map((text) => (text === '' ? '0' : text)));
        setErrors({});
      }}
      onLeave={() => toast.show('Draft kept (fixture)')}
      onMore={() => toast.show('Game actions (fixture)')}
      onReview={async () => {
        const review = reviewFixtureCount(data, CONTRIBUTIONS);
        setErrors(review.errors);
        setProblem(review.problem);
        return review.outcome;
      }}
      onConfirm={() =>
        new Promise((resolve) =>
          setTimeout(() => {
            toast.show('Result confirmed', { tone: 'confirmed' });
            resolve({ kind: 'accepted' });
          }, 800),
        )
      }
    />
  );
}

export default function CountDevRoute() {
  const { state = 'draft' } = useLocalSearchParams<{ state?: string }>();
  const initial = STATES[state] ?? STATES.draft;
  return <Fixture key={state} initial={initial} />;
}
