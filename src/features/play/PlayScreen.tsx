import { useLocalSearchParams } from 'expo-router';

import { CashPlayScreen } from '@/features/play/CashPlayScreen';
import { TournamentPlayScreen } from '@/features/tournament/TournamentPlayScreen';
import { useGame } from '@/state';
import { Screen } from '@/ui';

/** Route screen: Play of a started game, by mode. */
export default function PlayScreen() {
  const params = useLocalSearchParams<{ gameId: string; participantId?: string }>();
  const game = useGame(params.gameId);
  if (!game) return <Screen />;
  return game.mode === 'tournament' ? <TournamentPlayScreen {...params} /> : <CashPlayScreen {...params} />;
}
