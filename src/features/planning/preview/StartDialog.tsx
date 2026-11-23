import { View } from 'react-native';

import { eurInputText } from '@/domain/money';
import { playerCountLabel } from '@/features/shared/format';
import type { DistributionPlanView } from '@/game-management';
import { Dialog, FactRow, Text } from '@/ui';

import { blindsDepthLabel, chipUnitsLabel, reserveStartLabel } from './texts';
import type { PreviewData } from './types';

export interface StartDialogProps {
  visible: boolean;
  plan: DistributionPlanView;
  payouts: PreviewData['payouts'];
  starting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** "Start cash game?" / "Start tournament?": what Start locks, then Cancel and the Start action. */
export function StartDialog({ visible, plan, payouts, starting, onConfirm, onCancel }: StartDialogProps) {
  const tournament = plan.money.kind === 'tournament';
  const startLabel = tournament ? 'Start tournament' : 'Start cash game';
  const rows: { label: string; value: string; unit?: string }[] = [
    { label: 'Each starting stack', value: chipUnitsLabel(plan.stack.value) },
    { label: 'Blinds', value: blindsDepthLabel(plan) },
  ];
  if (plan.money.kind === 'cash') {
    rows.push({ label: 'Buy-in', value: plan.money.buyInText, unit: `(${plan.money.rateText})` });
  } else {
    rows.push({
      label: 'Prize pool',
      value: `${plan.money.prizePoolText} (${plan.players} × ${eurInputText(plan.money.buyIn)})`,
    });
    if (payouts) rows.push({ label: 'Payouts', value: payouts.places.map((place) => place.shareText).join(' / ') });
  }
  rows.push({ label: 'Reserve', value: reserveStartLabel(plan) });

  return (
    <Dialog
      visible={visible}
      title={`${startLabel}?`}
      confirmLabel={startLabel}
      confirmLoading={starting}
      confirmLoadingLabel="Starting…"
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <Text>
        {`Records initial stacks for ${playerCountLabel(plan.players)} and locks setup${tournament ? ' and payouts' : ''}.`}
      </Text>
      <View>
        {rows.map((row, index) => (
          <FactRow key={row.label} label={row.label} value={row.value} unit={row.unit} divider={index < rows.length - 1} />
        ))}
      </View>
    </Dialog>
  );
}
