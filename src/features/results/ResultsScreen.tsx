import { useLocalSearchParams } from 'expo-router';

import { CashResultsScreen } from '@/features/results/CashResultsScreen';
import { TournamentResultsScreen } from '@/features/tournament/TournamentResultsScreen';
import { useGame } from '@/state';
import { Screen } from '@/ui';

/** Route screen: Results of a started game, by mode. */
export default function ResultsScreen() {
  const params = useLocalSearchParams<{ gameId: string; participantId?: string }>();
  const game = useGame(params.gameId);
  if (!game) return <Screen />;
  return game.mode === 'tournament' ? <TournamentResultsScreen {...params} /> : <CashResultsScreen {...params} />;
}
