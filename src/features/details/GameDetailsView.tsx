import { StyleSheet, View } from 'react-native';

import { WorkspaceFrame, type WorkspaceTab } from '@/features/game/WorkspaceFrame';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ChipPill,
  ChipPillRow,
  ChipTowers,
  colors,
  FactRow,
  Icon,
  radii,
  SectionHeading,
  space,
  StackShowcase,
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
 * then the terms, the recorded starting stack as towers, the players as a wrapping set, the chip
 * set with colour names, and how to change it.
 */
export function GameDetailsView({ data, onViewBank, onSelectTab, onBack, onMore }: GameDetailsViewProps) {
  // Created and Finished are in the game line above the tabs.
  const facts: { label: string; value: string }[] = [
    { label: 'Buy-in / rebuy', value: data.buyInText },
    { label: data.mode === 'cash' ? 'Rate' : 'Chip value', value: data.chipValueText },
    { label: 'Blinds', value: data.blindsText },
    { label: 'Starting depth', value: data.depthText },
    { label: 'Blind coverage', value: data.coverageText },
    { label: 'Chips', value: data.preferenceText },
    { label: 'Reserve', value: data.reserveText },
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
        <Card gap={0}>
          <View style={styles.payoutsHeading}>
            <Text variant="sectionTitle" style={styles.grow}>{`Payouts · ${data.payouts.name}`}</Text>
            <Badge label="Locked" icon="lock" size="small" />
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
          <Text variant="supporting" style={styles.payoutsNote}>
            {data.payouts.note}
          </Text>
        </Card>
      ) : null}

      <Card gap={0}>
        {facts.map((fact, index) => (
          <FactRow key={fact.label} label={fact.label} value={fact.value} divider={index < facts.length - 1} />
        ))}
      </Card>

      <StackShowcase label="Starting stack" value={data.startingStack.unitsText} unit="chip units">
        <ChipTowers
          columns={data.startingStack.chips}
          accessibilityLabel="Recorded starting stack"
        />
      </StackShowcase>

      <View style={styles.group}>
        <SectionHeading title={`Players · ${data.players.length}`} />
        <View accessibilityRole="list" style={styles.players}>
          {data.players.map((player) => (
            <View
              key={player.id}
              accessible
              accessibilityLabel={player.note ? `${player.name}, ${player.note.toLowerCase()}` : player.name}
              style={styles.player}
            >
              <Avatar name={player.name} size={28} />
              <Text variant="bodyStrong">{player.name}</Text>
              {player.note ? <Badge label="late" size="small" /> : null}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <SectionHeading title="Chip set" />
        <ChipPillRow accessibilityLabel="Configured chip set">
          {data.chipSet.map((chip) => (
            <ChipPill key={chip.value} color={chip.color} value={chip.value} count={chip.count} showValue showColorName />
          ))}
        </ChipPillRow>
      </View>

      {onViewBank && data.phase === 'inProgress' ? (
        <Button label="View current bank & reserve" icon="reserve" fullWidth onPress={onViewBank} />
      ) : null}

      <View style={styles.locked}>
        <Icon name="lock" size={20} color={colors.textSupporting} />
        <Text variant="supporting" style={styles.grow}>
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
    paddingBottom: space.sm,
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
  payoutsNote: { paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.divider },
  players: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
    paddingLeft: space.xs,
    paddingRight: space.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    maxWidth: '100%',
  },
  locked: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
});
