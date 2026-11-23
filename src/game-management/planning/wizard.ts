/**
 * Wizard navigation: opening steps, Back, Continue, Return to preview and mode changes.
 */
import type { GameMode } from '@/domain/types';

import type { AppState, GameDocument, StepId } from '../core/documents';
import {
  type Accepted,
  type GameAccessCode,
  type NeedsConfirmation,
  type Rejected,
  rejected,
  type StepInvalid,
} from '../core/results';
import type { Runtime } from '../core/runtime';
import { addReached, planningGame, stepsForMode, withDraft, withGame, withWizard } from './draft';
import { validateGame } from './validation';

/** The scopes offered when a valid chip set step is finished. */
export type ChipSetScopeOption = 'onlyThisGame' | 'updateSourceTemplate' | 'saveAsNewTemplate';

/** Returned by Continue on a valid Chip set step: ask "Where should changes apply?". */
export interface ChipSetScopeConfirmation {
  kind: 'chipSetScope';
  /** In display order; the first (`onlyThisGame`) is the default. */
  options: readonly ChipSetScopeOption[];
  /** The source template if it still exists. */
  sourceTemplate: { id: string; name: string } | null;
  /** The game's chip set came from a template that has been deleted. */
  sourceTemplateDeleted: boolean;
  /** Finishing will return to Distribution preview rather than go to Game settings. */
  returnsToPreview: boolean;
}

export type GoToStepResult = Accepted<{ step: StepId }> | Rejected<GameAccessCode | 'stepNotInMode' | 'stepNotReached'>;
export type GoBackResult = Accepted<{ step: StepId }> | Rejected<GameAccessCode | 'noPreviousStep'>;
export type ContinueResult =
  | Accepted<{ nextStep: StepId }>
  | StepInvalid
  | NeedsConfirmation<ChipSetScopeConfirmation>
  | Rejected<GameAccessCode | 'stepNotInMode' | 'noNextStep'>;
export type ChangeModeResult = Accepted | Rejected<GameAccessCode>;

/** Moves the game to `step` and records it as the working location. */
export function moveTo(state: AppState, game: GameDocument, step: StepId, returnToPreview: boolean): AppState {
  const draft = withWizard(game.planning, {
    lastStep: step,
    reachedSteps: addReached(game.planning.wizard.reachedSteps, step),
    returnToPreview: step === 'preview' ? false : returnToPreview,
  });
  return {
    ...withGame(state, { ...game, planning: draft }),
    location: { kind: 'planning', gameId: game.id, step },
  };
}

/** The step after a valid `step`: back to preview during a correction, else the next in order. */
export function nextStepAfter(game: GameDocument, step: StepId): StepId | null {
  if (game.planning.wizard.returnToPreview) return 'preview';
  const steps = stepsForMode(game.mode);
  return steps[steps.indexOf(step) + 1] ?? null;
}

export function chipSetScopeConfirmation(state: AppState, game: GameDocument): ChipSetScopeConfirmation {
  const sourceId = game.planning.chipSet.sourceTemplateId;
  const source = sourceId ? state.templates.find((t) => t.id === sourceId) : undefined;
  return {
    kind: 'chipSetScope',
    options: source ? ['onlyThisGame', 'updateSourceTemplate'] : ['onlyThisGame', 'saveAsNewTemplate'],
    sourceTemplate: source ? { id: source.id, name: source.name } : null,
    sourceTemplateDeleted: sourceId !== null && !source,
    returnsToPreview: game.planning.wizard.returnToPreview,
  };
}

/** Records a failed Continue on `step` (its problems are now revealed) and returns them. */
export async function failContinue(rt: Runtime, game: GameDocument, step: StepId): Promise<StepInvalid> {
  const problems = validateGame(game).byStep[step];
  const attempted = game.planning.wizard.continueAttemptedSteps;
  if (!attempted.includes(step)) {
    const next = withDraft(game, (d) => withWizard(d, { continueAttemptedSteps: [...attempted, step] }));
    await rt.apply(withGame(rt.state(), next));
  }
  return { status: 'stepInvalid', problems };
}

