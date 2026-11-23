import { router, useLocalSearchParams } from 'expo-router';

import { planningStepHref, playHref } from '@/features/shared/routes';
import type { PlanningView, StepId } from '@/game-management';
import { useGameManagement, usePlanningView } from '@/state';
import { useToast } from '@/ui';

import { PlanningStepFrame } from './PlanningStepFrame';
import { PreviewStep } from './preview/PreviewStep';
import type { PreviewData } from './preview/types';

/** The preview's data from the Planning view. */
export function previewData(plan: PlanningView): PreviewData {
  const schedule = plan.payoutSchedule;
  return {
    mode: plan.mode,
    playerCount: plan.players.participants.length,
    preview: plan.preview,
    payouts:
      plan.mode === 'tournament'
        ? {
            name: schedule.preset.name,
            places: schedule.places.map((place) => ({
              id: place.id,
              placeLabel: place.placeLabel,
              shareText: `${place.share.text}%`,
              amountText: place.amount.text,
            })),
          }
        : null,
  };
}

/** Planning: Distribution preview, the last wizard step, with Start. */
export default function PreviewStepScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const app = useGameManagement();
  const plan = usePlanningView(gameId);
  const toast = useToast();

  if (!plan) return <PlanningStepFrame gameId={gameId} step="preview" />;

  // A correction opened from here: the step's primary action becomes "Return to preview".
  const openStep = async (step: StepId) => {
    const result = await app.planning.goToStep(gameId, step, { fromPreview: true });
    if (result.status === 'accepted') router.replace(planningStepHref(gameId, result.step));
    else toast.show(result.reason.message, { tone: 'error' });
  };

  return (
    <PreviewStep
      data={previewData(plan)}
      onOpenStep={(step) => void openStep(step)}
      onStart={(acceptance) => app.planning.start(gameId, acceptance)}
      onStarted={() => router.replace(playHref(gameId))}
      onStartRejected={(message) => toast.show(message, { tone: 'error' })}
      renderFrame={(frame) => <PlanningStepFrame gameId={gameId} step="preview" {...frame} />}
    />
  );
}
