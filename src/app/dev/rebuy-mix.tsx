/**
 * Development only: the forgotten-rebuy / Correct mix editor with fixture data. Typing changes the
 * bar; Review uses a fixture stand-in for game management (the prototype's example mixes).
 *   /dev/rebuy-mix?state=partial|ready|empty|so-far|over|wrong-total|incomplete|correct|
 *     confirm|reduced|zero-coverage|weaken|impossible|correct-confirm
 */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { REBUY_MIX_FIXTURES, type RebuyMixFixtureName, mixEditorData, reviewFixtureMix } from '@/features/rebuy-mix/fixtures';
import { RebuyMixEditor, type RebuyMixDialogState } from '@/features/rebuy-mix/RebuyMixEditor';
import { useToast } from '@/ui';

type Fixture = (typeof REBUY_MIX_FIXTURES)[RebuyMixFixtureName];

function dialogOf(fixture: Fixture): RebuyMixDialogState | undefined {
  if (!('dialog' in fixture)) return undefined;
  const outcome = fixture.dialog;
  if (outcome.kind === 'confirm') return { kind: 'confirm', confirmation: outcome.confirmation };
  if (outcome.kind === 'blocked') return { kind: 'blocked', blocked: outcome.blocked };
  return undefined;
}

function Editor({ fixture }: { fixture: Fixture }) {
  const toast = useToast();
  const initial = fixture.data;
  const [texts, setTexts] = useState(initial.entries.map((entry) => entry.quantityText));
  const [errors, setErrors] = useState<Record<number, string>>(
    Object.fromEntries(initial.entries.filter((entry) => entry.error).map((entry) => [entry.value, entry.error!])),
  );
  const [problem, setProblem] = useState(initial.problem);
  const data = mixEditorData(initial.playerName, texts, {
    kind: initial.kind,
    rebuyNumber: initial.rebuyNumber ?? undefined,
    resultStays: initial.resultStays,
    errors,
    problem,
  });
  const values = data.entries.map((entry) => entry.value);
  const correct = data.kind === 'correct';

  return (
    <RebuyMixEditor
      data={data}
      initialIndex={fixture.index}
      initialDialog={dialogOf(fixture)}
      onChangeQuantity={(value, text) => {
        setTexts((current) => current.map((old, index) => (values[index] === value ? text : old)));
        setErrors(({ [value]: _cleared, ...rest }) => rest);
        setProblem(null);
      }}
      onSetRemainingToZero={() => {
        setTexts((current) => current.map((text) => (text === '' ? '0' : text)));
        setErrors({});
      }}
      onLeave={() => toast.show('Back to the player page (fixture)')}
      onMore={() => toast.show('Game actions (fixture)')}
      onReview={async () => {
        const review = reviewFixtureMix(data);
        setErrors(review.errors);
        setProblem(review.problem);
        return review.outcome;
      }}
      onConfirm={() =>
        new Promise((resolve) =>
          setTimeout(() => {
            toast.show(correct ? 'Rebuy corrected' : 'Forgotten rebuy added', { tone: 'confirmed' });
            resolve({ kind: 'accepted' });
          }, 800),
        )
      }
    />
  );
}

export default function RebuyMixDevRoute() {
  const { state = 'partial' } = useLocalSearchParams<{ state?: string }>();
  const fixture = REBUY_MIX_FIXTURES[(state in REBUY_MIX_FIXTURES ? state : 'partial') as RebuyMixFixtureName];
  return <Editor key={state} fixture={fixture} />;
}
