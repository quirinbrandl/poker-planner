import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '../theme';

export interface ColumnsProps {
  /** Below this width per column the columns wrap into rows (large text, narrow screens). Default 130. */
  minColumnWidth?: number;
  gap?: number;
  children: ReactNode;
}

/** Equal-width columns that reflow into a single column when space runs out (e.g. Value | Quantity). */
export function Columns({ minColumnWidth = 130, gap = space.md + 2, children }: ColumnsProps) {
  return (
    <View style={[styles.row, { gap }]}>
      {Children.toArray(children).map((child, index) => (
        <View key={index} style={[styles.column, { flexBasis: minColumnWidth }]}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  column: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
});
