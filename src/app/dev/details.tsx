/**
 * Development only: locked Game details with fixture data (no game management).
 *   /dev/details?state=cash|cash-adjusted|cash-completed|tournament
 */
import { useLocalSearchParams } from 'expo-router';

import { DETAILS_FIXTURES, type DetailsFixtureName } from '@/features/details/fixtures';
import { GameDetailsView } from '@/features/details/GameDetailsView';
import { useToast } from '@/ui';

export default function DetailsDevRoute() {
  const { state = 'cash' } = useLocalSearchParams<{ state?: string }>();
  const toast = useToast();
  const name: DetailsFixtureName = state in DETAILS_FIXTURES ? (state as DetailsFixtureName) : 'cash';
  return (
    <GameDetailsView
      key={name}
      data={DETAILS_FIXTURES[name]}
      onViewBank={() => toast.show('Opens Bank & reserve (fixture)')}
      onSelectTab={(tab) => toast.show(`Opens ${tab} (fixture)`)}
      onBack={() => toast.show('Back (fixture)')}
      onMore={() => toast.show('Game actions (fixture)')}
    />
  );
}
