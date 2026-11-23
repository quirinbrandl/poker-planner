import { StyleSheet, View } from 'react-native';

import { type ChipColor } from '@/domain/types';
import { Text } from '../Text';
import { space } from '../theme';
import { ChipSymbol } from './ChipSymbol';
import { chipColorName } from './palette';

export interface ChipTrayItem {
  key: string;
  color: ChipColor | null;
  /** Chip-unit value as text ("25"). */
  value: string;
}

export interface ChipTrayProps {
  chips: readonly ChipTrayItem[];
  accessibilityLabel?: string;
}

/**
 * Compact chip preview of a chip set: one chip symbol per denomination with its value and colour
 * name underneath. Wraps onto further lines. Used in the template picker and template list.
 */
export function ChipTray({ chips, accessibilityLabel = 'Chip denominations' }: ChipTrayProps) {
  return (
    <View accessibilityRole="list" accessibilityLabel={accessibilityLabel} style={styles.tray}>
      {chips.map((chip) => {
        const name = chipColorName(chip.color);
        return (
          <View
            key={chip.key}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${chip.value} chip units, ${name}`}
            style={styles.item}
          >
            <ChipSymbol color={chip.color} value={chip.value} size={44} />
            <Text variant="bodyStrong" align="center" tabular>
              {chip.value}
            </Text>
            <Text variant="caption" tone="supporting" align="center">
              {name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tray: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.sm, rowGap: space.md },
  item: { width: 76, alignItems: 'center', gap: space.xxs },
});
