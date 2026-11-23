import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { usePressFeedback } from '../motion';
import { Text } from '../Text';
import { colors, radii, space, touchTarget } from '../theme';

export interface TabItem<K extends string = string> {
  key: K;
  label: string;
}

export interface SegmentedTabsProps<K extends string = string> {
  tabs: readonly TabItem<K>[];
  selectedKey: K;
  onChange: (key: K) => void;
  /** Spoken name of the tab list. Default "Workspace". */
  accessibilityLabel?: string;
}

/** Workspace navigation (Play / Results / Game details). Wraps to more rows at large text. */
export function SegmentedTabs<K extends string>({
  tabs,
  selectedKey,
  onChange,
  accessibilityLabel = 'Workspace',
}: SegmentedTabsProps<K>) {
  const feedback = usePressFeedback();
  // The width a tab asks for grows with the text size, so tabs wrap to a new row before a label
  // would break inside a word.
  const { fontScale } = useWindowDimensions();
  const basis = TAB_BASIS * Math.max(1, fontScale || 1);
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={styles.list}>
      {tabs.map((tab) => {
        const selected = tab.key === selectedKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            aria-selected={selected}
            style={({ pressed }) => [
              styles.tab,
              { flexBasis: basis },
              selected && styles.selected,
              !selected && feedback(pressed, colors.surface),
            ]}
          >
            <Text variant="supporting" tone={selected ? 'primary' : 'main'} align="center" style={styles.label}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const TAB_BASIS = 80;

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    padding: space.xs,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.field + 1,
  },
  tab: {
    flexGrow: 1,
    minHeight: touchTarget + 4,
    paddingHorizontal: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.control - 1,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: { backgroundColor: colors.selectedTint, borderColor: colors.primary },
  label: { fontWeight: '500' },
});
