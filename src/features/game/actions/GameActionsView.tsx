import { BottomSheet, type SheetAction } from '@/ui';

import { DeleteGameDialog, ReopenDialog, ReturnToPlanningDialog } from './GameActionDialogs';
import { PHASE_ACTIONS } from './texts';
import type { GameAction, GameActionsGame, ReturnToPlanningData } from './types';

export interface GameActionsViewProps {
  game: GameActionsGame;
  /** The sheet is open (hidden while a confirmation shows). */
  sheetVisible: boolean;
  /** Cancel on the sheet, back or backdrop. */
  onCloseSheet: () => void;
  /** The open confirmation, or none. */
  confirmation: GameAction | null;
  /** A sheet line was chosen: close the sheet and open that confirmation. */
  onChoose: (action: GameAction) => void;
  /** Cancel in a confirmation: nothing changes. */
  onCancelConfirmation: () => void;
  /** The confirmation whose action is running. */
  busy?: GameAction | null;
  /** Delete game: always offered. */
  onDelete: () => void;
  /** Reopen game (Completed). Offered only when supplied. */
  onReopen?: () => void;
  /** Return to Planning (In progress). Offered only when supplied together with `returnToPlanning`. */
  onReturnToPlanning?: () => void;
  /** What Return to Planning clears and keeps. */
  returnToPlanning?: ReturnToPlanningData;
}

/**
 * Game actions behind ⋯: one line per lifecycle action the phase allows (Planning: Delete;
 * In progress: Return to Planning, Delete; Completed: Reopen, Delete) and their confirmations.
 * Purely presentational: the host keeps which one is open and runs the action.
 */
export function GameActionsView({
  game,
  sheetVisible,
  onCloseSheet,
  confirmation,
  onChoose,
  onCancelConfirmation,
  busy = null,
  onDelete,
  onReopen,
  onReturnToPlanning,
  returnToPlanning,
}: GameActionsViewProps) {
  const sheetActions: SheetAction[] = [];
  for (const action of PHASE_ACTIONS[game.phase]) {
    if (action === 'returnToPlanning' && onReturnToPlanning && returnToPlanning) {
      sheetActions.push({
        key: action,
        label: 'Return to Planning…',
        hint: 'Clears play; new stacks are handed out after Start.',
        icon: 'undo',
        destructive: true,
        onPress: () => onChoose(action),
      });
    } else if (action === 'reopen' && onReopen) {
      sheetActions.push({
        key: action,
        label: 'Reopen game…',
        hint: 'Change results or buy-ins, then calculate again.',
        icon: 'reopen',
        onPress: () => onChoose(action),
      });
    } else if (action === 'delete') {
      sheetActions.push({
        key: action,
        label: 'Delete game…',
        hint: 'Removes this game for good.',
        icon: 'trash',
        destructive: true,
        onPress: () => onChoose(action),
      });
    }
  }

  return (
    <>
      <BottomSheet
        visible={sheetVisible && confirmation === null}
        title="Game actions"
        actions={sheetActions}
        onCancel={onCloseSheet}
      />
      {onReopen ? (
        <ReopenDialog
          visible={confirmation === 'reopen'}
          busy={busy === 'reopen'}
          mode={game.mode}
          onConfirm={onReopen}
          onCancel={onCancelConfirmation}
        />
      ) : null}
      {onReturnToPlanning && returnToPlanning ? (
        <ReturnToPlanningDialog
          visible={confirmation === 'returnToPlanning'}
          busy={busy === 'returnToPlanning'}
          data={returnToPlanning}
          onConfirm={onReturnToPlanning}
          onCancel={onCancelConfirmation}
        />
      ) : null}
      <DeleteGameDialog
        visible={confirmation === 'delete'}
        busy={busy === 'delete'}
        game={game}
        onConfirm={onDelete}
        onCancel={onCancelConfirmation}
      />
    </>
  );
}
