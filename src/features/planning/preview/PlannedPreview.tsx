import { StyleSheet, View } from 'react-native';

import type { DistributionPlanView } from '@/game-management';
import {
  Card,
  ChangePill,
  ChipPill,
  ChipPillRow,
  ChipTowers,
  colors,
  IconButton,
  MetricStrip,
  MetricTile,
  space,
  StackShowcase,
  Text,
} from '@/ui';

import { groupDigits, reserveCoverLabel, stacksLabel } from './texts';
import type { PreviewData } from './types';

export interface PlannedPreviewProps {
  plan: DistributionPlanView;
  payouts: PreviewData['payouts'];
  onEditPayouts: () => void;
}

/** A feasible recommendation: one starting stack as chip towers, the game terms, payouts and the bank. */
export function PlannedPreview({ plan, payouts, onEditPayouts }: PlannedPreviewProps) {
  return (
    <>
      <StackShowcase
        label="1 starting stack"
        value={groupDigits(plan.stack.value)}
        unit="chip units"
        adjustment={
          plan.depth.adjusted ? (
            <ChangePill
              from={`${plan.depth.requestedBb} BB`}
              to={`${plan.depth.bb} BB`}
              accessibilityLabel={`Depth adjusted from ${plan.depth.requestedBb} BB to ${plan.depth.bb} BB`}
            />
          ) : undefined
        }
      >
        <ChipTowers columns={plan.stack.mix} />
      </StackShowcase>

      <MetricStrip accessibilityLabel="Game terms">
        <BlindsTile plan={plan} />
        {plan.money.kind === 'cash' ? (
          <MetricTile label="Cash value" value={plan.money.buyInText} subLabel={plan.money.rateText} />
        ) : (
          <MetricTile label="Prize pool" value={plan.money.prizePoolText} subLabel="No chip money value" />
        )}
        <ReserveTile plan={plan} />
      </MetricStrip>

      {payouts ? <PayoutsCard payouts={payouts} onEdit={onEditPayouts} /> : null}

      <Card gap={space.md}>
        <View style={styles.bankHeading}>
          <Text variant="sectionTitle">{`Unissued bank (${groupDigits(plan.bank.chips)} chips)`}</Text>
          <Text variant="supporting">{reserveCoverLabel(plan.reserve.stacks)}</Text>
        </View>
        <ChipPillRow accessibilityLabel="Unissued bank">
          {plan.bank.mix.map((chip) => (
            <ChipPill key={chip.value} color={chip.color} value={chip.value} count={chip.count} showValue />
          ))}
        </ChipPillRow>
      </Card>
    </>
  );
}

function BlindsTile({ plan }: { plan: DistributionPlanView }) {
  if (plan.depth.adjusted) {
    return (
      <MetricTile
        label="Blinds"
        value={plan.blinds.text}
        subLabel={`${plan.depth.bb} BB`}
        adjustedFrom={`${plan.depth.requestedBb} BB`}
        adjusts="subLabel"
      />
    );
  }
  const depth = plan.blinds.rounded ? `Rounded SB · ${plan.depth.bb} BB` : `${plan.depth.bb} BB depth`;
  return <MetricTile label="Blinds" value={plan.blinds.text} subLabel={depth} />;
}

function ReserveTile({ plan }: { plan: DistributionPlanView }) {
  const { stacks, target, reduced } = plan.reserve;
  if (reduced) {
    return (
      <MetricTile
        label="Reserve"
        value={stacksLabel(stacks)}
        adjustedFrom={String(target)}
        subLabel={`${stacks} of ${target} possible`}
      />
    );
  }
  return <MetricTile label="Reserve" value={stacksLabel(stacks)} subLabel={stacks === 0 ? '0 stacks' : 'Shared in bank'} />;
}

function PayoutsCard({ payouts, onEdit }: { payouts: NonNullable<PreviewData['payouts']>; onEdit: () => void }) {
  return (
    <Card gap={0}>
      <View style={styles.payoutsHeading}>
        <Text variant="sectionTitle" style={styles.grow}>
          {`Payouts · ${payouts.name}`}
        </Text>
        <IconButton icon="edit" variant="plain" accessibilityLabel="Edit payout schedule" onPress={onEdit} />
      </View>
      <View accessibilityRole="list" accessibilityLabel="Paid places">
        {payouts.places.map((place) => (
          <View
            key={place.id}
            accessible
            accessibilityLabel={`${place.placeLabel} place, ${place.shareText}, ${place.amountText}`}
            style={styles.place}
          >
            <View style={styles.placeShare}>
              <Text variant="body" style={styles.placeLabel}>
                {place.placeLabel}
              </Text>
              <Text variant="body" tone="supporting" tabular>
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
  );
}

const styles = StyleSheet.create({
  bankHeading: { gap: space.xs },
  payoutsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: -space.sm,
    marginRight: -space.sm,
    paddingBottom: space.xs,
  },
  grow: { flex: 1, minWidth: 0 },
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
});
