import { type ReactNode } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle, StyleSheet } from 'react-native';

import { colors, tabularNums, type, type TypeVariant } from './theme';

/** Text colour roles. */
export type TextTone = 'main' | 'supporting' | 'primary' | 'onPrimary' | 'error' | 'warning' | 'confirmed' | 'even';

const toneColor: Record<TextTone, string> = {
  main: colors.text,
  supporting: colors.textSupporting,
  primary: colors.primary,
  onPrimary: colors.onPrimary,
  error: colors.error,
  warning: colors.warning,
  confirmed: colors.confirmed,
  even: colors.even,
};

const headingVariants: readonly TypeVariant[] = ['pageTitle', 'cardTitle', 'dialogTitle', 'sectionTitle'];

export interface TextProps extends Omit<RNTextProps, 'style'> {
  /** Type scale entry. Default `body`. */
  variant?: TypeVariant;
  /** Colour role. Default `main` (or `supporting` for `supporting`, `caption` and `overline`). */
  tone?: TextTone;
  /** Tabular numerals, for amounts and counts. */
  tabular?: boolean;
  align?: TextStyle['textAlign'];
  /** Struck-through old value (e.g. an adjusted depth). */
  strike?: boolean;
  /** Bold weight on top of the variant. */
  strong?: boolean;
  style?: RNTextProps['style'];
  children?: ReactNode;
}

/**
 * The only text primitive. Headings (`pageTitle`, `cardTitle`, `dialogTitle`, `sectionTitle`)
 * get the header role automatically. Font scaling stays enabled.
 */
export function Text({
  variant = 'body',
  tone,
  tabular,
  align,
  strike,
  strong,
  style,
  accessibilityRole,
  ...rest
}: TextProps) {
  const resolvedTone =
    tone ?? (variant === 'supporting' || variant === 'caption' || variant === 'overline' ? 'supporting' : 'main');
  return (
    <RNText
      accessibilityRole={accessibilityRole ?? (headingVariants.includes(variant) ? 'header' : undefined)}
      style={[
        styles.base,
        type[variant],
        { color: toneColor[resolvedTone] },
        tabular && { fontVariant: tabularNums },
        align && { textAlign: align },
        strike && styles.strike,
        strong && styles.strong,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { flexShrink: 1 },
  strike: { textDecorationLine: 'line-through' },
  strong: { fontWeight: '700' },
});
