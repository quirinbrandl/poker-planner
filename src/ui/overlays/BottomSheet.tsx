import { useEffect, useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../controls/Button';
import { Icon, type IconName } from '../Icon';
import { usePressFeedback } from '../motion';
import { Text } from '../Text';
import { colors, radii, space, touchTarget } from '../theme';
import { focusView } from './focus';
import { type ViewRef } from '../refs';

export interface SheetAction {
  key: string;
  /** Ends with "…" when it opens a confirmation: "Delete game…". */
  label: string;
  /** One line under the label: "Removes this game for good." */
  description?: string;
  icon: IconName;
  destructive?: boolean;
  onPress: () => void;
}

export interface BottomSheetProps {
  visible: boolean;
  title: string;
  /** e.g. "Completed · Cash game · 23 Nov, 19:30". */
  subtitle?: string;
  actions: readonly SheetAction[];
  onCancel: () => void;
  cancelLabel?: string;
}

/** Action sheet (Game actions ⋯). Back button, backdrop and Cancel close it without doing anything. */
export function BottomSheet({ visible, title, subtitle, actions, onCancel, cancelLabel = 'Cancel' }: BottomSheetProps) {
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
            <View ref={titleRef} accessible accessibilityRole="header" style={styles.head}>
              <Text variant="dialogTitle" accessibilityRole="none">
                {title}
              </Text>
              {subtitle ? <Text variant="supporting">{subtitle}</Text> : null}
            </View>
            <View style={styles.items}>
              {actions.map((action) => {
                const tint = action.destructive ? colors.error : colors.text;
                return (
                  <Pressable
                    key={action.key}
                    onPress={action.onPress}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    accessibilityHint={action.description}
                    style={({ pressed }) => [
                      styles.item,
                      action.destructive && styles.itemDestructive,
                      feedback(pressed, colors.surfacePressed),
                    ]}
                  >
                    <View style={styles.itemIcon}>
                      <Icon name={action.icon} size={22} color={tint} />
                    </View>
                    <View style={styles.itemText}>
                      <Text variant="bodyStrong" style={{ color: tint }}>
                        {action.label}
                      </Text>
                      {action.description ? (
                        <Text variant="supporting" style={action.destructive ? styles.destructiveLine : undefined}>
                          {action.description}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
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
  content: { padding: space.xl, gap: space.lg },
  head: { gap: space.xs },
  items: { gap: space.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    minHeight: touchTarget + 8,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radii.field + 2,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
  },
  itemDestructive: { borderColor: colors.errorBorder },
  itemIcon: { paddingTop: 1 },
  itemText: { flex: 1, minWidth: 0, gap: 2 },
  destructiveLine: { color: '#D9B3AE' },
});
