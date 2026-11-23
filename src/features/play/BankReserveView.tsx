import { StyleSheet, View } from 'react-native';

import { Card, ChipPill, ChipPillRow, ProgressBar, Screen, ScreenHeader, space, Text, TopBar } from '@/ui';

import type { BankReserveData } from './types';

export interface BankReserveViewProps {
  data: BankReserveData;
  /** "Back to Play", or "Back to player selection" when opened from late entry. */
  backLabel: string;
  /** Leaves the view; nothing here changes the game. */
  onBack: () => void;
  onMore: () => void;
}

/**
 * Bank & reserve: the chips the bank holds (one pill per denomination, the total value as the
 * headline) and how much of the shared reserve target is left. Read-only; opened from Play's
 * reserve line or a blocked request. When corrections weakened the reserve, one extra line says
 * how many stacks can be formed now.
 */
export function BankReserveView({ data, backLabel, onBack, onMore }: BankReserveViewProps) {
  const { reserve } = data;
  return (
    <Screen topBar={<TopBar backLabel={backLabel} onBack={onBack} onMore={onMore} />}>
      <ScreenHeader title="Bank & reserve" />
      <Card gap={space.lg}>
        <View style={styles.headline} accessible accessibilityLabel={`Bank: ${data.valueText}, ${data.chipsText}`}>
          <Text variant="sectionTitle">Bank</Text>
          <Text variant="amount" tabular>
            {data.valueText}
          </Text>
        </View>
        <ChipPillRow accessibilityLabel="Chips in the bank">
          {data.chips.map((chip) => (
            <ChipPill key={chip.value} color={chip.color} value={chip.value} count={chip.count} />
          ))}
        </ChipPillRow>
      </Card>
      <Card gap={space.md}>
        <View
          style={styles.headline}
          accessible
          accessibilityLabel={`Reserve: ${reserve.target > 0 ? `${reserve.leftText} left` : reserve.leftText}`}
        >
          <Text variant="sectionTitle">Reserve</Text>
          <Text variant="amount" tabular>
            {reserve.leftText}
          </Text>
        </View>
        {reserve.target > 0 ? (
          <ProgressBar
            value={reserve.left}
            max={reserve.target}
            accessibilityLabel={`${reserve.leftText} left`}
          />
        ) : null}
        {reserve.achievableNowText ? (
          <Text variant="supporting" tone="warning">
            {reserve.achievableNowText}
          </Text>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: space.md,
  },
});
