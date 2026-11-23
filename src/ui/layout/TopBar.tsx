import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton } from '../controls/IconButton';
import { Icon, type IconName } from '../Icon';
import { usePressFeedback } from '../motion';
import { Text } from '../Text';
import { colors, radii, space, touchTarget } from '../theme';

export interface TopBarProps {
  /**
   * Back destination: "Games", "Play", "Players". A leading "Back to " is dropped from the visible
   * text ("Back to Play" shows "Play") and kept in the spoken name. Omit for a root screen.
   */
  backLabel?: string;
  onBack?: () => void;
  /** Spoken name; default "Back to <backLabel>", or the label itself when it already starts with "Back". */
  backAccessibilityLabel?: string;
  /** @deprecated Ignored: every back control shows the same chevron. Kept for compatibility. */
  backIcon?: IconName;
  /** Shows the ⋯ control. */
  onMore?: () => void;
  /** Spoken name of ⋯. Default "Game actions". */
  moreAccessibilityLabel?: string;
  /** Anything else for the right side (instead of or before ⋯). */
  trailing?: ReactNode;
}

/** Top row of a screen: a text back control and an optional ⋯ actions button. */
export function TopBar({
  backLabel,
  onBack,
  backAccessibilityLabel,
  onMore,
  moreAccessibilityLabel = 'Game actions',
  trailing,
}: TopBarProps) {
  const feedback = usePressFeedback();
  const visibleBack = backLabel?.replace(/^back to\s+/i, '');
  return (
    <View style={styles.bar}>
      {backLabel && onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backAccessibilityLabel ?? (/^back\b/i.test(backLabel) ? backLabel : `Back to ${backLabel}`)}
          style={({ pressed }) => [styles.back, feedback(pressed, colors.surface)]}
        >
          <Icon name="chevronLeft" size={22} color={colors.text} />
          <Text variant="body" style={styles.backText}>
            {visibleBack}
          </Text>
        </Pressable>
      ) : (
        <View />
      )}
      <View style={styles.trailing}>
        {trailing}
        {onMore ? (
          <IconButton icon="more" variant="plain" accessibilityLabel={moreAccessibilityLabel} onPress={onMore} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space.sm,
    minHeight: touchTarget,
    marginBottom: space.md,
    marginHorizontal: -space.md,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: touchTarget,
    paddingHorizontal: space.md,
    borderRadius: radii.control,
  },
  backText: { fontSize: 18 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
