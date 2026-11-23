/**
 * Development only: Distribution preview with fixture data, inside the real wizard frame of a
 * throwaway game in an in-memory store (nothing is written to the phone).
 *   /dev/preview?state=feasible|zero-reserve|rounded-sb|alt-depth|reduced-reserve|both|tournament|
 *     incomplete|tournament-incomplete|no-valid-value|no-valid-coverage|no-valid-denom|too-complex|
 *     start-popup|tournament-start-popup
 * Start resolves as accepted after a short delay; add `&reject=1` to see the rejection toast.
 */
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { PlanningStepFrame } from '@/features/planning/PlanningStepFrame';
import { PREVIEW_FIXTURES, type PreviewFixtureName } from '@/features/planning/preview/fixtures';
import { PreviewStep } from '@/features/planning/preview/PreviewStep';
import { createMemoryStore, type StartResult } from '@/game-management';
import { GameManagementProvider, useGameManagement } from '@/state';
import { Screen, Text, useToast } from '@/ui';

const NAMES = ['Alice', 'Bob', 'Cleo', 'Dan', 'Emma', 'Felix'];
const POPUP_STATES: Record<string, PreviewFixtureName> = {
  'start-popup': 'feasible',
  'tournament-start-popup': 'tournament',
};

function fixtureFor(state: string): { name: PreviewFixtureName; popup: boolean } {
  if (state in POPUP_STATES) return { name: POPUP_STATES[state], popup: true };
  if (state in PREVIEW_FIXTURES) return { name: state as PreviewFixtureName, popup: false };
  return { name: 'feasible', popup: false };
}

function Fixture({ state, reject }: { state: string; reject: boolean }) {
  const app = useGameManagement();
  const toast = useToast();
  const { name, popup } = fixtureFor(state);
  const data = PREVIEW_FIXTURES[name];
  const [gameId, setGameId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { gameId: id } = await app.games.create(data.mode);
      for (const player of NAMES.slice(0, data.playerCount)) await app.planning.createSavedPlayerAndAdd(id, player);
      if (active) setGameId(id);
    })();
    return () => {
      active = false;
    };
  }, [app, data.mode, data.playerCount]);

  if (!gameId) {
    return (
      <Screen>
        <Text tone="supporting">Preparing the fixture…</Text>
      </Screen>
    );
  }

  return (
    <PreviewStep
      data={data}
      initialStartOpen={popup}
      onOpenStep={(step) => toast.show(`Opens ${step} (fixture)`)}
      onStart={() =>
        new Promise<StartResult>((resolve) =>
          setTimeout(
            () =>
              resolve(
                reject
                  ? { status: 'rejected', reason: { code: 'previewChanged', message: 'The preview changed. Check it and start again.' } }
                  : { status: 'accepted', location: { kind: 'play', gameId: gameId ?? '' } },
              ),
            800,
          ),
        )
      }
      onStarted={() => toast.show('Started (fixture)', { tone: 'confirmed' })}
      onStartRejected={(message) => toast.show(message, { tone: 'error' })}
      renderFrame={(frame) => <PlanningStepFrame gameId={gameId} step="preview" {...frame} />}
    />
  );
}

/** A fresh in-memory store per fixture: the dev game never reaches the Games list. */
function Isolated({ state, reject }: { state: string; reject: boolean }) {
  const [store] = useState(createMemoryStore);
  return (
    <GameManagementProvider store={store}>
      <Fixture state={state} reject={reject} />
    </GameManagementProvider>
  );
}

export default function PreviewDevRoute() {
  const { state = 'feasible', reject } = useLocalSearchParams<{ state?: string; reject?: string }>();
  return <Isolated key={state} state={state} reject={reject === '1'} />;
}
