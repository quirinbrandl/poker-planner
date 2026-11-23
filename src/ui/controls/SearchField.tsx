import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Circle, Path, Svg } from 'react-native-svg';

import { colors, radii, space } from '../theme';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  /** Spoken name of the field ("Search saved names"); the visible cue is the magnifier and the placeholder. */
  accessibilityLabel: string;
  /** Visible hint inside the empty field. Default "Search". */
  placeholder?: string;
  testID?: string;
}

/** Search box: magnifier glyph and a "Search" placeholder inside the field, no visible label. */
export function SearchField({ value, onChangeText, accessibilityLabel, placeholder = 'Search', testID }: SearchFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        styles.box,
        { borderColor: focused ? colors.primary : colors.controlBorder, borderWidth: focused ? 2 : 1 },
        { padding: focused ? 0 : 1 },
      ]}
    >
      <View style={styles.glyph} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Circle cx={11} cy={11} r={6.5} stroke={colors.textSupporting} strokeWidth={2} />
          <Path d="m16 16 4.5 4.5" stroke={colors.textSupporting} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </View>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.textSupporting}
        accessibilityLabel={accessibilityLabel}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.pill,
  },
  glyph: { paddingLeft: space.lg },
  input: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    color: colors.text,
    fontSize: 17,
  },
});
