import { type ReactNode, useEffect, useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../controls/Button';
import { type IconName } from '../Icon';
import { Text } from '../Text';
import { colors, radii, space } from '../theme';
import { focusView } from './focus';
import { type ViewRef } from '../refs';

export interface DialogAction {
  label: string;
  onPress: () => void;
  icon?: IconName;
}

export interface DialogProps {
  visible: boolean;
  title: string;
  /** Body: text, FactRows, chip pills, an InlineNotice. Scrolls when long. */
  children?: ReactNode;
  /** The specific verb: "Issue rebuy · EUR 20.00", "Delete game". Omit for an information-only dialog. */
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmIcon?: IconName;
  /** Confirm is shown but cannot run (e.g. Calculating…). */
  confirmLoading?: boolean;
  confirmLoadingLabel?: string;
  /** Confirm is shown but cannot run yet (focusable, reports disabled, never calls `onConfirm`). */
  confirmUnavailable?: boolean;
  /** Cancel / dismiss. Called for the Cancel button, the Android back button and a backdrop tap. */
  onCancel: () => void;
  cancelLabel?: string;
  /** Destructive confirm (coral). Screen-reader focus starts on Cancel. */
  destructive?: boolean;
  /** Optional third choice between Cancel and confirm ("Also update template"). Actions then stack. */
  secondaryAction?: DialogAction;
  /**
   * `confirmFirst` stacks the confirm action on top (with initial focus), then `secondaryAction`,
   * then a quiet text Cancel: for a choice popup whose confirm is the default ("Only this game",
   * then "Also update template"). Default `cancelFirst`.
   */
  actionOrder?: 'cancelFirst' | 'confirmFirst';
  testID?: string;
}

/**
 * Modal confirmation. Cancel and the confirm action are equally reachable; back button and
 * backdrop mean Cancel; focus enters the dialog and stays inside it.
 */
export function Dialog({
  visible,
  title,
  children,
  confirmLabel,
  onConfirm,
  confirmIcon,
  confirmLoading,
  confirmLoadingLabel,
  confirmUnavailable,
  onCancel,
  cancelLabel = 'Cancel',
  destructive,
  secondaryAction,
  actionOrder = 'cancelFirst',
  testID,
}: DialogProps) {
  const insets = useSafeAreaInsets();
  const titleRef = useRef<ViewRef>(null);
  const cancelRef = useRef<ViewRef>(null);
  const confirmRef = useRef<ViewRef>(null);
  const hasConfirm = Boolean(confirmLabel && onConfirm);

  useEffect(() => {
    if (!visible) return;
    const target = () =>
      destructive ? cancelRef.current : actionOrder === 'confirmFirst' ? confirmRef.current : titleRef.current;
    const timer = setTimeout(() => focusView(target()), 50);
    return () => clearTimeout(timer);
  }, [visible, destructive, actionOrder]);

  const { fontScale } = useWindowDimensions();
  // Long verbs ("Issue rebuy · EUR 20.00") and large text get full-width stacked buttons: Cancel above
  // the confirm action, as in the approved rebuy popup. Short pairs sit side by side.
  const confirmFirst = actionOrder === 'confirmFirst';
  const stacked = confirmFirst || Boolean(secondaryAction) || fontScale >= 1.3 || (confirmLabel?.length ?? 0) > 18;
  const cancelButton = (
    <View style={stacked ? styles.stackedItem : styles.cancel}>
      <Button
        ref={cancelRef}
        label={cancelLabel}
        onPress={onCancel}
        variant={confirmFirst ? 'tertiary' : 'secondary'}
        fullWidth
      />
    </View>
  );
  const confirmButton = hasConfirm ? (
    <View style={stacked ? styles.stackedItem : styles.confirm}>
      <Button
        ref={confirmRef}
        label={confirmLabel!}
        icon={confirmIcon}
        onPress={onConfirm}
        variant={destructive ? 'destructive' : 'primary'}
        loading={confirmLoading}
        loadingLabel={confirmLoadingLabel}
        unavailable={confirmUnavailable}
        fullWidth
      />
    </View>
  ) : null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
      navigationBarTranslucent
      testID={testID}
    >
      <View style={[styles.backdrop, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessible={false}
          importantForAccessibility="no"
          testID={testID ? `${testID}-backdrop` : 'dialog-backdrop'}
        />
        <View style={styles.card} accessibilityViewIsModal aria-modal>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} bounces={false}>
            <View ref={titleRef} accessible accessibilityRole="header">
              <Text variant="dialogTitle" accessibilityRole="none">
                {title}
              </Text>
            </View>
            {children ? <View style={styles.body}>{children}</View> : null}
            <View style={[styles.actions, stacked && styles.actionsStacked]}>
              {confirmFirst ? null : cancelButton}
              {confirmFirst ? confirmButton : null}
              {secondaryAction ? (
                <View style={styles.stackedItem}>
                  <Button
                    label={secondaryAction.label}
                    icon={secondaryAction.icon}
                    onPress={secondaryAction.onPress}
                    fullWidth
                  />
                </View>
              ) : null}
              {confirmFirst ? null : confirmButton}
              {confirmFirst ? cancelButton : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.md + 2,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '100%',
    backgroundColor: colors.surfaceOverlay,
    borderColor: colors.controlBorder,
    borderWidth: 1,
    borderRadius: radii.sheet,
    overflow: 'hidden',
  },
  scroll: { flexGrow: 0 },
  content: { padding: space.xl, gap: space.lg },
  body: { gap: space.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm + 2, marginTop: space.xs },
  actionsStacked: { flexDirection: 'column', flexWrap: 'nowrap' },
  cancel: { flexGrow: 1, flexBasis: 110 },
  confirm: { flexGrow: 1.5, flexBasis: 150 },
  stackedItem: { alignSelf: 'stretch' },
});
