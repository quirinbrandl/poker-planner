/**
 * Development only: "Fix Alice’s count", one step at a time, with fixture data. Each accepted
 * popup moves to the next step; "Review Bob’s new rebuy…" stands in for the rebuy popup.
 *   /dev/fix?state=step1|step2|step3|done|removal-step1|removal-step2|removal-done|undo|save|removal-save
 */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { fixData, FIX_FIXTURES, type FixFixtureName } from '@/features/fix/fixtures';
import { type FixDialog, FixPage } from '@/features/fix/FixPage';
import type { FixData } from '@/features/fix/types';
import type { ConfirmOutcome } from '@/features/count/types';
import { useToast } from '@/ui';

const POPUPS: Record<string, { data: FixData; dialog: FixDialog }> = {
  undo: { data: fixData(1), dialog: { kind: 'undo' } },
  save: { data: fixData(2), dialog: { kind: 'save' } },
  'removal-save': { data: fixData(2, 'result'), dialog: { kind: 'save' } },
};

function Flow({ initial, dialog }: { initial: FixData; dialog?: FixDialog }) {
  const toast = useToast();
  const [step, setStep] = useState(initial.step);
  const data = { ...initial, step };
  const advance = (message: string, next: FixData['step']) =>
    new Promise<ConfirmOutcome>((resolve) =>
      setTimeout(() => {
        toast.show(message, { tone: 'confirmed' });
        setStep(next);
        resolve({ kind: 'accepted' });
      }, 600),
    );
  return (
    <FixPage
      data={data}
      initialDialog={dialog}
      onBack={() => toast.show(`Play shows “Fixing Alice’s count · Step ${step} of 3” (fixture)`)}
      onMore={() => toast.show('Game actions (fixture)')}
      onUndo={() => advance('Rebuy undone', 2)}
      onBackToCount={() => toast.show('Back to the correction draft (fixture)')}
      onSave={() => advance(initial.target === 'count' ? 'Result replaced' : 'Back in the game', 3)}
      onEditCount={() => toast.show('Opens the correction draft (fixture)')}
      onReviewNewRebuy={() => {
        toast.show('Rebuy issued (fixture)', { tone: 'confirmed' });
        setStep('done');
      }}
      onFinish={() => toast.show('Back to Play (fixture)')}
    />
  );
}

export default function FixDevRoute() {
  const { state = 'step1' } = useLocalSearchParams<{ state?: string }>();
  const popup = POPUPS[state];
  const data = popup?.data ?? FIX_FIXTURES[(state in FIX_FIXTURES ? state : 'step1') as FixFixtureName];
  return <Flow key={state} initial={data} dialog={popup?.dialog} />;
}
