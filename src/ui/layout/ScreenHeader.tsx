import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '../Text';
import { space } from '../theme';

export interface ScreenHeaderProps {
  /** Context line, e.g. "Cash game · 23 Nov, 19:30 · finished 23:41". */
  context?: string;
  /** Badges (usually a BadgeRow) between the context line and the title. */
  badges?: ReactNode;
  /** The big task heading. */
  title: string;
  /** Small "eyebrow" above everything, e.g. "POKER PLANNER" on Games. */
  eyebrow?: string;
  /** Content under the title: a StepLink, a lead sentence, workspace tabs. */
  children?: ReactNode;
}

/** Screen identity block in reading order: context → badges → title → extras. */
export function ScreenHeader({ context, badges, title, eyebrow, children }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      {eyebrow ? (
        <Text variant="overline" style={styles.eyebrow}>
          {eyebrow}
        </Text>
      ) : null}
      {context ? <Text variant="supporting">{context}</Text> : null}
      {badges}
      <Text variant="pageTitle" style={styles.title}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.sm + 2 },
  eyebrow: { letterSpacing: 1.6, fontWeight: '700' },
  title: { marginTop: 2 },
});
