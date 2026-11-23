import { View } from 'react-native';

import { WorkspaceFrame, type WorkspaceTab } from '@/features/game/WorkspaceFrame';
import { ListRow, PlaceBadge, SectionHeading, SignedAmount, Stack, StatusCard, TransferCard } from '@/ui';

import { BALANCE_CAPTION, NO_PAYMENTS_DESCRIPTION, NO_PAYMENTS_TITLE } from './texts';
import type { BalanceRow, PaymentsData } from './types';

export interface PaymentsViewProps {
  data: PaymentsData;
  /** "History" when the game was opened from History, otherwise "Games". */
  backLabel: 'Games' | 'History';
  onBack: () => void;
  /** Opens the game actions (⋯). */
  onMore: () => void;
  /** Results or Game details. */
  onSelectTab: (tab: Exclude<WorkspaceTab, 'payments'>) => void;
  /** Opens that player's read-only page. */
  onOpenPlayer: (participantId: string) => void;
}

/**
 * "EUR 33.00 chips · EUR 20.00 buy-ins" may wrap only at the "·": each part keeps its spaces and
 * hyphen unbreakable, so no amount or word is split. The spoken name uses the plain text.
 */
function keepPartsWhole(line: string): string {
  return line
    .split(' · ')
    .map((part) => part.replace(/ /g, '\u00a0').replace(/-/g, '\u2011'))
    .join(' · ');
}

function Balance({ row, onPress }: { row: BalanceRow; onPress: () => void }) {
  const caption = BALANCE_CAPTION[row.direction];
  const spoken = [row.name, row.placeLabel, ...row.lines, `${caption} ${row.balanceText}`].filter(Boolean).join(', ');
  return (
    <ListRow
      title={row.name}
      titleAside={row.placeLabel ? <PlaceBadge label={row.placeLabel} highlight={row.placeHighlight} filled={row.placeHighlight} /> : undefined}
      subtitle={row.lines.map(keepPartsWhole)}
      trailing={<SignedAmount amount={row.balanceText} direction={row.direction} caption={caption} />}
      accessibilityLabel={spoken}
      onPress={onPress}
    />
  );
}

/**
 * Completed → Payments: "N payments" with one card per payment (or No payments needed), then
 * Balances with one supporting line each. Read-only; nothing here marks anything paid.
 */
export function PaymentsView({ data, backLabel, onBack, onMore, onSelectTab, onOpenPlayer }: PaymentsViewProps) {
  const { summary } = data;
  return (
    <WorkspaceFrame
      phase="completed"
      context={data.context}
      tab="payments"
      onSelectTab={(tab) => {
        if (tab !== 'payments') onSelectTab(tab);
      }}
      backLabel={backLabel}
      onBack={onBack}
      onMore={onMore}
    >
      {summary.kind === 'payments' ? (
        <Stack gap="sm">
          <SectionHeading title={summary.countText} size="large" />
          {summary.payments.map((payment) => (
            <TransferCard key={payment.id} from={payment.fromName} to={payment.toName} amount={payment.amountText} />
          ))}
        </Stack>
      ) : (
        <StatusCard tone="confirmed" title={NO_PAYMENTS_TITLE} description={NO_PAYMENTS_DESCRIPTION} />
      )}
      <Stack gap="xs">
        <SectionHeading title="Balances" />
        <View>
          {data.balances.map((row) => (
            <Balance key={row.participantId} row={row} onPress={() => onOpenPlayer(row.participantId)} />
          ))}
        </View>
      </Stack>
    </WorkspaceFrame>
  );
}
