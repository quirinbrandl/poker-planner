import { useSyncExternalStore } from 'react';

import type {
  AddPlayerScreenView,
  BankReserveScreenView,
  CashPlayerView,
  CashResultsView,
  CountEditorView,
  GameCard,
  GameDetailsScreenView,
  PersistenceStatus,
  PlanningView,
  PlayerPickerEntry,
  PlayScreenView,
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

/** Cash-game Results: accounting status and player rows; `null` unless an In progress cash game. */
export function useCashResults(gameId: string): CashResultsView | null {
  const app = useGameManagement();
  return useRead(() => app.play.getResults(gameId));
}

/**
 * The final chip count editor of one participant; `null` unless an In progress cash game where the
 * participant has no result yet. `showErrors` after a failed review.
 */
export function useCountEditor(gameId: string, participantId: string, showErrors = false): CountEditorView | null {
  const app = useGameManagement();
  return useRead(() => app.play.getCountEditor(gameId, participantId, { showErrors }));
}

/** One participant's cash player page; `null` unless an In progress cash game with that participant. */
export function useCashPlayer(gameId: string, participantId: string): CashPlayerView | null {
  const app = useGameManagement();
  return useRead(() => app.play.getCashPlayer(gameId, participantId));
}

/** Play of an In progress cash game (terms, reserve line, Playing / Finished rows); `null` otherwise. */
export function usePlayScreen(gameId: string): PlayScreenView | null {
  const app = useGameManagement();
  return useRead(() => app.play.getPlayScreen(gameId));
}

/** Bank & reserve of an In progress game; `null` otherwise. */
export function useBankReserve(gameId: string): BankReserveScreenView | null {
  const app = useGameManagement();
  return useRead(() => app.play.getBankReserve(gameId));
}

/** Locked Game details of an In progress game, both modes; `null` otherwise. */
export function useGameDetails(gameId: string): GameDetailsScreenView | null {
  const app = useGameManagement();
  return useRead(() => app.play.getGameDetails(gameId));
}

/** Add player (late entry): entry terms and the saved players to choose from; `null` unless In progress. */
export function useAddPlayer(gameId: string): AddPlayerScreenView | null {
  const app = useGameManagement();
  return useRead(() => app.play.getAddPlayer(gameId));
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
