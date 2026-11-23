import { useLocalSearchParams } from 'expo-router';
import { type RefObject, useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, StyleSheet, View } from 'react-native';

import { playerCountLabel } from '@/features/shared/format';
import type { FieldView, PlanningView, Problem, SettingTextField } from '@/game-management';
import { useGameManagement, usePlanningView } from '@/state';
import {
  Badge,
  Button,
  Card,
  focusView,
  IconButton,
  SegmentedChoice,
  space,
  TextField,
  type TextFieldProps,
  type TextInputRef,
  type ViewRef,
} from '@/ui';

import { PlanningStepFrame } from './PlanningStepFrame';
import { useFieldError } from './useFieldError';

const PREFERENCES = [
  { key: 'fewer', label: 'Fewer chips' },
  { key: 'more', label: 'More chips' },
] as const;

const COVERAGE_INFO = 'Payments of each blind without needing change.';
const RESERVE_INFO = 'For rebuys and late arrivals.';

/** The settings text fields in screen order. */
const ORDER: readonly SettingTextField[] = ['buyIn', 'depth', 'coverage', 'reserve'];

type FieldProps = Omit<TextFieldProps, 'value' | 'onChangeText' | 'error' | 'onBlur' | 'inputRef'>;

interface SettingFieldProps extends FieldProps {
  gameId: string;
  name: SettingTextField;
  field: FieldView;
  continueAttempted: boolean;
  inputRef: RefObject<TextInputRef | null>;
  onNext: () => void;
}

/** One settings input: raw text exactly as stored, its problem shown per `useFieldError`. */
function SettingField({ gameId, name, field, continueAttempted, inputRef, onNext, ...props }: SettingFieldProps) {
  const app = useGameManagement();
  const timing = useFieldError(field, continueAttempted);
  return (
    <TextField
      {...props}
      value={field.text}
      onChangeText={(text) => {
        timing.onEdit();
        void app.planning.setSettingText(gameId, name, text);
      }}
      onBlur={timing.onBlur}
      error={timing.error}
      inputRef={inputRef}
      returnKeyType="next"
      onSubmitEditing={onNext}
    />
  );
}

/** The reserve's status, spoken with the field (the "Auto" tag shows it). */
function reserveStatus(plan: PlanningView): string {
  return plan.settings.reserve.mode === 'automatic'
    ? `Automatic for ${playerCountLabel(plan.players.participants.length)}.`
    : 'Custom amount.';
}

/** An ⓘ beside a field label that shows the field's one-line explanation on demand. */
function InfoToggle({ name, text, open, onToggle }: { name: string; text: string; open: boolean; onToggle: () => void }) {
  return (
    <View style={styles.info}>
      <IconButton
        icon="info"
        variant="plain"
        tone={open ? 'primary' : 'default'}
        accessibilityLabel={`About ${name}`}
        accessibilityHint={open ? 'Hides the explanation' : 'Shows the explanation'}
        onPress={() => {
          if (!open) AccessibilityInfo.announceForAccessibility(text);
          onToggle();
        }}
      />
    </View>
  );
}

/**
 * Game settings: all five shared controls in one scrollable step. Buy-in and starting stack,
 * distribution preference, then blind-payment coverage and the chip reserve with its "Auto" tag
 * or “Use automatic (N)”; each explains itself behind an ⓘ. Focusing the reserve changes nothing;
 * only typing makes it custom.
 */
