import { StyleSheet, View } from 'react-native';

import { Text } from '../Text';
import { palette } from '../theme';

export interface AvatarProps {
  /** The person's name; the first letter is shown. The name itself must be shown as text nearby. */
  name: string;
  size?: number;
}

/** Initial in a circle. Decorative: hidden from assistive tech because the name is always shown. */
export function Avatar({ name, size = 40 }: AvatarProps) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? '?';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text variant="bodyStrong" allowFontScaling={false} style={{ fontSize: size * 0.42, lineHeight: size * 0.5 }}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.slate700,
    borderWidth: 1,
    borderColor: palette.slate400,
  },
});
