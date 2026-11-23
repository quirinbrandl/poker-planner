import { useSyncExternalStore } from 'react';

import type {
  GameCard,
  PersistenceStatus,
  PlanningView,
  PlayerPickerEntry,
  SavedPlayerView,
  TemplateView,
  WorkingLocation,
} from '@/game-management';

import { useGameManagement } from './game-management-provider';

/** Subscribes to one read of the application; re-renders when that read returns a new value. */
function useRead<T>(read: () => T): T {
  const app = useGameManagement();
  return useSyncExternalStore(app.subscribe, read, read);
}

/** Games list: In progress, then Planning, newest-created first. */
export function useGames(): readonly GameCard[] {
  const app = useGameManagement();
  return useRead(() => app.games.list());
}

/** One Planning game's view; `null` if it does not exist or has left Planning. */
export function usePlanningView(gameId: string): PlanningView | null {
  const app = useGameManagement();
  return useRead(() => app.planning.getView(gameId));
}

/** The saved-player picker for a game. */
export function usePlayerPicker(gameId: string): readonly PlayerPickerEntry[] | null {
  const app = useGameManagement();
  return useRead(() => app.planning.getPlayerPicker(gameId));
}

export function useSavedPlayers(): readonly SavedPlayerView[] {
  const app = useGameManagement();
  return useRead(() => app.savedPlayers.list());
}

export function useTemplates(): readonly TemplateView[] {
  const app = useGameManagement();
  return useRead(() => app.templates.list());
}

export function useWorkingLocation(): WorkingLocation {
  const app = useGameManagement();
  return useRead(() => app.location.get());
}

/** For truthful "saved on this phone" feedback. */
export function usePersistenceStatus(): PersistenceStatus {
  const app = useGameManagement();
  return useRead(() => app.persistence.getStatus());
}
