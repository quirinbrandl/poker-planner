import { View } from 'react-native';

import { WorkspaceFrame, type WorkspaceTab } from '@/features/game/WorkspaceFrame';
import { ListRow, PlaceBadge, SectionHeading, SignedAmount, Stack, StatusCard, Text, TransferCard } from '@/ui';

import { BALANCE_CAPTION, NO_PAYMENTS_DESCRIPTION, NO_PAYMENTS_TITLE, PAYMENTS_LEAD } from './texts';
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

function Balance({ row, onPress }: { row: BalanceRow; onPress: () => void }) {
  const caption = BALANCE_CAPTION[row.direction];
  const spoken = [row.name, row.placeLabel, ...row.lines, `${caption} ${row.balanceText}`].filter(Boolean).join(', ');
  return (
    <ListRow
      title={row.name}
      titleAside={row.placeLabel ? <PlaceBadge label={row.placeLabel} highlight={row.placeHighlight} /> : undefined}
      subtitle={row.lines}
      trailing={<SignedAmount amount={row.balanceText} direction={row.direction} caption={caption} />}
      accessibilityLabel={spoken}
      onPress={onPress}
    />
  );
}

/**
 * Completed → Payments, layout A: the lead line, "N payments · EUR x in total" with one card per
 * payment (or No payments needed), then Balances. Read-only; nothing here marks anything paid.
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
      <Text variant="supporting">{PAYMENTS_LEAD}</Text>
      {summary.kind === 'payments' ? (
        <Stack gap="sm">
          <SectionHeading title={summary.countText} size="large" aside={summary.totalText} />
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
