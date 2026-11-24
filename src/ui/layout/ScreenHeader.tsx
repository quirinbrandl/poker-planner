import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '../Text';
import { space } from '../theme';

export interface ScreenHeaderProps {
  /** Context line, e.g. "Cash game · 23 Nov, 19:30–23:41". */
  context?: string;
  /** Badges (usually a BadgeRow) between the context line and the title. */
  badges?: ReactNode;
  /** The big task heading. */
  title: string;
  /** Small "eyebrow" above everything, e.g. "POKER PLANNER" on Games. */
  eyebrow?: string;
  /** Content under the title: a StepLink, a lead sentence, workspace tabs. */
  children?: ReactNode;
  /**
   * Planning order: badges first, then the context line. Default is context → badges, as in the
   * workspaces.
   */
  badgesFirst?: boolean;
  /** Content between the identity (context, badges) and the title, e.g. the wizard step progress. */
  beforeTitle?: ReactNode;
}

/** Screen identity block in reading order: context → badges (or badges → context) → title → extras. */
export function ScreenHeader({ context, badges, title, eyebrow, children, badgesFirst, beforeTitle }: ScreenHeaderProps) {
  const contextLine = context ? <Text variant="supporting">{context}</Text> : null;
  return (
    <View style={styles.header}>
      {eyebrow ? (
        <Text variant="overline" style={styles.eyebrow}>
          {eyebrow}
        </Text>
      ) : null}
      {badgesFirst ? badges : contextLine}
      {badgesFirst ? contextLine : badges}
      {beforeTitle ? <View style={styles.beforeTitle}>{beforeTitle}</View> : null}
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
  beforeTitle: { marginTop: -space.sm },
});
