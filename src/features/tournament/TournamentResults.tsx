import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { WorkspaceFrame, type WorkspaceTab } from '@/features/game/WorkspaceFrame';
import {
  Button,
  colors,
  Dialog,
  ListRow,
  PlaceBadge,
  SectionHeading,
  space,
  StatusCard,
  Text,
} from '@/ui';

import type { FinisherRow, TournamentResultsData } from './types';

export interface TournamentResultsProps {
  data: TournamentResultsData;
  onSelectTab: (tab: WorkspaceTab) => void;
  onBack: () => void;
  onMore: () => void;
  /** Opens the finishing-order editor. */
  onEditOrder: () => void;
  onOpenPlayer: (playerId: string) => void;
  /** Only with a winner: continue to the (shared) Calculate Payments step. */
  onCalculatePayments: () => void;
  /** Development fixtures: show the "Can't calculate Payments yet" explanation on load. */
  initialBlockedOpen?: boolean;
}

function finisherLabel(row: FinisherRow): string {
  const detail = row.isWinner ? `winner, ${row.contributionText}` : row.contributionText;
  return `${row.name}, ${row.placeLabel} place, ${detail}, ${row.paid ? `payout ${row.payoutText}` : 'no payout'}`;
}

/**
 * Tournament Results: how far the finishing order is, the order itself (open places as one line,
 * then everyone out, best place first) and Calculate Payments…, which needs a winner.
 */
export function TournamentResults({
  data,
  onSelectTab,
  onBack,
  onMore,
  onEditOrder,
  onOpenPlayer,
  onCalculatePayments,
  initialBlockedOpen = false,
}: TournamentResultsProps) {
  const { status, calculate } = data;
  const [blockedOpen, setBlockedOpen] = useState(initialBlockedOpen && calculate.kind === 'blocked');

  return (
    <WorkspaceFrame
      phase={data.phase}
      context={data.frame.context}
      backLabel={data.frame.backLabel}
      tab="results"
      onSelectTab={onSelectTab}
      onBack={onBack}
      onMore={onMore}
      reopened={data.reopened}
    >
      {status.kind === 'incomplete' ? (
        <StatusCard
          tone="primary"
          ringText={status.ringText}
          title={status.title}
          description={status.names}
          progress={{ value: status.recorded, max: status.needed, accessibilityLabel: status.progressLabel }}
        />
      ) : (
        <StatusCard tone="confirmed" title={status.title} description={status.description} />
      )}
      <View>
        <SectionHeading
          title="Finishing order"
          action={data.canEditOrder ? { label: 'Edit order', icon: 'edit', onPress: onEditOrder } : undefined}
        />
        {data.openPlaces ? (
          <View
            accessible
            accessibilityLabel={`${data.openPlaces.rangeLabel} place, ${data.openPlaces.description}`}
            style={[styles.open, data.finishers.length > 0 && styles.divider]}
          >
            <PlaceBadge label={data.openPlaces.rangeLabel} />
            <Text tone="supporting" style={styles.openText}>
              {data.openPlaces.description}
            </Text>
          </View>
        ) : null}
        {data.finishers.map((row, index) => (
          <ListRow
            key={row.playerId}
            title={row.name}
            subtitle={row.contributionText}
            leading={<PlaceBadge label={row.placeLabel} highlight={row.paid} filled={row.isWinner} />}
            trailing={
              row.paid ? (
                <Text variant="title" tabular>
                  {row.payoutText}
                </Text>
              ) : undefined
            }
            accessibilityLabel={finisherLabel(row)}
            onPress={() => onOpenPlayer(row.playerId)}
            divider={index < data.finishers.length - 1}
          />
        ))}
      </View>
      {/* Completed: the "Completed" badge in the game line says it; how to change it is in Game details. */}
      {calculate.kind === 'readOnly' ? null : (
        <View style={styles.calculate}>
          <Button
            label="Calculate Payments…"
            icon="calculator"
            variant="primary"
            fullWidth
            unavailable={calculate.kind === 'blocked'}
            accessibilityHint={calculate.kind === 'blocked' ? calculate.message : undefined}
            onUnavailablePress={() => setBlockedOpen(true)}
            onPress={onCalculatePayments}
          />
          {calculate.kind === 'blocked' ? (
            <Text variant="supporting" align="center">
              {calculate.message}
            </Text>
          ) : null}
        </View>
      )}
      <Dialog
        visible={blockedOpen && calculate.kind === 'blocked'}
        title="Can’t calculate Payments yet"
        cancelLabel="OK"
        onCancel={() => setBlockedOpen(false)}
      >
        <Text>
          {calculate.kind === 'blocked'
            ? `${calculate.stillPlayingText} still playing. ${calculate.message}`
            : ''}
        </Text>
      </Dialog>
    </WorkspaceFrame>
  );
}

const styles = StyleSheet.create({
  open: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  openText: { flex: 1, minWidth: 0 },
  calculate: { gap: space.sm },
});
