import { router, useFocusEffect } from 'expo-router';
import { type ReactNode, type Ref, useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import { GameActionsSheet } from '@/features/game/GameActionsSheet';
import { formatGameDateTime, modeLabel, playerCountLabel } from '@/features/shared/format';
import { gamesHref, planningStepHref } from '@/features/shared/routes';
import type { PlanningView, Problem, StepId, StepView } from '@/game-management';
import { useGameManagement, usePersistenceStatus, usePlanningView } from '@/state';
import {
  Badge,
  BadgeRow,
  Button,
  Dialog,
  FooterActions,
  InlineNotice,
  Screen,
  ScreenHeader,
  StepLink,
  StepList,
  type ScreenProps,
  type StepStatus,
  TopBar,
  useToast,
  type ViewRef,
} from '@/ui';

export interface PlanningStepFrameProps {
  gameId: string;
  /** The wizard step this screen shows. */
  step: StepId;
  /** Task heading. Defaults to the step's title. */
  title?: string;
  children?: ReactNode;
  /**
   * Replaces the default primary action (validate this step, then go to the next step or back to
   * the preview). Use it when the step needs its own flow before advancing, such as the Chip set
   * scope popup. Navigate yourself with `planningStepHref`.
   */
  onContinue?: () => void | Promise<void>;
  /** Called when the default Continue found problems on this step, so the step can focus the first one. */
  onStepInvalid?: (problems: readonly Problem[]) => void;
  /** Replaces the whole primary button (Distribution preview's Start). */
  primaryAction?: ReactNode;
  /**
   * Replaces the draft-saved line above the footer buttons, e.g. a blocker reason. An empty string
   * shows no line. A failed save is always reported, whatever is passed here.
   */
  footerNote?: string;
  footerNoteTone?: 'supporting' | 'warning' | 'error';
  scrollRef?: ScreenProps['scrollRef'];
  /**
   * The short task-level line shown under the title after the default Continue failed, while the
   * step still has problems. Default “Check the highlighted fields.”; `null` shows none.
   */
  invalidNotice?: string | null;
  /** Ref to the default Continue / Return to preview button, e.g. to move focus there after the last field. */
  continueRef?: Ref<ViewRef>;
}

const STATUS: Record<StepView['status'], StepStatus> = {
  notFilledIn: 'notFilled',
  needsAttention: 'needsAttention',
  complete: 'complete',
};

function stepProblems(plan: PlanningView, step: StepId): readonly Problem[] {
  switch (step) {
    case 'players':
      return plan.players.problems;
    case 'chipSet':
      return plan.chipSet.problems;
    case 'settings':
      return plan.settings.problems;
    case 'payouts':
      return plan.payoutSchedule.problems;
    default:
      return [];
  }
}

/**
 * The shared shell of every Planning wizard step: Games and game actions at the top; the mode and
 * Planning badges, date and roster size, the step link with its step list and the task heading;
 * the step's content; and the Back / Continue (or Return to preview) dock with truthful draft
 * feedback. On the first step Back is the exit to Games.
 *
 * Leaving through Back, Games, the step list or Android's back button never needs valid input and
 * never applies anything; the draft is already saved.
 */
export function PlanningStepFrame({
  gameId,
  step,
  title,
  children,
  onContinue,
  onStepInvalid,
  primaryAction,
  footerNote,
  footerNoteTone,
  scrollRef,
  invalidNotice = 'Check the highlighted fields.',
  continueRef,
}: PlanningStepFrameProps) {
  const app = useGameManagement();
  const plan = usePlanningView(gameId);
  const persistence = usePersistenceStatus();
  const toast = useToast();
  const [stepsOpen, setStepsOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [continueFailed, setContinueFailed] = useState(false);

  const goToGames = useCallback(() => {
    void app.location.set({ kind: 'games' });
    router.dismissTo(gamesHref);
  }, [app]);

  // Android back from a wizard step goes to Games. Open popups handle back themselves first.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goToGames();
        return true;
      });
      return () => subscription.remove();
    }, [goToGames]),
  );

  const missing = plan === null;
  useEffect(() => {
    // The game was deleted or has left Planning: this step no longer exists.
    if (missing) router.dismissTo(gamesHref);
  }, [missing]);
  if (!plan) return <Screen />;

  const position = plan.steps.findIndex((item) => item.id === step);
  const current = plan.steps[position];
  const isFirst = position === 0;
  const showInvalid = continueFailed && invalidNotice !== null && stepProblems(plan, step).length > 0;

  const goBack = async () => {
    const result = await app.planning.goBack(gameId);
    if (result.status === 'accepted') router.replace(planningStepHref(gameId, result.step));
    else goToGames();
  };

  const openStep = async (target: StepId) => {
    setStepsOpen(false);
    if (target === step) return;
    const result = await app.planning.goToStep(gameId, target);
    if (result.status === 'accepted') router.replace(planningStepHref(gameId, result.step));
    else toast.show(result.reason.message, { tone: 'error' });
  };

  const continueDefault = async () => {
    const result = await app.planning.continueFromStep(gameId, step);
    if (result.status === 'accepted') router.replace(planningStepHref(gameId, result.nextStep));
    else if (result.status === 'stepInvalid') {
      setContinueFailed(true);
      onStepInvalid?.(result.problems);
    } else if (result.status === 'rejected') toast.show(result.reason.message, { tone: 'error' });
  };

  const saveFailed = persistence.state === 'failed';
  const draftNote =
    saveFailed
      ? 'Couldn’t save the draft on this phone'
      : persistence.state === 'saving'
        ? 'Saving draft…'
        : 'Draft saved on this phone · no chips issued';

  return (
    <>
      <Screen
        scrollRef={scrollRef}
        topBar={
          <TopBar backLabel="Games" backIcon="chevronLeft" onBack={goToGames} onMore={() => setActionsOpen(true)} />
        }
        footer={
          <FooterActions
            note={saveFailed ? draftNote : (footerNote ?? draftNote)}
            noteTone={saveFailed ? 'error' : footerNote ? footerNoteTone : undefined}
          >
            {isFirst ? (
              <Button label="Games" icon="chevronLeft" onPress={goToGames} accessibilityLabel="Back to Games" />
            ) : (
              <Button label="Back" icon="chevronLeft" onPress={goBack} />
            )}
            {primaryAction ?? (
              <Button
                ref={continueRef}
                label={plan.returnToPreview ? 'Return to preview' : 'Continue'}
                variant="primary"
                trailingIcon="chevronRight"
                onPress={onContinue ?? continueDefault}
              />
            )}
          </FooterActions>
        }
      >
        <ScreenHeader
          badgesFirst
          badges={
            <BadgeRow>
              <Badge label={modeLabel(plan.mode)} />
              <Badge label="Planning" tone="primary" />
            </BadgeRow>
          }
          context={`${formatGameDateTime(plan.createdAt)} · ${playerCountLabel(plan.players.participants.length)}`}
          beforeTitle={
            <StepLink
              label={`Step ${position + 1} of ${plan.steps.length} · Setup steps`}
              onPress={() => setStepsOpen(true)}
            />
          }
          title={title ?? current?.title ?? ''}
        />
        {showInvalid ? <InlineNotice tone="error">{invalidNotice}</InlineNotice> : null}
        {children}
      </Screen>

      <Dialog visible={stepsOpen} title="Setup steps" cancelLabel="Close" onCancel={() => setStepsOpen(false)}>
        <StepList
          steps={plan.steps.map((item) => ({
            key: item.id,
            label: item.title,
            status: STATUS[item.status],
            current: item.id === step,
            onPress: item.reached ? () => void openStep(item.id) : undefined,
          }))}
        />
      </Dialog>

      <GameActionsSheet gameId={gameId} visible={actionsOpen} onClose={() => setActionsOpen(false)} />
    </>
  );
}