export function createWizardOperations(rt: Runtime) {
  return {
    /**
     * Opens a step of the wizard. Only reached steps can be opened, except that a correction link
     * from Distribution preview (`fromPreview: true`) may open any step of the mode; it then sets the
     * return-to-preview context. Opening the preview itself clears that context.
     */
    async goToStep(gameId: string, step: StepId, options: { fromPreview?: boolean } = {}): Promise<GoToStepResult> {
      const state = rt.state();
      const access = planningGame(state, gameId);
      if (!access.ok) return access.rejection;
      const game = access.game;
      if (!stepsForMode(game.mode).includes(step)) {
        return rejected('stepNotInMode', 'This step is not part of this game’s mode.');
      }
      const reached = game.planning.wizard.reachedSteps;
      const fromPreview = options.fromPreview === true && reached.includes('preview');
      if (!reached.includes(step) && !fromPreview) {
        return rejected('stepNotReached', 'Finish the earlier steps first.');
      }
      const returnToPreview = fromPreview ? step !== 'preview' : game.planning.wizard.returnToPreview;
      await rt.apply(moveTo(state, game, step, returnToPreview));
      return { status: 'accepted', step };
    },

    /** Back: the previous step of the mode. Keeps all input and the return-to-preview context. */
    async goBack(gameId: string): Promise<GoBackResult> {
      const state = rt.state();
      const access = planningGame(state, gameId);
      if (!access.ok) return access.rejection;
      const game = access.game;
      const steps = stepsForMode(game.mode);
      const index = steps.indexOf(game.planning.wizard.lastStep);
      if (index <= 0) return rejected('noPreviousStep', 'This is the first step.');
      const step = steps[index - 1];
      await rt.apply(moveTo(state, game, step, game.planning.wizard.returnToPreview));
      return { status: 'accepted', step };
    },

    /**
     * Continue (or Return to preview) on `step`. Invalid → `stepInvalid` with the step's problems.
     * A valid Chip set step → `needsConfirmation` (scope popup); finish it with
     * `completeChipSetStep`. Otherwise advances and returns the step now open.
     */
    async continueFromStep(gameId: string, step: StepId): Promise<ContinueResult> {
      const state = rt.state();
      const access = planningGame(state, gameId);
      if (!access.ok) return access.rejection;
      const game = access.game;
      if (!stepsForMode(game.mode).includes(step)) {
        return rejected('stepNotInMode', 'This step is not part of this game’s mode.');
      }
      if (step === 'preview') return rejected('noNextStep', 'Starting a game is not available yet.');
      if (validateGame(game).byStep[step].length > 0) return failContinue(rt, game, step);
      if (step === 'chipSet') return { status: 'needsConfirmation', confirmation: chipSetScopeConfirmation(state, game) };
      const nextStep = nextStepAfter(game, step)!;
      await rt.apply(moveTo(state, game, nextStep, game.planning.wizard.returnToPreview));
      return { status: 'accepted', nextStep };
    },

    /**
     * Changes the mode of a Planning game immediately. Participants, chip set, shared settings and
     * tournament payout entries are all kept; the Payout schedule step appears or disappears.
     */
    async changeMode(gameId: string, mode: GameMode): Promise<ChangeModeResult> {
      const state = rt.state();
      const access = planningGame(state, gameId);
      if (!access.ok) return access.rejection;
      const game = access.game;
      if (game.mode === mode) return { status: 'accepted' };
      let lastStep = game.planning.wizard.lastStep;
      if (!stepsForMode(mode).includes(lastStep)) lastStep = 'settings';
      const next: GameDocument = { ...game, mode, planning: withWizard(game.planning, { lastStep }) };
      const location =
        state.location.kind === 'planning' && state.location.gameId === gameId
          ? { ...state.location, step: lastStep }
          : state.location;
      await rt.apply({ ...withGame(state, next), location });
      return { status: 'accepted' };
    },
  };
}

