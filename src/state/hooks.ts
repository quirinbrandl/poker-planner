import { useSyncExternalStore } from 'react';

import type {
  AddPlayerScreenView,
  BankReserveScreenView,
  CashPlayerView,
  CashResultsView,
  CountEditorView,
  FixStart,
  FixView,
  GameCard,
  GameDetailsScreenView,
  HistoryGameView,
  OrderDraft,
  OrderEditorView,
  PaymentsView,
  PersistenceStatus,
  PlanningView,
  PlayerBuyInsView,
  PlayerPickerEntry,
  PlayScreenView,
  PlayView,
  PreviewStepView,
  RebuyMixEditorView,
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

/** History: Completed games, most recently finished first. */
export function useHistory(): readonly HistoryGameView[] {
  const app = useGameManagement();
  return useRead(() => app.games.history());
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

/** A Completed game's Payments (instructions and Balances); `null` unless Completed. */
export function usePayments(gameId: string): PaymentsView | null {
  const app = useGameManagement();
  return useRead(() => app.play.getPayments(gameId));
}

/** Cash-game Results: accounting status and player rows (Completed: read-only); `null` unless a started cash game. */
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

/** One participant's cash player page (Completed: read-only); `null` unless a started cash game with that participant. */
export function useCashPlayer(gameId: string, participantId: string): CashPlayerView | null {
  const app = useGameManagement();
  return useRead(() => app.play.getCashPlayer(gameId, participantId));
}

/**
 * The count editor as a correction draft of a confirmed result (the saved draft, or the confirmed
 * counts); `null` unless an In progress cash game where the participant has a result.
 */
export function useCorrectionEditor(gameId: string, participantId: string, showErrors = false): CountEditorView | null {
  const app = useGameManagement();
  return useRead(() => app.play.getCorrectionEditor(gameId, participantId, { showErrors }));
}

/** The Buy-ins section of a player page, both modes (rows, Undo popups, what is offered); `null` without one. */
export function usePlayerBuyIns(gameId: string, participantId: string): PlayerBuyInsView | null {
  const app = useGameManagement();
  return useRead(() => app.play.getPlayerBuyIns(gameId, participantId));
}

/**
 * The forgotten-rebuy (no `rebuyId`) or Correct mix editor for the texts the screen holds (`null`:
 * the starting texts); `null` unless an In progress game with that participant and rebuy.
 */
export function useRebuyMixEditor(
  gameId: string,
  participantId: string,
  options: { rebuyId?: string; texts: readonly string[] | null; showErrors: boolean },
): RebuyMixEditorView | null {
  const app = useGameManagement();
  const { rebuyId, texts, showErrors } = options;
  return useRead(() =>
    app.play.getRebuyMixEditor(gameId, participantId, { ...(rebuyId ? { rebuyId } : {}), ...(texts ? { texts } : {}), showErrors }),
  );
}

/** The fix page: the recorded fix, or step 1 for `start`; `null` when there is nothing to fix. */
export function useFix(gameId: string, start: FixStart | null): FixView | null {
  const app = useGameManagement();
  return useRead(() => app.play.getFix(gameId, start ?? undefined));
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
