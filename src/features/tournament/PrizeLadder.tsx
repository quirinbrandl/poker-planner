import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Card, colors, PlaceBadge, radii, ShareBar, space, Text, usePressFeedback } from '@/ui';

import type { PrizePoolData, PrizeRung } from './types';

export interface PrizeLadderProps {
  prizePool: PrizePoolData;
  /** Opens the player page of a rung's holder. */
  onOpenPlayer: (playerId: string) => void;
}

/**
 * The Standings hero: the prize pool with one rung per paid place (share bar and amount), each
 * "Open" until someone finishes there. Continues the approved Prize ladder of the payout schedule.
 */
export function PrizeLadder({ prizePool, onOpenPlayer }: PrizeLadderProps) {
  return (
    <Card variant="highlight" padding={space.xl} gap={space.md}>
      <View accessible accessibilityLabel={`Prize pool ${prizePool.amountText}, ${prizePool.detail}`} style={styles.head}>
        <Text variant="overline" tone="even" style={styles.overline}>
          Prize pool
        </Text>
        <View style={styles.amountRow}>
          <Text variant="amountHero" style={styles.amount}>
            {prizePool.amountText}
          </Text>
          <Text variant="supporting">{prizePool.detail}</Text>
        </View>
      </View>
      <View style={styles.rungs}>
        {prizePool.rungs.map((rung) => (
          <Rung key={rung.place} rung={rung} onOpenPlayer={onOpenPlayer} />
        ))}
      </View>
    </Card>
  );
}

function rungLabel(rung: PrizeRung): string {
  const who = rung.holder ? `${rung.holder.name}${rung.holder.isWinner ? ', winner' : ''}` : 'open';
  return `${rung.placeLabel} place, ${rung.shareText}, ${rung.amountText}, ${who}`;
}

function Rung({ rung, onOpenPlayer }: { rung: PrizeRung; onOpenPlayer: (playerId: string) => void }) {
  const feedback = usePressFeedback();
  const holder = rung.holder;
  const content = (
    <>
      <View style={styles.top}>
        <PlaceBadge label={rung.placeLabel} highlight />
        <View style={styles.who}>
          {holder ? (
            <Avatar name={holder.name} size={36} />
          ) : (
            <View style={styles.ghost}>
              <Text variant="label" tone="supporting" allowFontScaling={false}>
                ?
              </Text>
            </View>
          )}
          <View style={styles.whoText}>
            <Text variant={holder ? 'title' : 'body'} tone={holder ? 'main' : 'supporting'}>
              {holder ? holder.name : 'Open'}
            </Text>
            {holder?.isWinner ? <Text variant="supporting">Winner</Text> : null}
          </View>
        </View>
        <Text variant="amount" tabular style={styles.rungAmount}>
          {rung.amountText}
        </Text>
      </View>
      <ShareBar percent={rung.sharePercent} />
    </>
  );
  if (holder) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rungLabel(rung)}
        onPress={() => onOpenPlayer(holder.playerId)}
        style={({ pressed }) => [styles.rung, styles.filled, feedback(pressed, colors.surfacePressed)]}
      >
        {content}
      </Pressable>
    );
  }
  return (
    <View accessible accessibilityLabel={rungLabel(rung)} style={[styles.rung, styles.open]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { gap: space.xs },
  overline: { letterSpacing: 1.5 },
  amountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: space.md,
  },
  amount: { flexShrink: 1 },
  rungs: { gap: space.sm },
  rung: { borderRadius: radii.tile, borderWidth: 1, padding: space.lg, gap: space.md },
  open: { borderStyle: 'dashed', borderColor: colors.controlBorder },
  filled: { borderColor: colors.controlBorder },
  top: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.md },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexGrow: 1, flexShrink: 1, flexBasis: 100, minWidth: 0 },
  whoText: { flexShrink: 1, minWidth: 0 },
  ghost: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rungAmount: { marginLeft: 'auto' },
});
