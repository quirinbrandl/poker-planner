import { StyleSheet, View } from 'react-native';

import { Button, Dialog, FactRow, space, Text } from '@/ui';

import type { EliminationPreview } from './types';

export interface OutDialogProps {
  visible: boolean;
  /** The player who might be out; `null` keeps the dialog closed. */
  player: { name: string; elimination: EliminationPreview } | null;
  /** Offers "Several out in the same hand…" (three or more left). */
  sameHandAvailable: boolean;
  /** The elimination is being recorded: the confirm shows busy and cannot run twice. */
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Buying back in: open the rebuy popup instead of recording an elimination. */
  onRebuyInstead: () => void;
  /** Several out in one hand: switch to "Out in the same hand". */
  onSameHand: () => void;
}

/** "<name> is out?": the finishing place and payout the elimination records, before it is recorded. */
export function OutDialog({
  visible,
  player,
  sameHandAvailable,
  busy,
  onConfirm,
  onCancel,
  onRebuyInstead,
  onSameHand,
}: OutDialogProps) {
  if (!player) return null;
  const { name, elimination } = player;
  const rows: { label: string; value: string }[] = [
    { label: 'Finishing place', value: elimination.placeLabel },
    { label: 'Payout', value: elimination.payoutText },
  ];
  if (elimination.winner) {
    rows.push({ label: 'Winner', value: `${elimination.winner.name} · ${elimination.winner.payoutText}` });
  }
  if (elimination.closesLateEntry) rows.push({ label: 'Late entry', value: 'Closes' });

  return (
    <Dialog
      visible={visible}
      title={`${name} is out?`}
      confirmLabel={`${name} is out`}
      confirmIcon="exit"
      confirmLoading={busy}
      confirmLoadingLabel="Recording…"
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <Text>
        {`${name} finishes `}
        <Text strong>{elimination.placeLabel}</Text>
        {'.'}
        {elimination.winner ? ` ${elimination.winner.name} is the last player left and wins.` : ''}
      </Text>
      <View>
        {rows.map((row, index) => (
          <FactRow key={row.label} label={row.label} value={row.value} divider={index < rows.length - 1} />
        ))}
      </View>
      <View style={styles.line}>
        <Text>Buying back in?</Text>
        <Button
          label="Rebuy instead"
          variant="tertiary"
          accessibilityLabel={`Rebuy for ${name} instead`}
          onPress={onRebuyInstead}
        />
      </View>
      {sameHandAvailable ? (
        <Button label="Several out in the same hand…" variant="tertiary" alignStart onPress={onSameHand} />
      ) : null}
    </Dialog>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.xs },
});
