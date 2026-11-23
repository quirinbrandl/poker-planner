import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '../Icon';
import { Text } from '../Text';
import { colors, space } from '../theme';

export type NoticeTone = 'warning' | 'error' | 'info' | 'confirmed';

export interface InlineNoticeProps {
  tone: NoticeTone;
  /** The message in words, e.g. "Covers only 2 of 4 blind payments with separate chips." */
  children: string;
  /** Optional bold lead, e.g. "Can't calculate Payments yet". */
  title?: string;
  /** Announce politely when it appears (task-level errors, blockers). Default true. */
  announce?: boolean;
}

const look: Record<NoticeTone, { icon: IconName; color: string; word: string }> = {
  warning: { icon: 'warning', color: colors.warning, word: 'Warning' },
  error: { icon: 'error', color: colors.error, word: 'Error' },
  info: { icon: 'info', color: colors.primary, word: 'Note' },
  confirmed: { icon: 'check', color: colors.confirmed, word: 'Done' },
};

/**
 * One quiet line (icon + words in the tone colour) next to the thing it is about.
 * Deliberately not a boxed callout; the words carry the meaning.
 */
export function InlineNotice({ tone, children, title, announce = true }: InlineNoticeProps) {
  const l = look[tone];
  return (
    <View
      accessible
      accessibilityLabel={`${l.word}: ${title ? `${title}. ` : ''}${children}`}
      accessibilityLiveRegion={announce ? 'polite' : 'none'}
      style={styles.row}
    >
      <View style={styles.icon}>
        <Icon name={l.icon} size={16} color={l.color} />
      </View>
      <Text variant="supporting" style={[styles.text, { color: l.color }]}>
        {title ? <Text variant="supporting" strong style={{ color: l.color }}>{`${title} `}</Text> : null}
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  icon: { paddingTop: 2 },
  text: { flex: 1 },
});
