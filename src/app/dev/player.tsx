/**
 * Development only: the player page with fixture data.
 *   /dev/player?state=alice|alice-after-history|bob|clara-draft|tags|return-after|sub-cent|completed|zero|long|
 *     undo|return|return-zero
 * Undo rebuy and Back in the game resolve after a short delay; add `&blocked=1` to see Undo blocked.
 */
import { useLocalSearchParams } from 'expo-router';

import { PLAYER_FIXTURES, type PlayerFixtureName } from '@/features/player/fixtures';
import { PlayerPage, type PlayerPageDialog } from '@/features/player/PlayerPage';
import type { ConfirmOutcome } from '@/features/count/types';
import { useToast } from '@/ui';

const POPUPS: Record<string, { name: PlayerFixtureName; dialog: PlayerPageDialog }> = {
  undo: { name: 'bob', dialog: { kind: 'undo', rebuyId: 'p2-r1' } },
  return: { name: 'alice', dialog: { kind: 'return' } },
  'return-zero': { name: 'zero', dialog: { kind: 'return' } },
};

export default function PlayerDevRoute() {
  const { state = 'alice', blocked } = useLocalSearchParams<{ state?: string; blocked?: string }>();
  const toast = useToast();
  const popup = POPUPS[state];
  const name = popup?.name ?? ((state in PLAYER_FIXTURES ? state : 'alice') as PlayerFixtureName);
  const later = (message: string) =>
    new Promise<ConfirmOutcome>((resolve) =>
      setTimeout(() => {
        if (blocked === '1') {
          resolve({
            kind: 'blocked',
            blocked: {
              title: 'Can’t undo this rebuy',
              chips: [{ value: 1, color: 'white', deltaText: '+5' }],
              message: 'That’s 5 White chips more than the game has. Check the results first.',
            },
          });
          return;
        }
        toast.show(message, { tone: 'confirmed' });
        resolve({ kind: 'accepted' });
      }, 800),
    );
  return (
    <PlayerPage
      key={state}
      data={PLAYER_FIXTURES[name]}
      initialDialog={popup?.dialog}
      onBack={() => toast.show('Back (fixture)')}
      onMore={() => toast.show('Game actions (fixture)')}
      onCountFinalChips={() => toast.show('Opens the count (fixture)')}
      onRebuy={() => toast.show('Opens the rebuy popup (fixture)')}
      onCorrectResult={() => toast.show('Opens the correction (fixture)')}
      onCorrectMix={(id) => toast.show(`Correct mix of ${id} (fixture)`)}
      onAddForgottenRebuy={() => toast.show('Opens the forgotten rebuy (fixture)')}
      onUndoRebuy={() => later('Rebuy undone')}
      onReturnToPlay={() => later('Back in the game')}
    />
  );
}
