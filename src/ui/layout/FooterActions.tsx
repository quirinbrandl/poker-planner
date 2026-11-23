import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../Text';
import { colors, space } from '../theme';

export interface FooterActionsProps {
  /** Short status line above the buttons, e.g. "Draft saved · no chips issued", or a blocker reason. */
  note?: string;
  /** Tone of the note. Default supporting. */
  noteTone?: 'supporting' | 'warning' | 'error';
  /**
   * Buttons, usually `<Button label="Back" icon="chevronLeft" />` then the primary action.
   * They share a row and wrap to a column at large text; the last child takes the remaining width.
   */
  children: ReactNode;
}

/** The task footer ("dock"): full-bleed raised band at the end of the Screen content. */
export function FooterActions({ note, noteTone = 'supporting', children }: FooterActionsProps) {
  const insets = useSafeAreaInsets();
  const items = Array.isArray(children) ? children.filter(Boolean) : [children];
  return (
    <View
      style={[
        styles.dock,
        {
          paddingBottom: insets.bottom + space.xl,
          marginLeft: -(insets.left + space.gutter),
          marginRight: -(insets.right + space.gutter),
          paddingLeft: insets.left + space.gutter,
          paddingRight: insets.right + space.gutter,
        },
      ]}
    >
      {note ? (
        <Text variant="caption" tone={noteTone} accessibilityLiveRegion="polite">
          {note}
        </Text>
      ) : null}
      <View style={styles.actions}>
        {items.map((child, index) => (
          <View key={index} style={index === items.length - 1 ? styles.last : styles.item}>
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    gap: space.md,
    paddingTop: space.xl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  item: { flexGrow: 0, flexShrink: 0, minWidth: 110 },
  last: { flexGrow: 1, flexBasis: 160 },
});
