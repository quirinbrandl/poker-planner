import { Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '../status/Badge';
import { Icon } from '../Icon';
import { usePressFeedback } from '../motion';
import { Text } from '../Text';
import { colors, radii, space, touchTarget, type Tone } from '../theme';

export interface StepLinkProps {
  /** e.g. "Step 5 of 5 · Setup steps". */
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
}

/** Underlined wizard progress control that opens the step list. */
export function StepLink({ label, onPress, accessibilityHint = 'Shows all setup steps' }: StepLinkProps) {
  const feedback = usePressFeedback();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.link, feedback(pressed)]}
    >
      <Icon name="list" size={18} color={colors.textSupporting} />
      <Text variant="supporting" tone="main" style={styles.underline}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Input status of a wizard step. Complete describes input validity, not distribution feasibility. */
export type StepStatus = 'notFilled' | 'needsAttention' | 'complete';

export const stepStatusLabel: Record<StepStatus, string> = {
  notFilled: 'Not filled in',
  needsAttention: 'Needs attention',
  complete: 'Complete',
};

const statusTone: Record<StepStatus, Tone> = { notFilled: 'neutral', needsAttention: 'warning', complete: 'confirmed' };

export interface StepListItem {
  key: string;
  label: string;
  status: StepStatus;
  current?: boolean;
  /** Omit for a step that has not been reached yet; it is then shown but not pressable. */
  onPress?: () => void;
}

export interface StepListProps {
  steps: readonly StepListItem[];
}

/** Wizard step list with text statuses (Not filled in / Needs attention / Complete). */
export function StepList({ steps }: StepListProps) {
  const feedback = usePressFeedback();
  return (
    <View accessibilityRole="list" style={styles.list}>
      {steps.map((step, index) => {
        const status = stepStatusLabel[step.status];
        const name = `Step ${index + 1}: ${step.label}. ${status}${step.current ? '. Current step' : ''}${step.onPress ? '' : '. Not reached yet'}`;
        return (
          <Pressable
            key={step.key}
            onPress={step.onPress}
            disabled={!step.onPress}
            accessibilityRole={step.onPress ? 'button' : 'text'}
            accessibilityLabel={name}
            accessibilityState={{ disabled: !step.onPress, selected: Boolean(step.current) }}
            style={({ pressed }) => [
              styles.step,
              step.current && styles.current,
              !step.onPress && styles.unreached,
              step.onPress ? feedback(pressed, colors.surfacePressed) : null,
            ]}
          >
            <View style={[styles.number, step.current && styles.numberCurrent]}>
              <Text variant="label" tone={step.current ? 'onPrimary' : 'main'} tabular>
                {index + 1}
              </Text>
            </View>
            <View style={styles.text}>
              <Text variant="bodyStrong">{step.label}</Text>
              <View style={styles.meta}>
                <Badge label={status} tone={statusTone[step.status]} size="small" />
                {step.current ? <Text variant="caption">Current step</Text> : null}
              </View>
            </View>
            {step.onPress ? <Icon name="chevronRight" size={20} color={colors.textSupporting} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.sm,
    minHeight: touchTarget,
    borderRadius: radii.sm,
  },
  underline: { textDecorationLine: 'underline' },
  list: { gap: space.sm },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: touchTarget + 8,
    padding: space.md,
    borderRadius: radii.field + 2,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
  },
  current: { borderColor: colors.primary, backgroundColor: colors.selectedTint },
  unreached: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  number: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberCurrent: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { flex: 1, minWidth: 0, gap: space.xs },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
});
