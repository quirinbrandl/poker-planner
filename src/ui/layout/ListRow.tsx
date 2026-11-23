import { type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Icon } from '../Icon';
import { usePressFeedback } from '../motion';
import { Text } from '../Text';
import { colors, radii, space, touchTarget } from '../theme';

export interface ListRowProps {
  title: string;
  /** Beside the title, wrapping under it at large text: a decorative `PlaceBadge`. Say its words in `accessibilityLabel`. */
  titleAside?: ReactNode;
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
  titleAside,
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
  // At large text the buttons go under the row instead of squeezing the name into a narrow column.
  const { fontScale } = useWindowDimensions();
  const stacked = Boolean(actions) && (fontScale || 1) >= LARGE_TEXT_SCALE;
  const lines = subtitle === undefined ? [] : typeof subtitle === 'string' ? [subtitle] : subtitle;
  const main = (
    <>
      {leading}
      <View style={styles.texts}>
        {titleAside ? (
          <View style={styles.titleLine}>
            <Text variant="title">{title}</Text>
            {titleAside}
          </View>
        ) : (
          <Text variant="title">{title}</Text>
        )}
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
    <View style={[styles.row, stacked && styles.rowStacked, divider && styles.divider]} testID={testID}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? [title, ...lines].join(', ')}
          accessibilityHint={accessibilityHint}
          style={({ pressed }) => [
            styles.main,
            stacked && styles.mainStacked,
            { paddingVertical: padding },
            feedback(pressed, colors.surface),
          ]}
        >
          {main}
        </Pressable>
      ) : (
        <View
          style={[styles.main, stacked && styles.mainStacked, { paddingVertical: padding }]}
          accessible={Boolean(accessibilityLabel)}
          accessibilityLabel={accessibilityLabel}
        >
          {main}
        </View>
      )}
      {actions ? <View style={[styles.actions, stacked && styles.actionsStacked]}>{actions}</View> : null}
    </View>
  );
}

/** From this text scale on, a row's action buttons sit under it. */
const LARGE_TEXT_SCALE = 1.3;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space.sm,
    paddingVertical: space.xs,
  },
  rowStacked: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  mainStacked: { flexGrow: 0, flexBasis: 'auto' },
  actionsStacked: { marginLeft: 0, paddingHorizontal: space.xs, paddingBottom: space.sm },
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
  titleLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2, marginTop: space.xs },
  trailing: { flexShrink: 0, maxWidth: '100%', alignItems: 'flex-end' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginLeft: 'auto', paddingVertical: space.xs },
});
