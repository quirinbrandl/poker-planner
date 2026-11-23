import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  Card,
  colors,
  Icon,
  iconNames,
  ListRow,
  palette,
  radii,
  Screen,
  ScreenHeader,
  SectionHeading,
  space,
  Stack,
  Text,
  type TypeVariant,
} from '@/ui';

const sections = [
  { href: '/dev/gallery/controls', title: 'Controls', subtitle: 'Buttons, fields, stepper, radio rows, tabs, steps' },
  {
    href: '/dev/gallery/status',
    title: 'Status',
    subtitle: 'Badges, status card, metrics, notices, rows, empty state',
  },
  { href: '/dev/gallery/overlays', title: 'Overlays', subtitle: 'Dialog, bottom sheet, toast' },
  { href: '/dev/gallery/chips', title: 'Chips', subtitle: 'Chip symbol, pills, chip case, 3D towers' },
  {
    href: '/dev/gallery/compositions',
    title: 'Compositions',
    subtitle: 'Approved screen blocks rebuilt from primitives',
  },
] as const;

const roles: (keyof typeof colors)[] = [
  'background',
  'surface',
  'surfaceOverlay',
  'text',
  'textSupporting',
  'divider',
  'controlBorder',
  'primary',
  'onPrimary',
  'selectedTint',
  'error',
  'errorBackground',
  'warning',
  'warningBackground',
  'confirmed',
  'confirmedBackground',
];

const typeSamples: [TypeVariant, string][] = [
  ['pageTitle', 'Game settings'],
  ['cardTitle', 'Everything adds up'],
  ['dialogTitle', 'Rebuy for Ben'],
  ['sectionTitle', 'Playing · 5'],
  ['title', 'Alice'],
  ['body', 'Who pays whom. The app doesn’t track payments.'],
  ['bodyStrong', 'Fewer chips'],
  ['label', 'Buy-in per player'],
  ['supporting', 'EUR 20.00 contribution · 1 rebuy'],
  ['caption', 'Recommended: 100 BB.'],
  ['overline', '1 starting stack'],
  ['amount', '+EUR 13.00'],
  ['amountLarge', '1,600'],
];

export default function GalleryIndex() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Development only" title="Design system" context="Poker Planner · src/ui">
        <Text variant="supporting">Every primitive in its states, plus approved screen blocks rebuilt from them.</Text>
      </ScreenHeader>

      <View>
        {sections.map((section) => (
          <ListRow
            key={section.href}
            title={section.title}
            subtitle={section.subtitle}
            chevron
            onPress={() => router.push(section.href)}
          />
        ))}
      </View>

      <SectionHeading title="Colour roles" />
      <View style={styles.swatches}>
        {roles.map((role) => (
          <View key={role} style={styles.swatch} accessible accessibilityLabel={`${role} ${colors[role]}`}>
            <View style={[styles.chipColor, { backgroundColor: colors[role] }]} />
            <Text variant="caption" tone="main">
              {role}
            </Text>
            <Text variant="caption">{colors[role]}</Text>
          </View>
        ))}
      </View>

      <SectionHeading title="Type scale" />
      <Card gap={space.md}>
        {typeSamples.map(([variant, sample]) => (
          <View key={variant}>
            <Text variant="caption">{variant}</Text>
            <Text variant={variant}>{sample}</Text>
          </View>
        ))}
      </Card>

      <SectionHeading title="Icons" meta={`${iconNames.length} icons`} />
      <View style={styles.icons}>
        {iconNames.map((name) => (
          <View key={name} style={styles.icon}>
            <Icon name={name} color={colors.text} />
            <Text variant="caption" align="center">
              {name}
            </Text>
          </View>
        ))}
      </View>

      <SectionHeading title="Spacing and radii" />
      <Stack gap="sm">
        {(['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'] as const).map((key) => (
          <Stack key={key} direction="row" gap="md" wrap={false}>
            <Text variant="caption" style={styles.spaceLabel}>{`${key} · ${space[key]}`}</Text>
            <View style={{ width: space[key] * 3, height: 10, borderRadius: 5, backgroundColor: palette.lavender }} />
          </Stack>
        ))}
        <Stack direction="row" gap="md">
          {(['sm', 'control', 'field', 'card', 'sheet'] as const).map((key) => (
            <View key={key} style={[styles.radius, { borderRadius: radii[key] }]}>
              <Text variant="caption" align="center">{`${key}\n${radii[key]}`}</Text>
            </View>
          ))}
        </Stack>
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  swatch: { width: 100, gap: 2 },
  chipColor: { height: 40, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.divider },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  icon: { width: 72, alignItems: 'center', gap: space.xs, paddingVertical: space.sm },
  spaceLabel: { width: 72 },
  radius: {
    width: 64,
    height: 64,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
