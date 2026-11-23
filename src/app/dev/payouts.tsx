/**
 * Development only: seeds a tournament on the Payout schedule step and opens it.
 *   /dev/payouts?state=suggested|custom|invalid|shrunk|nobuyin|cents|few
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { planningStepHref } from '@/features/shared/routes';
import type { GameManagement } from '@/game-management';
import { useGameManagement } from '@/state';
import { Screen, Text } from '@/ui';

const NAMES = ['Alice', 'Bob', 'Cleo', 'Dan', 'Emma', 'Felix', 'Gina', 'Hugo', 'Iris'];

async function seed(app: GameManagement, state: string) {
  const players = { custom: 9, cents: 3, few: 2 }[state] ?? 6;
  const { gameId } = await app.games.create('tournament');
  for (const name of NAMES.slice(0, players)) await app.planning.createSavedPlayerAndAdd(gameId, name);
  for (const [value, quantity] of [
    ['25', '200'],
    ['100', '200'],
  ]) {
    const added = await app.planning.addChipRow(gameId);
    if (added.status !== 'accepted') continue;
    await app.planning.setChipValueText(gameId, added.rowId, value);
    await app.planning.setChipQuantityText(gameId, added.rowId, quantity);
  }
  await app.planning.setSettingText(gameId, 'buyIn', { custom: '10', cents: '6.67' }[state] ?? '20');
  await app.planning.continueFromStep(gameId, 'players');
  await app.planning.completeChipSetStep(gameId, { kind: 'onlyThisGame' });
  if (state === 'few') {
    // Below two players before the step first opens: no schedule is preselected.
    const last = app.planning.getView(gameId)!.players.participants.at(-1)!;
    await app.planning.removeParticipant(gameId, last.id);
  }
  await app.planning.continueFromStep(gameId, 'settings');

  const shares = async (texts: string[]) => {
    const places = () => app.planning.getView(gameId)!.payoutSchedule.places;
    while (places().length < texts.length) await app.planning.addPayoutPlace(gameId);
    for (const [index, text] of texts.entries()) await app.planning.setPayoutShareText(gameId, places()[index].id, text);
  };
  if (state === 'custom') await shares(['45', '25', '15', '10', '5']);
  if (state === 'invalid') {
    await shares(['50', '20', '25']);
    await app.planning.continueFromStep(gameId, 'payouts');
  }
  if (state === 'cents') await app.planning.choosePayoutPreset(gameId, 'top3');
  if (state === 'nobuyin') await app.planning.setSettingText(gameId, 'buyIn', '');
  if (state === 'shrunk') {
    await app.planning.choosePayoutPreset(gameId, 'top4');
    for (let i = 0; i < 3; i++) {
      const last = app.planning.getView(gameId)!.players.participants.at(-1)!;
      await app.planning.removeParticipant(gameId, last.id);
    }
  }
  return gameId;
}

export default function PayoutsDevRoute() {
  const app = useGameManagement();
  const { state = 'suggested' } = useLocalSearchParams<{ state?: string }>();
  useEffect(() => {
    let active = true;
    void seed(app, state).then((gameId) => {
      if (active) router.replace(planningStepHref(gameId, 'payouts'));
    });
    return () => {
      active = false;
    };
  }, [app, state]);
  return (
    <Screen>
      <Text tone="supporting">Seeding a tournament…</Text>
    </Screen>
  );
}
