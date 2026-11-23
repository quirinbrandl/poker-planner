/**
 * The ordinary rebuy popup opened from another screen than Play (a player page, the fix flow):
 * asks game management for the proposal, issues exactly it, and reports the outcome. Screen
 * state only; every rule lives in `play.proposeRebuy` / `play.issueRebuy`.
 */
import { useState } from 'react';

import type { IssueFeedback, RebuyAcceptance, RebuyPopupData } from '@/game-management';
import { useGameManagement } from '@/state';
import { useToast } from '@/ui';

interface OpenRebuy {
  popup: RebuyPopupData;
  /** `null` for a blocked request. */
  acceptance: RebuyAcceptance | null;
}

export function useRebuyPopup(gameId: string, onIssued?: (feedback: IssueFeedback) => void) {
  const app = useGameManagement();
  const toast = useToast();
  const [open, setOpen] = useState<OpenRebuy | null>(null);
  const [busy, setBusy] = useState(false);

  const request = (participantId: string) => {
    const result = app.play.proposeRebuy(gameId, participantId);
    if (result.status === 'needsConfirmation') {
      setOpen({ popup: result.confirmation.popup, acceptance: result.confirmation.acceptance });
    } else if (result.status === 'rejected' && 'blocked' in result) {
      setOpen({ popup: result.blocked, acceptance: null });
    } else {
      toast.show(result.reason.message, { tone: 'error' });
    }
  };

  const confirm = async () => {
    if (!open?.acceptance) return;
    setBusy(true);
    const result = await app.play.issueRebuy(gameId, open.acceptance);
    setBusy(false);
    setOpen(null);
    if (result.status === 'accepted') {
      if (onIssued) onIssued(result.feedback);
      else toast.show(result.feedback.title, { tone: 'confirmed' });
      return;
    }
    toast.show(result.reason.message, { tone: 'error' });
    // A changed bank needs a fresh review, never a silent substitute.
    if (result.reason.code === 'proposalChanged') request(open.acceptance.participantId);
  };

  const cancel = () => {
    setOpen(null);
    toast.show('No rebuy issued');
  };

  return { popup: open?.popup ?? null, busy, request, confirm: () => void confirm(), cancel, close: () => setOpen(null) };
}
