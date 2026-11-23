import { useLocalSearchParams } from 'expo-router';

import { Text } from '@/ui';

import { PlanningStepFrame } from './PlanningStepFrame';

/** Placeholder until this wizard step is built. */
export default function PlayersStepScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  return (
    <PlanningStepFrame gameId={gameId} step="players">
      <Text tone="supporting">This step is not built yet.</Text>
    </PlanningStepFrame>
  );
}
