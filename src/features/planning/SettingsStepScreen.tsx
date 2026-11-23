import { useLocalSearchParams } from 'expo-router';
import { type RefObject, useRef } from 'react';
import { Keyboard } from 'react-native';

import { playerCountLabel } from '@/features/shared/format';
import type { FieldView, PlanningView, Problem, SettingTextField } from '@/game-management';
import { useGameManagement, usePlanningView } from '@/state';
import {
  Button,
  Card,
  focusView,
  RadioGroup,
  RadioRow,
  space,
  TextField,
  type TextFieldProps,
  type TextInputRef,
  type ViewRef,
} from '@/ui';

import { PlanningStepFrame } from './PlanningStepFrame';
import { useFieldError } from './useFieldError';

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

function reserveHelper(plan: PlanningView): string {
  const reserve = plan.settings.reserve;
  const status =
    reserve.mode === 'automatic'
      ? `Automatic for ${playerCountLabel(plan.players.participants.length)}.`
      : 'Custom amount.';
  return `For rebuys and late arrivals. ${status}`;
}

/**
 * Game settings: all five shared controls in one scrollable step. Buy-in and starting stack,
 * distribution preference, then blind-payment coverage and the chip reserve with its
 * automatic / custom status and “Use automatic (N)”. Focusing the reserve changes nothing; only
 * typing makes it custom.
 */
export default function SettingsStepScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const app = useGameManagement();
  const plan = usePlanningView(gameId);
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
              helper={`Recommended: ${plan.settings.recommendedDepthBb} BB.`}
            />
          </Card>

          <RadioGroup label="Distribution preference">
            <RadioRow
              label="Fewer chips"
              selected={plan.settings.preference === 'fewer'}
              onPress={() => void app.planning.setDistributionPreference(gameId, 'fewer')}
            />
            <RadioRow
              label="More chips"
              selected={plan.settings.preference === 'more'}
              onPress={() => void app.planning.setDistributionPreference(gameId, 'more')}
            />
          </RadioGroup>

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
              helper="Payments of each blind without needing change."
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
              helper={reserveHelper(plan)}
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
