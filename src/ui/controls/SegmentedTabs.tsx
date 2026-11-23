import { Pressable, StyleSheet, View } from 'react-native';

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
    flexBasis: 80,
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
