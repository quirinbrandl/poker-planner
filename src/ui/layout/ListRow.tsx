import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '../Icon';
import { usePressFeedback } from '../motion';
import { Text } from '../Text';
import { colors, radii, space, touchTarget } from '../theme';

export interface ListRowProps {
  title: string;
  /** One or more supporting lines under the title. */
  subtitle?: string | readonly string[];
  /** Before the text: Avatar, ChipSymbol or Icon. */
  leading?: ReactNode;
  /** Right side inside the pressable area: SignedAmount, value text, meta count. */
  trailing?: ReactNode;
  /** Under the subtitle inside the row: Badges such as "Count draft". */
  tags?: ReactNode;
  /** Separate buttons beside the row (Rebuy / Result). They wrap under the row at large text. */
  actions?: ReactNode;
  /** Makes the main area one button. */
  onPress?: () => void;
  /** Spoken summary of the pressable area. Default: title, subtitle lines. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Show a chevron after the trailing content (navigation rows). */
  chevron?: boolean;
  /** Bottom hairline. Default true. */
  divider?: boolean;
  /** `plain` (default) or `compact` padding for link lists. */
  density?: 'regular' | 'compact';
  testID?: string;
}

/** Row for players, links and facts. Text wraps; actions and trailing content reflow at large text. */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  tags,
  actions,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  chevron,
  divider = true,
  density = 'regular',
  testID,
}: ListRowProps) {
  const feedback = usePressFeedback();
  const lines = subtitle === undefined ? [] : typeof subtitle === 'string' ? [subtitle] : subtitle;
  const main = (
    <>
      {leading}
      <View style={styles.texts}>
        <Text variant="title">{title}</Text>
        {lines.map((line) => (
          <Text key={line} variant="supporting">
            {line}
          </Text>
        ))}
        {tags ? <View style={styles.tags}>{tags}</View> : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {chevron ? <Icon name="chevronRight" size={20} color={colors.textSupporting} /> : null}
    </>
  );
  const padding = density === 'compact' ? space.sm : space.md;
  return (
    <View style={[styles.row, divider && styles.divider]} testID={testID}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? [title, ...lines].join(', ')}
          accessibilityHint={accessibilityHint}
          style={({ pressed }) => [styles.main, { paddingVertical: padding }, feedback(pressed, colors.surface)]}
        >
          {main}
        </Pressable>
      ) : (
        <View
          style={[styles.main, { paddingVertical: padding }]}
          accessible={Boolean(accessibilityLabel)}
          accessibilityLabel={accessibilityLabel}
        >
          {main}
        </View>
      )}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space.sm,
    paddingVertical: space.xs,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  main: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 120,
    minHeight: touchTarget,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xs,
    borderRadius: radii.control,
  },
  texts: { flexGrow: 1, flexShrink: 1, flexBasis: 110, minWidth: 0, gap: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2, marginTop: space.xs },
  trailing: { flexShrink: 0, maxWidth: '100%', alignItems: 'flex-end' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginLeft: 'auto', paddingVertical: space.xs },
});
