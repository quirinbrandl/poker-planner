import { StyleSheet, View } from 'react-native';

import { WorkspaceFrame, type WorkspaceTab } from '@/features/game/WorkspaceFrame';
import {
  Badge,
  Button,
  Card,
  ChipPill,
  ChipPillRow,
  colors,
  FactRow,
  Icon,
  ListRow,
  SectionHeading,
  space,
  Text,
} from '@/ui';

import type { GameDetailsData } from './types';

export interface GameDetailsViewProps {
  data: GameDetailsData;
  /** In progress only: opens Bank & reserve. Omit to hide the link. */
  onViewBank?: () => void;
  onSelectTab: (tab: WorkspaceTab) => void;
  onBack: () => void;
  onMore: () => void;
}

const CLOSING_LINE = {
  inProgress: 'Setup is locked. To change it, use ⋯ → Return to Planning.',
  completed: 'Read-only. To change something, reopen the game from ⋯.',
} as const;

/**
 * Game details: the started setup, read-only. Tournaments lead with the locked payout schedule;
 * then the terms, the recorded starting stack, the players and the chip set, and how to change it.
 */
export function GameDetailsView({ data, onViewBank, onSelectTab, onBack, onMore }: GameDetailsViewProps) {
  const facts: { label: string; value: string; stacked?: boolean }[] = [
    { label: 'Created', value: data.createdText },
    ...(data.finishedText ? [{ label: 'Finished', value: data.finishedText }] : []),
    { label: 'Buy-in / rebuy', value: data.buyInText },
    { label: data.mode === 'cash' ? 'Cash-game rate' : 'Chips', value: data.chipValueText },
    { label: 'Blinds', value: data.blindsText },
    { label: 'Starting depth', value: data.depthText },
    { label: 'Blind-payment coverage', value: data.coverageText, stacked: true },
    { label: 'Distribution preference', value: data.preferenceText },
    { label: 'Reserve at start', value: data.reserveText },
  ];
  return (
    <WorkspaceFrame
      phase={data.phase}
      context={data.context}
      tab="details"
      onSelectTab={onSelectTab}
      backLabel={data.backLabel}
      onBack={onBack}
      onMore={onMore}
    >
      {data.payouts ? (
        <View style={styles.group}>
          <Card gap={0}>
            <View style={styles.payoutsHeading}>
              <Text variant="sectionTitle" style={styles.grow}>{`Payouts · ${data.payouts.name}`}</Text>
              <Badge label="Locked" icon="lock" />
            </View>
            <View accessibilityRole="list" accessibilityLabel="Paid places">
              {data.payouts.places.map((place) => (
                <View
                  key={place.id}
                  accessible
                  accessibilityLabel={`${place.placeLabel} place, ${place.shareText}, ${place.amountText}`}
                  style={styles.place}
                >
                  <View style={styles.placeShare}>
                    <Text style={styles.placeLabel}>{place.placeLabel}</Text>
                    <Text tone="supporting" tabular>
                      {place.shareText}
                    </Text>
                  </View>
                  <Text variant="bodyStrong" tabular style={styles.amount}>
                    {place.amountText}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
          <Text variant="supporting">{data.payouts.note}</Text>
        </View>
      ) : null}

      <Card gap={0}>
        {facts.map((fact, index) => (
          <FactRow
            key={fact.label}
            label={fact.label}
            value={fact.value}
            stacked={fact.stacked}
            divider={index < facts.length - 1}
          />
        ))}
      </Card>

      <Card gap={space.md}>
        <Text variant="sectionTitle">{`Starting stack · ${data.startingStack.unitsText} chip units`}</Text>
        <ChipPillRow accessibilityLabel="Recorded starting stack">
          {data.startingStack.chips
            .filter((chip) => chip.count > 0)
            .map((chip) => (
              <ChipPill key={chip.value} color={chip.color} value={chip.value} count={chip.count} showValue />
            ))}
        </ChipPillRow>
      </Card>

      <View>
        <SectionHeading title={`Players · ${data.players.length}`} />
        {data.players.map((player, index) => (
          <ListRow
            key={player.id}
            title={player.name}
            subtitle={player.note ?? undefined}
            density="compact"
            divider={index < data.players.length - 1}
          />
        ))}
      </View>

      <View style={styles.group}>
        <SectionHeading title="Chip set" />
        <ChipPillRow accessibilityLabel="Configured chip set">
          {data.chipSet.map((chip) => (
            <ChipPill key={chip.value} color={chip.color} value={chip.value} count={chip.count} showValue />
          ))}
        </ChipPillRow>
      </View>

      {onViewBank && data.phase === 'inProgress' ? (
        <Button label="View current bank & reserve" icon="reserve" fullWidth onPress={onViewBank} />
      ) : null}

      <View style={styles.locked}>
        <Icon name="lock" size={20} color={colors.textSupporting} />
        <Text tone="supporting" style={styles.grow}>
          {CLOSING_LINE[data.phase]}
        </Text>
      </View>
    </WorkspaceFrame>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.md },
  grow: { flex: 1, minWidth: 0 },
  payoutsHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
    paddingBottom: space.md,
  },
  place: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: space.md,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  placeShare: { flexDirection: 'row', gap: space.xl, flexShrink: 1 },
  placeLabel: { minWidth: 40 },
  amount: { marginLeft: 'auto' },
  locked: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
});
