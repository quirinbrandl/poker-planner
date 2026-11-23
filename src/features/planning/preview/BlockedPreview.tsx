import { StyleSheet, View } from 'react-native';

import type { PlanningView, StepId } from '@/game-management';
import { Badge, BadgeRow, Button, Card, colors, space, Stack, Text, toneColors } from '@/ui';

type Blocker = PlanningView['preview']['blockers'][number];

/** The direct fix action for one Setup incomplete row. */
export function blockerActionLabel(blocker: Blocker, playerCount: number): string {
  switch (blocker.step) {
    case 'players':
      return `Edit players (${playerCount})`;
    case 'chipSet':
      return 'Edit chip set';
    case 'settings':
      return 'Edit game settings';
    case 'payouts':
      return blocker.problems[0]?.code === 'payoutScheduleMissing' ? 'Choose payouts' : 'Fix payouts';
    default:
      return `Edit ${blocker.title.toLowerCase()}`;
  }
}

/** "Setup incomplete": each step with problems, its first problem and a button that opens it. */
export function SetupIncompleteCard({
  blockers,
  playerCount,
  onOpenStep,
}: {
  blockers: PlanningView['preview']['blockers'];
  playerCount: number;
  onOpenStep: (step: StepId) => void;
}) {
  return (
    <Card gap={space.md} style={styles.card}>
      <BadgeRow>
        <Badge label="Setup incomplete" tone="error" icon="warning" />
      </BadgeRow>
      {blockers.map((blocker, index) => (
        <View key={blocker.step} style={[styles.blocker, index > 0 && styles.divided]}>
          <View style={styles.blockerText}>
            <Text variant="bodyStrong">{blocker.title}</Text>
            {blocker.problems[0] ? <Text variant="supporting">{blocker.problems[0].message}</Text> : null}
          </View>
          <Button
            label={blockerActionLabel(blocker, playerCount)}
            icon="edit"
            variant="primary"
            onPress={() => onOpenStep(blocker.step)}
          />
        </View>
      ))}
    </Card>
  );
}

/** "No valid distribution" (also used for a chip set too complex to work out): the shortfall and the recovery steps. */
export function NoDistributionCard({
  title,
  message,
  playerCount,
  steps,
  onOpenStep,
}: {
  title: string;
  message: string;
  playerCount: number;
  /** Recovery steps in order; the first is the primary action. */
  steps: readonly ('chipSet' | 'settings' | 'players')[];
  onOpenStep: (step: StepId) => void;
}) {
  const labels = { chipSet: 'Edit chip set', settings: 'Edit game settings', players: `Edit players (${playerCount})` };
  return (
    <Card gap={space.md} style={styles.card}>
      <BadgeRow>
        <Badge label="No valid distribution" tone="error" icon="warning" />
      </BadgeRow>
      <Stack gap="xs">
        <Text variant="sectionTitle">{title}</Text>
        <Text variant="supporting">{message}</Text>
      </Stack>
      <Stack gap="sm">
        {steps.map((step, index) => (
          <Button
            key={step}
            label={labels[step]}
            icon="edit"
            variant={index === 0 ? 'primary' : 'secondary'}
            fullWidth
            onPress={() => onOpenStep(step)}
          />
        ))}
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: toneColors.error.border },
  blocker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: space.md,
    rowGap: space.sm,
  },
  divided: { paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.divider },
  blockerText: { flexGrow: 1, flexShrink: 1, flexBasis: 160, minWidth: 0, gap: space.xxs },
});
