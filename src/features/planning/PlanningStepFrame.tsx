import { router } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';

import { GameActionsSheet } from '@/features/game/GameActionsSheet';
import { formatGameDateTime, modeLabel, playerCountLabel } from '@/features/shared/format';
import { gamesHref, planningStepHref } from '@/features/shared/routes';
import type { Problem, StepId, StepView } from '@/game-management';
import { useGameManagement, usePersistenceStatus, usePlanningView } from '@/state';
import {
  Badge,
  BadgeRow,
  Button,
  Dialog,
  FooterActions,
  Screen,
  ScreenHeader,
  StepLink,
  StepList,
  type ScreenProps,
  type StepStatus,
  TopBar,
  useToast,
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
  /** Replaces the draft-saved line above the footer buttons, e.g. a blocker reason. */
  footerNote?: string;
  footerNoteTone?: 'supporting' | 'warning' | 'error';
  scrollRef?: ScreenProps['scrollRef'];
}

const STATUS: Record<StepView['status'], StepStatus> = {
  notFilledIn: 'notFilled',
  needsAttention: 'needsAttention',
  complete: 'complete',
};

/**
 * The shared shell of every Planning wizard step: Games and game actions at the top, the game's
 * mode, phase, date and roster size, the step link with its step list, the step's content, and
 * the Back / Continue (or Return to preview) dock with truthful draft feedback.
 *
 * Leaving through Back, Games or the step list never needs valid input and never applies anything.
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
}: PlanningStepFrameProps) {
  const app = useGameManagement();
  const plan = usePlanningView(gameId);
  const persistence = usePersistenceStatus();
  const toast = useToast();
  const [stepsOpen, setStepsOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const missing = plan === null;
  useEffect(() => {
    // The game was deleted or has left Planning: this step no longer exists.
    if (missing) router.replace(gamesHref);
  }, [missing]);
  if (!plan) return <Screen />;

  const position = plan.steps.findIndex((item) => item.id === step);
  const current = plan.steps[position];

  const goToGames = () => {
    void app.location.set({ kind: 'games' });
    router.dismissTo(gamesHref);
  };

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
    else if (result.status === 'stepInvalid') onStepInvalid?.(result.problems);
    else if (result.status === 'rejected') toast.show(result.reason.message, { tone: 'error' });
  };

  const draftNote =
    persistence.state === 'failed'
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
            note={footerNote ?? draftNote}
            noteTone={footerNote ? footerNoteTone : persistence.state === 'failed' ? 'error' : undefined}
          >
            <Button label="Back" icon="chevronLeft" onPress={goBack} />
            {primaryAction ?? (
              <Button
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
          badges={
            <BadgeRow>
              <Badge label={modeLabel(plan.mode)} />
              <Badge label="Planning" tone="primary" />
            </BadgeRow>
          }
          context={`${formatGameDateTime(plan.createdAt)} · ${playerCountLabel(plan.players.participants.length)}`}
          title={title ?? current?.title ?? ''}
        >
          <StepLink
            label={`Step ${position + 1} of ${plan.steps.length} · Setup steps`}
            onPress={() => setStepsOpen(true)}
          />
        </ScreenHeader>
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
