/**
 * Design tokens for Poker Planner: the approved "Current / Lavender" always-dark palette,
 * spacing, radii and type scale. Feature code takes colours, spacing, radii and type sizes
 * from here and never hard-codes them.
 */
import { Platform, type TextStyle } from 'react-native';

/** Raw reference palette from the approved visual direction. Prefer the semantic `colors` roles. */
export const palette = {
  slate950: '#0B1117',
  slate900: '#111920',
  slate850: '#15212B',
  slate800: '#18232C',
  slate750: '#1E2A34',
  slate700: '#29313F',
  slate600: '#364653',
  slate500: '#46515F',
  slate400: '#637084',
  slate300: '#7C90A0',
  slate200: '#B3C0CA',
  slate100: '#F1F4F5',
  lavender: '#C9B5FF',
  lavenderInk: '#2B1E45',
  lavenderTint: '#322B45',
  lavenderMuted: '#85749E',
  /** Start of the share-bar gradient. */
  lavenderDeep: '#8F78D8',
  coral: '#FFB3AA',
  coralBg: '#3D2427',
  coralBorder: '#6B4447',
  amber: '#F2D08A',
  amberBg: '#383020',
  mint: '#B8DFBD',
  mintBg: '#20372B',
} as const;

/** Semantic colour roles. Every role that carries meaning has a text/background pair. */
export const colors = {
  background: palette.slate900,
  /** Behind modals and sheets. */
  backdrop: 'rgba(0, 0, 0, 0.72)',
  surface: palette.slate750,
  /** Dialogs and sheets sit slightly darker than cards so cards inside them still read. */
  surfaceOverlay: palette.slate850,
  /** Inputs and inset wells: the page colour inside a raised surface. */
  surfaceSunken: palette.slate900,
  /** Pressed feedback for raised surfaces. */
  surfacePressed: palette.slate600,
  text: palette.slate100,
  textSupporting: palette.slate200,
  divider: palette.slate600,
  /** Visible boundary of a control (inputs, outlined buttons, radio rows). */
  controlBorder: palette.slate300,
  primary: palette.lavender,
  onPrimary: palette.lavenderInk,
  primaryPressed: '#B7A1EF',
  selectedTint: palette.lavenderTint,
  /** Border of the highlighted (active) game card and hero surfaces. */
  highlightBorder: palette.lavenderMuted,
  error: palette.coral,
  errorBackground: palette.coralBg,
  errorBorder: palette.coralBorder,
  warning: palette.amber,
  warningBackground: palette.amberBg,
  confirmed: palette.mint,
  confirmedBackground: palette.mintBg,
  /** Struck-through old value inside an amber adjustment. */
  warningMuted: '#D0C3A4',
  /** Neutral even/break-even amount. */
  even: '#E3D9FC',
} as const;

export type ColorRole = keyof typeof colors;

/** Status tones shared by Badge, InlineNotice, StatusCard, Toast and Button. */
export type Tone = 'neutral' | 'primary' | 'confirmed' | 'warning' | 'error';

export const toneColors: Record<Tone, { text: string; background: string; border: string }> = {
  neutral: { text: colors.text, background: 'transparent', border: colors.controlBorder },
  primary: { text: colors.primary, background: colors.selectedTint, border: colors.primary },
  confirmed: { text: colors.confirmed, background: colors.confirmedBackground, border: colors.confirmed },
  warning: { text: colors.warning, background: colors.warningBackground, border: colors.warning },
  error: { text: colors.error, background: colors.errorBackground, border: colors.error },
};

/** Spacing scale in logical units. `gutter` is the page side padding. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  gutter: 20,
  /** Padding inside cards and groups. */
  card: 18,
  /** Gap between page sections. */
  section: 28,
} as const;

export const radii = {
  sm: 10,
  control: 14,
  field: 16,
  tile: 16,
  card: 22,
  sheet: 24,
  pill: 999,
} as const;

/** Minimum touch target for every actionable control. */
export const touchTarget = 48;

/** Border widths. */
export const borders = { hairline: 1, strong: 2 } as const;

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/**
 * Type scale. System sans-serif only; sizes scale with platform text settings.
 * Headings are bold and tightly tracked.
 */
export const type = {
  pageTitle: { fontSize: 41, lineHeight: 45, fontWeight: '700', letterSpacing: -1.8 },
  cardTitle: { fontSize: 30, lineHeight: 35, fontWeight: '700', letterSpacing: -1.1 },
  dialogTitle: { fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.7 },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700', letterSpacing: -0.35 },
  title: { fontSize: 17, lineHeight: 23, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  supporting: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '400' },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.9, textTransform: 'uppercase' },
  amount: { fontSize: 22, lineHeight: 27, fontWeight: '700', letterSpacing: -0.8, fontVariant: tabular },
  amountLarge: { fontSize: 32, lineHeight: 36, fontWeight: '800', letterSpacing: -1.3, fontVariant: tabular },
  /** Big numeric value in the quantity stepper / count editor. */
  amountHero: { fontSize: 44, lineHeight: 50, fontWeight: '700', letterSpacing: -1.2, fontVariant: tabular },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

export const tabularNums = tabular;

/** Font family for text drawn inside SVG (chip values). The system sans-serif on every platform. */
export const svgFontFamily = Platform.select({
  web: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  ios: 'System',
  default: 'sans-serif',
});

export const theme = { palette, colors, toneColors, space, radii, touchTarget, borders, type } as const;
