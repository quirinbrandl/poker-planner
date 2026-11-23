import { useEffect, useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../controls/Button';
import { Icon } from '../Icon';
import { usePressFeedback } from '../motion';
import { Text } from '../Text';
import { colors, radii, space, touchTarget } from '../theme';
import { focusView } from './focus';
import { type ViewRef } from '../refs';

export interface SheetChoice {
  key: string;
  /** "Top 2". */
  title: string;
  /** One line under the title: "70 / 30%", or the reason it is unavailable ("Needs 4 players"). */
  detail?: string;
  /** Short Lavender tag at the end of the row: "Suggested". */
  tag?: string;
  /** The current choice: tinted row with a check, reported as checked. */
  selected?: boolean;
  /** Cannot be chosen now: dashed and muted, still focusable, reported disabled, never calls `onPress`. */
  unavailable?: boolean;
  onPress: () => void;
}

export interface ChoiceSheetProps {
  visible: boolean;
  title: string;
  choices: readonly SheetChoice[];
  /** One quiet line under the list: "Or type your own percentages on the ladder." */
  footer?: string;
  onCancel: () => void;
  /** Default "Close". */
  cancelLabel?: string;
}

/**
 * Single-choice sheet (the payout Preset list). Each row shows a title, a detail line, an optional
 * tag and a check on the current choice; unavailable rows say why in their detail line. Back button,
 * backdrop and Close dismiss it without choosing.
 */
export function ChoiceSheet({ visible, title, choices, footer, onCancel, cancelLabel = 'Close' }: ChoiceSheetProps) {
  const insets = useSafeAreaInsets();
  const feedback = usePressFeedback();
  const titleRef = useRef<ViewRef>(null);
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => focusView(titleRef.current), 50);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={[styles.backdrop, { paddingTop: insets.top + space.xl }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessible={false}
          importantForAccessibility="no"
          testID="sheet-backdrop"
        />
        <View style={[styles.sheet, { marginBottom: insets.bottom + space.md }]} accessibilityViewIsModal aria-modal>
          <ScrollView contentContainerStyle={styles.content} bounces={false} style={styles.scroll}>
            <View ref={titleRef} accessible accessibilityRole="header">
              <Text variant="dialogTitle" accessibilityRole="none">
                {title}
              </Text>
            </View>
            <View style={styles.items} accessibilityRole="radiogroup">
              {choices.map((choice) => (
                <Pressable
                  key={choice.key}
                  onPress={choice.unavailable ? undefined : choice.onPress}
                  accessibilityRole="radio"
                  accessibilityLabel={[choice.title, choice.detail, choice.tag].filter(Boolean).join(', ')}
                  accessibilityState={{ checked: Boolean(choice.selected), disabled: Boolean(choice.unavailable) }}
                  aria-disabled={Boolean(choice.unavailable)}
                  style={({ pressed }) => [
                    styles.item,
                    choice.selected && styles.selected,
                    choice.unavailable && styles.unavailable,
                    !choice.unavailable && feedback(pressed, colors.surfacePressed),
                  ]}
                >
                  <View style={styles.itemText}>
                    <Text variant="bodyStrong" tone={choice.unavailable ? 'supporting' : 'main'} style={styles.title}>
                      {choice.title}
                    </Text>
                    {choice.detail ? (
                      <Text variant="supporting" tabular>
                        {choice.detail}
                      </Text>
                    ) : null}
                  </View>
                  {choice.tag ? (
                    <Text variant="caption" tone="primary" strong>
                      {choice.tag}
                    </Text>
                  ) : null}
                  {choice.selected ? <Icon name="check" size={22} color={colors.text} /> : null}
                </Pressable>
              ))}
            </View>
            {footer ? <Text variant="supporting">{footer}</Text> : null}
            <Button label={cancelLabel} onPress={onCancel} fullWidth />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.backdrop, paddingHorizontal: space.md },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
    maxHeight: '100%',
    backgroundColor: colors.surfaceOverlay,
    borderColor: colors.controlBorder,
    borderWidth: 1,
    borderRadius: radii.sheet,
    overflow: 'hidden',
  },
  scroll: { flexGrow: 0 },
  content: { padding: space.xl, gap: space.md },
  items: { gap: space.sm },
  item: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space.md,
    rowGap: space.xs,
    minHeight: touchTarget + 8,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radii.field,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.selectedTint },
  unavailable: { borderStyle: 'dashed' },
  itemText: { flexGrow: 1, flexShrink: 1, flexBasis: 140, minWidth: 0, gap: 2 },
  title: { fontWeight: '700' },
});
