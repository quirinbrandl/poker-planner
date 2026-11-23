import { useLocalSearchParams } from 'expo-router';

import { ModeChoice } from '@/features/shared/ModeChoice';
import { useGameManagement, usePlanningView } from '@/state';

import { PlanningStepFrame } from './PlanningStepFrame';

/**
 * Step 1, Choose mode, of an existing plan. Changing the mode applies straight away to the same
 * plan (participants, chip set, settings and payout entries are kept), without a confirmation.
 */
export default function ModeStepScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const app = useGameManagement();
  const plan = usePlanningView(gameId);
  return (
    <PlanningStepFrame gameId={gameId} step="mode">
      {plan ? (
        <ModeChoice
          selected={plan.mode}
          onSelect={(mode) => {
            if (mode !== plan.mode) void app.planning.changeMode(gameId, mode);
          }}
        />
      ) : null}
    </PlanningStepFrame>
  );
}
