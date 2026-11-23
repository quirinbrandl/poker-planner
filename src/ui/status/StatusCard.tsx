import { type ReactNode, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '../layout/Card';
import { Icon, type IconName } from '../Icon';
import { Text } from '../Text';
import { space, toneColors, type Tone } from '../theme';
import { ProgressBar } from './ProgressBar';
import { type ViewRef } from '../refs';

export interface StatusCardProps {
  /** `confirmed` (Everything adds up), `primary` (still to count), `warning`, `error` (doesn't add up). */
  tone?: Tone;
  /** Glyph in the ring. Default check for confirmed, warning for warning, error for error. */
  icon?: IconName;
  /** Short text in the ring instead of a glyph, e.g. "4/6". */
  ringText?: string;
  title: string;
  description?: string;
  progress?: { value: number; max: number; accessibilityLabel: string };
  /** Extra content under the description (e.g. a list of uncounted names). */
  children?: ReactNode;
  /** Lets screens move focus here when a blocked action explains itself. */
  ref?: Ref<ViewRef>;
}

const defaultIcon: Partial<Record<Tone, IconName>> = { confirmed: 'check', warning: 'warning', error: 'error' };

/** Large centred status: ring icon, heading, one line and an optional progress bar. */
export function StatusCard({
  tone = 'confirmed',
  icon,
  ringText,
  title,
  description,
  progress,
  children,
  ref,
}: StatusCardProps) {
  const t = toneColors[tone];
  const glyph = icon ?? defaultIcon[tone];
  return (
    <Card ref={ref} padding={space.xxl} style={styles.card}>
      <View
        accessible
        accessibilityRole="summary"
        accessibilityLabel={[title, description].filter(Boolean).join('. ')}
        style={styles.content}
      >
        <View
          style={[
            styles.ring,
            { borderColor: t.border, backgroundColor: t.background === 'transparent' ? undefined : t.background },
          ]}
        >
          {ringText ? (
            <Text variant="title" tabular style={{ color: t.text }} allowFontScaling={false}>
              {ringText}
            </Text>
          ) : glyph ? (
            <Icon name={glyph} size={32} color={t.text} strokeWidth={2.4} />
          ) : null}
        </View>
        <Text variant="cardTitle" align="center" accessibilityRole="none">
          {title}
        </Text>
        {description ? (
          <Text variant="supporting" align="center" style={styles.description}>
            {description}
          </Text>
        ) : null}
      </View>
      {progress ? <ProgressBar tone={tone} {...progress} /> : null}
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.lg },
  content: { alignItems: 'center', gap: space.sm },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  description: { fontSize: 15 },
});
