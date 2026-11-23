import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { planningStepHref } from '@/features/shared/routes';
import type { PayoutPresetId, Problem, StepId } from '@/game-management';
import { useGameManagement, usePlanningView } from '@/state';
import {
  Button,
  Card,
  ChoiceSheet,
  colors,
  focusView,
  Icon,
  InlineNotice,
  SelectButton,
  space,
  Stack,
  Text,
  type TextInputRef,
  useToast,
  type ViewRef,
} from '@/ui';

import { PlanningStepFrame } from '../PlanningStepFrame';
import { PlaceCard } from './PlaceCard';
import { PrizePoolHero } from './PrizePoolHero';

const TOTAL_COLOR = { ok: colors.confirmed, warning: colors.warning, error: colors.error } as const;
const SHARE_FIELD = 'payoutShare:';

/** Tournament Planning step 5 of 6, layout C · Prize ladder. Everything shown comes from the payout view. */
export function PayoutsStep({ gameId }: { gameId: string }) {
  const app = useGameManagement();
  const plan = usePlanningView(gameId);
  const toast = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const inputs = useRef(new Map<string, TextInputRef>());
  const presetRef = useRef<ViewRef>(null);
  const fixRef = useRef<ViewRef>(null);
  const totalRef = useRef<ViewRef>(null);
  const editPlayersRef = useRef<ViewRef>(null);

  if (!plan) return <PlanningStepFrame gameId={gameId} step="payouts" />;
  const p = plan.payoutSchedule;

  const openStep = async (step: StepId) => {
    const result = await app.planning.goToStep(gameId, step);
    if (result.status === 'accepted') router.replace(planningStepHref(gameId, result.step));
    else toast.show(result.reason.message, { tone: 'error' });
  };

  const choosePreset = async (presetId: PayoutPresetId) => {
    const result = await app.planning.choosePayoutPreset(gameId, presetId);
    if (result.status === 'rejected') toast.show(result.reason.message, { tone: 'error' });
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setTimeout(() => focusView(presetRef.current), 50);
  };

  const addPlace = async () => {
    const result = await app.planning.addPayoutPlace(gameId);
    if (result.status === 'accepted') setTimeout(() => inputs.current.get(result.rowId)?.focus(), 50);
    else if (result.status === 'rejected') toast.show(result.reason.message, { tone: 'error' });
  };

  const focusProblem = (problems: readonly Problem[]) => {
    const first = problems[0];
    if (!first) return;
    if (first.field.startsWith(SHARE_FIELD)) inputs.current.get(first.field.slice(SHARE_FIELD.length))?.focus();
    else if (first.code === 'tooManyPaidPlaces') focusView(fixRef.current ?? presetRef.current);
    else if (first.code === 'payoutScheduleMissing') focusView(editPlayersRef.current ?? presetRef.current);
    else focusView(totalRef.current);
  };

  if (p.needsPlayers) {
    return (
      <PlanningStepFrame gameId={gameId} step="payouts" onStepInvalid={focusProblem}>
        <Card gap={space.md}>
          <Text variant="sectionTitle">Add players first</Text>
          <Text variant="supporting">A tournament needs at least 2 players before payouts can be suggested.</Text>
          <Button
            ref={editPlayersRef}
            label="Edit players"
            icon="players"
            fullWidth
            onPress={() => void openStep('players')}
          />
        </Card>
      </PlanningStepFrame>
    );
  }

  const lastIndex = p.places.length - 1;

  return (
    <PlanningStepFrame gameId={gameId} step="payouts" onStepInvalid={focusProblem}>
      <PrizePoolHero prizePool={p.prizePool} onEditSettings={() => void openStep('settings')} />

      <SelectButton
        ref={presetRef}
        label="Preset"
        value={p.preset.name}
        description={p.preset.suggestionLine}
        accessibilityHint="Opens the payout presets"
        onPress={() => setSheetOpen(true)}
      />

      {p.tooManyPlaces ? (
        <View style={styles.alert}>
          <View style={styles.alertText}>
            <InlineNotice tone="error">{p.tooManyPlaces.problem.message}</InlineNotice>
          </View>
          {p.tooManyPlaces.fix ? (
            <Button
              ref={fixRef}
              label={p.tooManyPlaces.fix.label}
              variant="tonal"
              size="compact"
              onPress={() => void choosePreset(p.tooManyPlaces!.fix!.presetId)}
            />
          ) : null}
        </View>
      ) : null}

      {p.places.length > 0 ? (
        <View style={styles.ladder} accessibilityRole="list" accessibilityLabel="Paid places">
          {p.places.map((place, index) => (
            <PlaceCard
              key={place.id}
              gameId={gameId}
              place={place}
              continueAttempted={p.continueAttempted}
              inputRef={(input) => {
                if (input) inputs.current.set(place.id, input);
                else inputs.current.delete(place.id);
              }}
              onNext={
                index < lastIndex ? () => inputs.current.get(p.places[index + 1].id)?.focus() : undefined
              }
            />
          ))}
        </View>
      ) : null}

      <Stack gap="xs">
        <View style={styles.foot}>
          <Button
            label="Add place"
            icon="plus"
            variant="tertiary"
            alignStart
            unavailable={!p.addPlace.available}
            accessibilityHint={p.addPlace.reason ?? undefined}
            onPress={() => void addPlace()}
          />
          {p.total ? (
            <View ref={totalRef} accessible accessibilityLabel={p.total.text} style={styles.total}>
              {p.total.icon === 'check' ? <Icon name="check" size={20} color={TOTAL_COLOR[p.total.tone]} /> : null}
              <Text variant="title" tabular style={{ color: TOTAL_COLOR[p.total.tone] }}>
                {p.total.text}
              </Text>
            </View>
          ) : null}
        </View>
        {p.addPlace.reason ? <Text variant="supporting">{p.addPlace.reason}</Text> : null}
        {p.equalSharesNote ? <Text variant="supporting">{p.equalSharesNote}</Text> : null}
      </Stack>

      <ChoiceSheet
        visible={sheetOpen}
        title="Preset"
        footer="Or type your own percentages on the ladder."
        onCancel={closeSheet}
        choices={p.presets.map((option) => ({
          key: option.id,
          title: option.name,
          detail: option.unavailableReason ?? option.splitText,
          tag: option.suggested ? 'Suggested' : undefined,
          selected: option.current,
          unavailable: !option.available,
          onPress: () => {
            closeSheet();
            void choosePreset(option.id);
          },
        }))}
      />
    </PlanningStepFrame>
  );
}

const styles = StyleSheet.create({
  alert: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space.md,
    rowGap: space.sm,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  alertText: { flexGrow: 1, flexShrink: 1, flexBasis: 180, minWidth: 0 },
  ladder: { gap: space.md },
  foot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: space.md,
  },
  total: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 48, marginLeft: 'auto' },
});
