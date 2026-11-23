import { useSyncExternalStore } from 'react';

import type {
  GameCard,
  PersistenceStatus,
  PlanningView,
  PlayerPickerEntry,
  PlayView,
  PreviewStepView,
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

/**
 * Distribution preview of a Planning game: the recommendation (or why there is none) and the setup
 * blockers; `null` if it does not exist or has left Planning. Use it on the preview step only.
 */
export function useDistributionPreview(gameId: string): PreviewStepView | null {
  const app = useGameManagement();
  return useRead(() => app.planning.getDistributionPreview(gameId));
}

/** One In progress game's view (Play, bank / reserve, locked Game details); `null` unless In progress. */
export function usePlayView(gameId: string): PlayView | null {
  const app = useGameManagement();
  return useRead(() => app.play.getView(gameId));
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
