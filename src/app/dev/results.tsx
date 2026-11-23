/**
 * Development only: the cash-game Results tab with fixture data.
 *   /dev/results?state=incomplete|empty|drafts|missing|too-many|balanced|reopened|completed|sub-cent|long
 * Pressing an unavailable Calculate Payments… explains why and focuses the status card.
 */
import { useLocalSearchParams } from 'expo-router';

import { RESULTS_FIXTURES, type ResultsFixtureName } from '@/features/results/fixtures';
import { ResultsView } from '@/features/results/ResultsView';
import { useToast } from '@/ui';

export default function ResultsDevRoute() {
  const { state = 'incomplete' } = useLocalSearchParams<{ state?: string }>();
  const toast = useToast();
  const data = RESULTS_FIXTURES[(state in RESULTS_FIXTURES ? state : 'incomplete') as ResultsFixtureName];
  return (
    <ResultsView
      key={state}
      data={data}
      onSelectTab={(tab) => toast.show(`Opens ${tab} (fixture)`)}
      onBack={() => toast.show('Back (fixture)')}
      onMore={() => toast.show('Game actions (fixture)')}
      onOpenPlayer={(id) => toast.show(`Opens player ${id} (fixture)`)}
      onCount={(id) => toast.show(`Opens the count for ${id} (fixture)`)}
      onCalculatePayments={() => toast.show('Calculate Payments? (fixture)')}
    />
  );
}
