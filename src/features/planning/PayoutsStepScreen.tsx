import { useLocalSearchParams } from 'expo-router';

import { PayoutsStep } from './payouts/PayoutsStep';

/** Tournament Planning: Payout schedule (C · Prize ladder). */
export default function PayoutsStepScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  return <PayoutsStep gameId={gameId} />;
}
