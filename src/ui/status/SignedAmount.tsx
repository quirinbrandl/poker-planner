import { StyleSheet, View } from 'react-native';

import { Text, type TextTone } from '../Text';

/** Direction of a signed money amount. The caption word must say the same thing (Won/Lost/Even, Gets/Pays). */
export type AmountDirection = 'gain' | 'loss' | 'even';

export interface SignedAmountProps {
  /** Pre-formatted amount, e.g. "+EUR 13.00" or "−EUR 8.00". */
  amount: string;
  direction: AmountDirection;
  /** Word under the amount: "Won", "Lost", "Break-even", "Gets", "Pays", "Even". */
  caption: string;
  /** `large` for hero summaries. */
  size?: 'regular' | 'large';
  align?: 'left' | 'right';
}

const tone: Record<AmountDirection, TextTone> = { gain: 'confirmed', loss: 'error', even: 'even' };

/** Signed EUR amount with its meaning in words below it. */
export function SignedAmount({ amount, direction, caption, size = 'regular', align = 'right' }: SignedAmountProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${caption} ${amount.replace('−', 'minus ')}`}
      style={[styles.wrap, { alignItems: align === 'right' ? 'flex-end' : 'flex-start' }]}
    >
      <Text variant={size === 'large' ? 'amountLarge' : 'amount'} tone={tone[direction]} tabular>
        {amount}
      </Text>
      <Text variant="caption" tone="supporting">
        {caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: 0 } });