export default function SettingsStepScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const app = useGameManagement();
  const plan = usePlanningView(gameId);
  const [coverageInfo, setCoverageInfo] = useState(false);
  const [reserveInfo, setReserveInfo] = useState(false);
  const buyInRef = useRef<TextInputRef>(null);
  const depthRef = useRef<TextInputRef>(null);
  const coverageRef = useRef<TextInputRef>(null);
  const reserveRef = useRef<TextInputRef>(null);
  const continueRef = useRef<ViewRef>(null);
  const refs: Record<SettingTextField, RefObject<TextInputRef | null>> = {
    buyIn: buyInRef,
    depth: depthRef,
    coverage: coverageRef,
    reserve: reserveRef,
  };

  const toStepAction = () => {
    Keyboard.dismiss();
    focusView(continueRef.current);
  };

  const focusFirstProblem = (problems: readonly Problem[]) => {
    const first = problems.find((problem) => (ORDER as readonly string[]).includes(problem.field));
    if (first) refs[first.field as SettingTextField].current?.focus();
  };

  const continueAttempted = plan?.settings.continueAttempted ?? false;

  return (
    <PlanningStepFrame gameId={gameId} step="settings" onStepInvalid={focusFirstProblem} continueRef={continueRef}>
      {plan ? (
        <>
          <Card gap={space.xl}>
            <SettingField
              gameId={gameId}
              name="buyIn"
              continueAttempted={continueAttempted}
              inputRef={buyInRef}
              onNext={() => depthRef.current?.focus()}
              field={plan.settings.buyIn}
              label="Buy-in per player"
              icon="wallet"
              unit="EUR"
              unitSpoken="euros"
              keyboard="decimal"
              helper={plan.mode === 'tournament' ? 'Goes into the prize pool. Rebuys cost the same.' : undefined}
            />
            <SettingField
              gameId={gameId}
              name="depth"
              continueAttempted={continueAttempted}
              inputRef={depthRef}
              onNext={() => coverageRef.current?.focus()}
              field={plan.settings.depth}
              label="Starting stack"
              icon="templates"
              unit="BB"
              unitSpoken="big blinds"
              keyboard="whole"
            />
          </Card>

          <SegmentedChoice
            label="Distribution preference"
            options={PREFERENCES}
            selectedKey={plan.settings.preference}
            onChange={(key) => void app.planning.setDistributionPreference(gameId, key as 'fewer' | 'more')}
          />

          <Card gap={space.xl}>
            <SettingField
              gameId={gameId}
              name="coverage"
              continueAttempted={continueAttempted}
              inputRef={coverageRef}
              onNext={() => reserveRef.current?.focus()}
              field={plan.settings.coverage}
              label="Blind-payment coverage"
              icon="shield"
              unit="payments"
              keyboard="whole"
              labelAccessory={
                <InfoToggle name="blind-payment coverage" text={COVERAGE_INFO} open={coverageInfo} onToggle={() => setCoverageInfo(!coverageInfo)} />
              }
              helper={coverageInfo ? COVERAGE_INFO : undefined}
            />
            <SettingField
              gameId={gameId}
              name="reserve"
              continueAttempted={continueAttempted}
              inputRef={reserveRef}
              onNext={() => toStepAction()}
              field={plan.settings.reserve}
              label="Chip reserve"
              icon="reserve"
              unit="stacks"
              keyboard="whole"
              labelAccessory={
                <>
                  <InfoToggle name="the chip reserve" text={RESERVE_INFO} open={reserveInfo} onToggle={() => setReserveInfo(!reserveInfo)} />
                  {plan.settings.reserve.mode === 'automatic' ? <Badge label="Auto" size="small" /> : null}
                </>
              }
              helper={reserveInfo ? RESERVE_INFO : undefined}
              spokenHint={reserveStatus(plan)}
              footer={
                plan.settings.reserve.mode === 'custom' ? (
                  <Button
                    label={`Use automatic (${plan.settings.reserve.automaticCount})`}
                    variant="tertiary"
                    icon="undo"
                    size="compact"
                    alignStart
                    onPress={() => void app.planning.useAutomaticReserve(gameId)}
                  />
                ) : undefined
              }
            />
          </Card>
        </>
      ) : null}
    </PlanningStepFrame>
  );
}

const styles = StyleSheet.create({
  // The ⓘ keeps its 48 × 48 target without making the label row taller.
  info: { marginVertical: -space.md, marginLeft: -space.sm, marginRight: -space.md },
});
