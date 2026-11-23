import { useSyncExternalStore } from 'react';

import type {
  GameCard,
  OrderDraft,
  OrderEditorView,
  PersistenceStatus,
  PlanningView,
  PlayerPickerEntry,
  PlayView,
  PreviewStepView,
  SavedPlayerView,
  TemplateView,
  TournamentPlayerView,
  TournamentPlayView,
  TournamentResultsView,
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

/** One game's card in any phase; `null` if it does not exist (any more). */
export function useGame(gameId: string): GameCard | null {
  const app = useGameManagement();
  return useRead(() => app.games.get(gameId));
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

/** Tournament Play (standings, still in, Out previews); `null` unless an In progress tournament. */
export function useTournamentPlay(gameId: string): TournamentPlayView | null {
  const app = useGameManagement();
  return useRead(() => app.play.getTournamentPlay(gameId));
}

/** Tournament Results (status, finishing order, Calculate state); `null` unless an In progress tournament. */
export function useTournamentResults(gameId: string): TournamentResultsView | null {
  const app = useGameManagement();
  return useRead(() => app.play.getTournamentResults(gameId));
}

/** One tournament player's page; `null` unless an In progress tournament with that participant. */
export function useTournamentPlayer(gameId: string, participantId: string): TournamentPlayerView | null {
  const app = useGameManagement();
  return useRead(() => app.play.getTournamentPlayer(gameId, participantId));
}

/** What the finishing-order editor shows for a draft the screen keeps; `null` without a draft or game. */
export function useOrderEditor(draft: OrderDraft | null): OrderEditorView | null {
  const app = useGameManagement();
  return useRead(() => (draft ? app.play.describeOrderDraft(draft) : null));
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
