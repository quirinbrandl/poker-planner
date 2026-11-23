import { StyleSheet, View } from 'react-native';

import { Button, Card, Dialog, FactRow, PlaceBadge, SignedAmount, space, Text } from '@/ui';

import { ChangeRows } from './ChangeRows';
import type { BackInData, TournamentPlayerResult } from './types';

export interface TournamentResultCardProps {
  result: TournamentPlayerResult;
}

/**
 * Player page, a finished player: the place, Won / Lost, then Payout and All contributions.
 * Placed at the top of the shared player page shell.
 */
export function TournamentResultCard({ result }: TournamentResultCardProps) {
  return (
    <View style={styles.section}>
      <Card padding={space.xl}>
        <View style={styles.card}>
          <PlaceBadge label={result.placeLabel} highlight={result.paid} />
          <View style={styles.texts}>
            <Text variant="supporting">{result.statusText}</Text>
            <SignedAmount
              amount={result.balanceText}
              direction={result.direction}
              caption={result.balanceCaption}
              size="large"
              align="left"
            />
          </View>
        </View>
      </Card>
      <View>
        <FactRow label="Payout" value={result.payoutText} />
        <FactRow label="All contributions" value={result.contributionsText} divider={false} />
      </View>
    </View>
  );
}

export interface BackInButtonProps {
  name: string;
  onPress: () => void;
}

/** "Back in the game…" on an eliminated player's page. Opens `BackInDialog`. */
export function BackInButton({ name, onPress }: BackInButtonProps) {
  return (
    <Button
      label="Back in the game…"
      icon="undo"
      fullWidth
      accessibilityLabel={`Put ${name} back in the game…`}
      onPress={onPress}
    />
  );
}

export interface BackInDialogProps {
  visible: boolean;
  data: BackInData;
  /** The elimination is being removed: the confirm shows busy and cannot run twice. */
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * "<name> back in the game?": removes the elimination only (no rebuy). Lists the place shifts, a
 * withdrawn winner and reopened late entry, as game management words them.
 */
export function BackInDialog({ visible, data, busy, onConfirm, onCancel }: BackInDialogProps) {
  return (
    <Dialog
      visible={visible}
      title={`${data.name} back in the game?`}
      confirmLabel="Back in the game"
      confirmLoading={busy}
      confirmLoadingLabel="Saving…"
      onConfirm={() => {
        if (!busy) onConfirm();
      }}
      onCancel={onCancel}
    >
      <Text>{`Removes ${data.name}’s elimination. To buy back in, give ${data.name} a rebuy afterwards.`}</Text>
      <ChangeRows rows={data.changes} />
    </Dialog>
  );
}

export interface StaysOutLineProps {
  name: string;
  /** "6th". */
  placeLabel: string;
}

/** Under the forgotten-rebuy editor's lead for an eliminated player: "Felix stays out · 6th." */
export function StaysOutLine({ name, placeLabel }: StaysOutLineProps) {
  return <Text variant="supporting">{`${name} stays out · ${placeLabel}.`}</Text>;
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  card: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.lg },
  texts: { flexGrow: 1, flexShrink: 1, flexBasis: 160, gap: space.xs },
});
