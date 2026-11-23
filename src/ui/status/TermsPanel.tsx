import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { RadialBackdrop } from '../layout/Gradient';
import { Text } from '../Text';
import { radii, space } from '../theme';

export interface TermItem {
  label: string;
  value: string;
  /** Unit line under the value: "chip units", "EUR". */
  unit?: string;
}

export interface TermsPanelProps {
  /** Usually three items: Blinds / Rebuy / Stack. The first value is shown in the accent colour. */
  items: readonly TermItem[];
}

/** Prominent read-only game-terms panel at the top of Play. Items wrap into rows at large text. */
export function TermsPanel({ items }: TermsPanelProps) {
  const { width, fontScale } = useWindowDimensions();
  // Side by side when there is room; one item per row on narrow screens or with large text.
  const stacked = width < 360 || fontScale >= 1.3;
  return (
    <View style={[styles.panel, stacked && styles.panelStacked]}>
      <RadialBackdrop
        cx={0}
        cy={0}
        rx={1.4}
        ry={1.4}
        stops={[
          { offset: 0, color: '#29313F' },
          { offset: 1, color: '#1A2530' },
        ]}
      />
      {items.map((item, index) => (
        <View
          key={item.label}
          accessible
          accessibilityLabel={`${item.label}: ${item.value}${item.unit ? ` ${item.unit}` : ''}`}
          style={[
            styles.item,
            stacked && styles.itemStacked,
            index > 0 && (stacked ? styles.separatedTop : styles.separated),
          ]}
        >
          <Text variant="caption" style={styles.label}>
            {item.label}
          </Text>
          <Text variant="amountLarge" tone={index === 0 ? 'primary' : 'main'} style={styles.value}>
            {nonBreaking(item.value)}
          </Text>
          {item.unit ? <Text variant="caption">{item.unit}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/** Keep ratios like "1 / 2" on one line. */
const nonBreaking = (text: string) => text.replace(/ \/ /g, '\u00A0/\u00A0');

const styles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: space.lg + 2,
    rowGap: space.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: '#637084',
    overflow: 'hidden',
  },
  item: { flexGrow: 1, flexBasis: 88, minWidth: 0, paddingHorizontal: space.md + 2, gap: 2 },
  separated: { borderLeftWidth: 1, borderLeftColor: '#46515F' },
  panelStacked: { flexDirection: 'column', flexWrap: 'nowrap', paddingVertical: 0, rowGap: 0 },
  itemStacked: {
    flexBasis: 'auto',
    flexGrow: 0,
    alignSelf: 'stretch',
    paddingVertical: space.md + 2,
    paddingHorizontal: space.lg,
  },
  separatedTop: { borderTopWidth: 1, borderTopColor: '#46515F' },
  label: { color: '#C4CED6', marginBottom: space.xs },
  value: { fontSize: 28, lineHeight: 32 },
});
