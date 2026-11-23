import { type ReactNode } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';

import { space } from '../theme';

type SpaceKey = keyof typeof space;

export interface StackProps extends ViewProps {
  /** Gap between children: a spacing token or a number. Default `md` (12). */
  gap?: SpaceKey | number;
  /** `column` (default) or `row`. Rows wrap by default so they reflow at large text. */
  direction?: 'column' | 'row';
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  children?: ReactNode;
}

/** Flex container with a token gap. Rows wrap by default, so nothing needs horizontal scrolling. */
export function Stack({ gap = 'md', direction = 'column', align, justify, wrap, style, ...rest }: StackProps) {
  const gapValue = typeof gap === 'number' ? gap : space[gap];
  const isRow = direction === 'row';
  return (
    <View
      style={[
        {
          flexDirection: direction,
          gap: gapValue,
          alignItems: align ?? (isRow ? 'center' : undefined),
          justifyContent: justify,
          flexWrap: (wrap ?? isRow) ? 'wrap' : 'nowrap',
        },
        style,
      ]}
      {...rest}
    />
  );
}
