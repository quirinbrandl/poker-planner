import { Dialog, Text } from '@/ui';

import { BlockedBody, CoverageWarning, HandoutStackShowcase, IssueFacts, useSingleConfirm } from './issuance';
import type { RebuyPopupData } from './types';

export interface RebuyDialogProps {
  /** The popup's content; `null` keeps it closed. */
  rebuy: RebuyPopupData | null;
  /** The host is issuing: the confirm shows progress and cannot run again. */
  busy: boolean;
  /** Issue the reviewed proposal (Issue rebuy, or Accept & issue for reduced coverage). */
  onConfirm: () => void;
  /** Cancel, Decline, Back to Play, Android back or a backdrop tap. Records nothing. */
  onCancel: () => void;
  /** Open Bank & reserve from a blocked request. */
  onViewBank: () => void;
  /** One extra line under the facts, e.g. in the fix flow "Swap Bob’s chips so they match this stack." */
  note?: string | null;
}

/**
 * **Rebuy for <name>**: the actual stack, Reserve after rebuy, New total contribution and the issue
 * action, which carries the price ("Issue rebuy · EUR 20.00"). A reduced-coverage proposal keeps its warning visible and
 * needs Accept & issue; a blocked request explains why and offers Back to Play / View bank.
 */
export function RebuyDialog({ rebuy, busy, onConfirm, onCancel, onViewBank, note }: RebuyDialogProps) {
  const confirm = useSingleConfirm(busy, rebuy, onConfirm);
  const cancel = () => {
    if (!busy) onCancel();
  };
  if (!rebuy) return <Dialog visible={false} title="" onCancel={cancel} />;

  const title = `Rebuy for ${rebuy.playerName}`;
  if (rebuy.kind === 'blocked') {
    return (
      <Dialog
        visible
        title={title}
        cancelLabel="Back to Play"
        onCancel={cancel}
        secondaryAction={{ label: 'View bank', onPress: onViewBank }}
      >
        <BlockedBody
          title="Cannot issue rebuy"
          reason={rebuy.message}
          unchanged="Nothing recorded. No chips or reserve consumed."
        />
      </Dialog>
    );
  }

  const reduced = rebuy.reducedCoverage !== null;
  return (
    <Dialog
      visible
      title={title}
      confirmLabel={`${reduced ? 'Accept & issue' : 'Issue rebuy'} · ${rebuy.priceText}`}
      confirmLoading={busy}
      confirmLoadingLabel="Issuing…"
      onConfirm={confirm}
      cancelLabel={reduced ? 'Decline' : 'Cancel'}
      onCancel={cancel}
    >
      <HandoutStackShowcase stack={rebuy.stack} />
      {rebuy.reducedCoverage ? <CoverageWarning coverage={rebuy.reducedCoverage} /> : null}
      <IssueFacts
        reserveLabel="Reserve after rebuy"
        reserveAfter={rebuy.reserveAfter}
        rows={[{ label: 'New total contribution', value: rebuy.newTotalText }]}
        extraFacts={rebuy.extraFacts}
      />
      {rebuy.reserveNote ? <Text variant="supporting">{rebuy.reserveNote}</Text> : null}
      {note ? <Text variant="supporting">{note}</Text> : null}
    </Dialog>
  );
}
