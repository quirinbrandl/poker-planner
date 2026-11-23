import { StyleSheet, View } from 'react-native';

import { Button } from '../controls/Button';
import { type IconName } from '../Icon';
import { Text } from '../Text';
import { space } from '../theme';

export interface SectionAction {
  label: string;
  onPress: () => void;
  icon?: IconName;
  accessibilityLabel?: string;
}

export interface SectionHeadingProps {
  title: string;
  /** Quiet text at the right, e.g. "1 draft", "3 games". */
  meta?: string;
  /** Text action at the right, e.g. "+ Add player". */
  action?: SectionAction;
  /** Larger heading for a hero count like "3 payments". */
  size?: 'regular' | 'large';
  /** Supporting text after a large title on the same line ("EUR 21.00 in total"). */
  aside?: string;
}

/** Section title with optional meta text or a trailing text action. Wraps at large text. */
export function SectionHeading({ title, meta, action, size = 'regular', aside }: SectionHeadingProps) {
  return (
    <View style={[styles.row, size === 'regular' && styles.spaced]}>
      <View style={styles.titleWrap}>
        <Text variant={size === 'large' ? 'cardTitle' : 'sectionTitle'}>{title}</Text>
        {aside ? <Text variant="supporting">{aside}</Text> : null}
      </View>
      {meta ? <Text variant="supporting">{meta}</Text> : null}
      {action ? (
        <Button
          variant="tertiary"
          size="compact"
          label={action.label}
          icon={action.icon}
          onPress={action.onPress}
          accessibilityLabel={action.accessibilityLabel}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: space.sm,
  },
  spaced: { marginTop: space.md },
  titleWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: space.md, flexShrink: 1 },
  action: { marginRight: -space.md },
});
