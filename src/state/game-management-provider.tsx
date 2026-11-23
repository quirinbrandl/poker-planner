import { randomUUID } from 'expo-crypto';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { createGameManagement, type DocumentStore, type GameManagement, openPlatformStore } from '@/game-management';

const GameManagementContext = createContext<GameManagement | null>(null);

export interface GameManagementProviderProps {
  children: ReactNode;
  /** Defaults to the platform store (SQLite on Android/iOS, localStorage on web). Tests pass one. */
  store?: DocumentStore;
  now?: () => Date;
  newId?: () => string;
  /** Shown while saved data loads. */
  loading?: ReactNode;
  /** Shown if saved data cannot be opened (for example, written by a newer app version). */
  renderError?: (error: Error) => ReactNode;
}

type LoadState = { kind: 'loading' } | { kind: 'ready'; app: GameManagement } | { kind: 'failed'; error: Error };

/** Creates game management once, waits for the initial load, then renders `children`. */
export function GameManagementProvider({
  children,
  store,
  now,
  newId = randomUUID,
  loading = null,
  renderError,
}: GameManagementProviderProps) {
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const app = await createGameManagement({ store: store ?? (await openPlatformStore()), now, newId });
        if (active) setLoad({ kind: 'ready', app });
      } catch (error) {
        if (active) setLoad({ kind: 'failed', error: error instanceof Error ? error : new Error(String(error)) });
      }
    })();
    return () => {
      active = false;
    };
    // Created once per mounted provider; changing props later does not reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (load.kind === 'loading') return <>{loading}</>;
  if (load.kind === 'failed') {
    if (renderError) return <>{renderError(load.error)}</>;
    throw load.error;
  }
  return <GameManagementContext.Provider value={load.app}>{children}</GameManagementContext.Provider>;
}

/** The application interface. Only inside `GameManagementProvider`. */
export function useGameManagement(): GameManagement {
  const app = useContext(GameManagementContext);
  if (!app) throw new Error('useGameManagement must be used inside <GameManagementProvider>.');
  return app;
}
