import { useLocalSearchParams } from 'expo-router';

import { CashPlayerScreen } from '@/features/player/CashPlayerScreen';
import { TournamentPlayerScreen } from '@/features/tournament/TournamentPlayerScreen';
import { useGame } from '@/state';
import { Screen } from '@/ui';

/** Route screen: the player page of a started game, by mode. */
export default function PlayerScreen() {
  const params = useLocalSearchParams<{ gameId: string; participantId?: string }>();
  const game = useGame(params.gameId);
  if (!game) return <Screen />;
  return game.mode === 'tournament' ? <TournamentPlayerScreen {...params} /> : <CashPlayerScreen {...params} />;
}
