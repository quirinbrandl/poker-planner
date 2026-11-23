import { BlockedBody, HandoutStackShowcase, IssueFacts, useSingleConfirm } from '@/features/play/issuance';
import type { IssueBlockReason } from '@/features/play/types';
import { Dialog, Text } from '@/ui';

import type { EntryPopupData } from './types';

export interface EntryDialogProps {
  /** The popup's content; `null` keeps it closed. */
  entry: EntryPopupData | null;
  /** The host is adding the player: the confirm shows progress and cannot run again. */
  busy: boolean;
  /** Add the player and issue the shown stack. */
  onConfirm: () => void;
  /** Cancel, Back to player selection, Android back or a backdrop tap. Nobody joins. */
  onCancel: () => void;
  /** Open Bank & reserve from a blocked entry. */
  onViewBank: () => void;
}

function blockedReason(reason: IssueBlockReason): string {
  if (reason.kind === 'allocation') return reason.message;
  return `An exact ${reason.stackUnitsText}-unit stack is possible, but it covers only ${reason.achieved} of the required ${reason.required} payments of each blind. Late arrivals need full coverage; reduced coverage is for rebuys only.`;
}

/**
 * **Add <name>**: the actual fully qualifying stack and Reserve after entry, then
 * **Add <name> · EUR 20.00** (the button carries the initial contribution). A blocked entry (**Cannot add <name>**) has no accept action.
 */
export function EntryDialog({ entry, busy, onConfirm, onCancel, onViewBank }: EntryDialogProps) {
  const confirm = useSingleConfirm(busy, entry, onConfirm);
  const cancel = () => {
    if (!busy) onCancel();
  };
  if (!entry) return <Dialog visible={false} title="" onCancel={cancel} />;

  if (entry.kind === 'blocked') {
    return (
      <Dialog
        visible
        title={`Cannot add ${entry.name}`}
        cancelLabel="Back to player selection"
        onCancel={cancel}
        secondaryAction={{ label: 'View bank', onPress: onViewBank }}
      >
        <BlockedBody
          title="Entry blocked"
          reason={blockedReason(entry.reason)}
          unchanged={`${entry.name} has not joined. No contribution recorded; chips and reserve unchanged.`}
        />
      </Dialog>
    );
  }

  return (
    <Dialog
      visible
      title={`Add ${entry.name}`}
      confirmLabel={`Add ${entry.name} · ${entry.initialContributionText}`}
      confirmLoading={busy}
      confirmLoadingLabel="Adding…"
      onConfirm={confirm}
      onCancel={cancel}
    >
      <HandoutStackShowcase stack={entry.stack} />
      <IssueFacts
        reserveLabel="Reserve after entry"
        reserveAfter={entry.reserveAfter}
        rows={[]}
        extraFacts={entry.extraFacts}
      />
      {entry.reserveNote ? <Text variant="supporting">{entry.reserveNote}</Text> : null}
    </Dialog>
  );
}
