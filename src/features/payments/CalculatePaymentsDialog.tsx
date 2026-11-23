import { StyleSheet, View } from 'react-native';

import { useSingleConfirm } from '@/features/game/useSingleConfirm';
import { colors, Dialog, FactRow, Icon, space, Text } from '@/ui';

import { CALCULATE_FINISH_LINE, CALCULATE_LABEL, CALCULATE_TITLE, CALCULATING_LABEL } from './texts';
import type { CalculatePaymentsData } from './types';

export interface CalculatePaymentsDialogProps {
  visible: boolean;
  data: CalculatePaymentsData;
  /** True while Calculate Payments runs: the button reads “Calculating…” and nothing can be pressed twice. */
  busy: boolean;
  /** Calculate Payments: finish the game. */
  onConfirm: () => void;
  /** Cancel, back or backdrop: nothing changes. */
  onCancel: () => void;
}

/**
 * Calculate Payments?: the ready line, the tournament's prize pool and paid places, the finish line,
 * then Cancel / Calculate Payments. While busy, neither action runs again.
 */
export function CalculatePaymentsDialog({ visible, data, busy, onConfirm, onCancel }: CalculatePaymentsDialogProps) {
  const { confirm, cancel } = useSingleConfirm(visible, busy, onConfirm, onCancel);
  return (
    <Dialog
      visible={visible}
      title={CALCULATE_TITLE}
      confirmLabel={CALCULATE_LABEL}
      confirmLoading={busy}
      confirmLoadingLabel={CALCULATING_LABEL}
      onConfirm={confirm}
      onCancel={cancel}
    >
      <View style={styles.ready} accessible accessibilityLabel={data.readyLine}>
        <Icon name="check" size={20} color={colors.confirmed} />
        <Text variant="bodyStrong" tone="confirmed" style={styles.readyText}>
          {data.readyLine}
        </Text>
      </View>
      {data.facts.length > 0 ? (
        <View>
          {data.facts.map((fact, index) => (
            <FactRow key={fact.label} label={fact.label} value={fact.value} divider={index < data.facts.length - 1} />
          ))}
        </View>
      ) : null}
      <Text>{CALCULATE_FINISH_LINE}</Text>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  ready: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs + 2 },
  readyText: { flexShrink: 1 },
});
