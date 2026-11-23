/**
 * The read model screens use for one Planning game.
 */
import type { ChipColor, DistributionPreference, GameMode } from '@/domain/types';

import type { AppState, GameDocument, StepId } from '../core/documents';
import type { Problem } from '../core/problems';
import { type ChipSetSummary, isBlankRow } from '../shared/chip-rows';
import { automaticReserve, DEFAULT_DEPTH_BB, STEP_TITLES, stepsForMode } from './draft';
import { payoutBlockerProblems } from './payout-validation';
import { buildPayoutScheduleView, type PayoutScheduleView } from './payout-view';
import { STEP_STATUS_LABELS, type StepStatus, stepStatuses, validateGame } from './validation';

/** One text input. Show `problem` once `revealed` and the host has left the field (see the guide). */
export interface FieldView {
  /** Exactly what the host typed (or the default). */
  text: string;
  /** The current problem, or `null` when valid. Always reported; the screen decides when to show it. */
  problem: Problem | null;
  /** The host has edited this field (persisted). */
  edited: boolean;
  /** `edited`, or Continue already failed on this step: the problem may be shown. */
  revealed: boolean;
}

export interface StepView {
  id: StepId;
  title: string;
  status: StepStatus;
  statusLabel: string;
  /** The host has reached this step, so the step list may open it. */
  reached: boolean;
  /** This is the game's last visited step. */
  current: boolean;
}

export interface ParticipantView {
  id: string;
  name: string;
  savedPlayerId: string | null;
  /** 1-based fixed joining order. */
  joinOrder: number;
}

export interface ChipRowView {
  id: string;
  value: FieldView;
  quantity: FieldView;
  color: ChipColor | null;
  /** The quantity as a whole number while it is valid, else `null`: what the chip case draws. */
  chipCount: number | null;
  /** Both value and quantity are blank: removal needs no confirmation. */
  blank: boolean;
}

export type ChipSetSource =
  | { kind: 'none' }
  | { kind: 'template'; templateId: string; templateName: string }
  /** Copied from a template that has since been deleted; the game's copy is kept. */
  | { kind: 'deletedTemplate'; templateId: string };

export interface PlanningView {
  gameId: string;
  mode: GameMode;
  phase: 'planning';
  createdAt: string;
  /** Steps of this game's mode, in order. */
  steps: readonly StepView[];
  /** The last visited step: where opening the game resumes. */
  currentStep: StepId;
  /** A correction opened from Distribution preview: label the primary action "Return to preview". */
  returnToPreview: boolean;
  players: {
    participants: readonly ParticipantView[];
    /** Step-level problems (fewer than two players). */
    problems: readonly Problem[];
    continueAttempted: boolean;
  };
  chipSet: {
    rows: readonly ChipRowView[];
    /** "No denominations yet", "Incomplete chip set" or "N denominations · M chips · K chip units". */
    summary: ChipSetSummary;
    /** Set-level problem (no denominations). Row problems are on the rows. */
    setProblem: Problem | null;
    problems: readonly Problem[];
    source: ChipSetSource;
    /** The game has entered chip rows: applying a template asks to replace them. */
    hasEnteredRows: boolean;
    continueAttempted: boolean;
  };
  settings: {
    buyIn: FieldView;
    depth: FieldView;
    /** The recommended starting depth to show next to the field (100 BB). */
    recommendedDepthBb: number;
    preference: DistributionPreference;
    coverage: FieldView;
    reserve: FieldView & {
      mode: 'automatic' | 'custom';
      /** The current automatic count, ceil(roster / 2): the N in "Use automatic (N)". */
      automaticCount: number;
    };
    problems: readonly Problem[];
    continueAttempted: boolean;
  };
  /** The Payout schedule step (tournament); kept (dormant) while the game is a cash game. */
  payoutSchedule: PayoutScheduleView;
  /** Whole-plan check for Distribution preview: problems linked to their source steps. */
  preview: {
    /** Steps with problems, in wizard order, each with its problems. */
    blockers: readonly { step: StepId; title: string; problems: readonly Problem[] }[];
    /** Every step's inputs are valid. Says nothing yet about whether a distribution exists. */
    setupComplete: boolean;
  };
}

function field(
  text: string,
  problemValue: Problem | null,
  key: string,
  edited: readonly string[],
  continueAttempted: boolean,
): FieldView {
  const isEdited = edited.includes(key);
  return { text, problem: problemValue, edited: isEdited, revealed: isEdited || continueAttempted };
}

export function buildPlanningView(state: AppState, game: GameDocument): PlanningView {
  const draft = game.planning;
  const { editedFields, continueAttemptedSteps, reachedSteps, lastStep } = draft.wizard;
  const attempted = (step: StepId) => continueAttemptedSteps.includes(step);
  const validation = validateGame(game);
  const statuses = stepStatuses(game, validation);
  const modeSteps = stepsForMode(game.mode);

  const steps = modeSteps.map((id) => ({
    id,
    title: STEP_TITLES[id],
    status: statuses[id],
    statusLabel: STEP_STATUS_LABELS[statuses[id]],
    reached: reachedSteps.includes(id),
    current: id === lastStep,
  }));

  const sourceId = draft.chipSet.sourceTemplateId;
  const sourceTemplate = sourceId ? state.templates.find((t) => t.id === sourceId) : undefined;
  const source: ChipSetSource = !sourceId
    ? { kind: 'none' }
    : sourceTemplate
      ? { kind: 'template', templateId: sourceId, templateName: sourceTemplate.name }
      : { kind: 'deletedTemplate', templateId: sourceId };

  const s = draft.settings;
  const sv = validation.settings;
  const settingsAttempted = attempted('settings');
  const automaticCount = automaticReserve(draft.participants.length);

  return {
    gameId: game.id,
    mode: game.mode,
    phase: 'planning',
    createdAt: game.createdAt,
    steps,
    currentStep: lastStep,
    returnToPreview: draft.wizard.returnToPreview,
    players: {
      participants: draft.participants.map((p, index) => ({
        id: p.id,
        name: p.name,
        savedPlayerId: p.savedPlayerId,
        joinOrder: index + 1,
      })),
      problems: validation.roster,
      continueAttempted: attempted('players'),
    },
    chipSet: {
      rows: draft.chipSet.rows.map((row) => {
        const problems = validation.chipSet.rows[row.id];
        return {
          id: row.id,
          value: field(row.valueText, problems.value, `chipValue:${row.id}`, editedFields, attempted('chipSet')),
          quantity: field(
            row.quantityText,
            problems.quantity,
            `chipQuantity:${row.id}`,
            editedFields,
            attempted('chipSet'),
          ),
          color: row.color,
          chipCount: problems.chipCount,
          blank: isBlankRow(row),
        };
      }),
      summary: validation.chipSet.summary,
      setProblem: validation.chipSet.setProblem,
      problems: validation.chipSet.problems,
      source,
      hasEnteredRows: draft.chipSet.rows.some((row) => !isBlankRow(row)),
      continueAttempted: attempted('chipSet'),
    },
    settings: {
      buyIn: field(s.buyInText, sv.buyIn.problem, 'buyIn', editedFields, settingsAttempted),
      depth: field(s.depthText, sv.depth.problem, 'depth', editedFields, settingsAttempted),
      recommendedDepthBb: DEFAULT_DEPTH_BB,
      preference: s.preference,
      coverage: field(s.coverageText, sv.coverage.problem, 'coverage', editedFields, settingsAttempted),
      reserve: {
        ...field(
          s.reserve.mode === 'automatic' ? String(automaticCount) : s.reserve.text,
          sv.reserve.problem,
          'reserve',
          editedFields,
          settingsAttempted,
        ),
        mode: s.reserve.mode,
        automaticCount,
      },
      problems: sv.problems,
      continueAttempted: settingsAttempted,
    },
    payoutSchedule: buildPayoutScheduleView(
      game,
      validation.payouts,
      sv.buyIn.cents,
      editedFields,
      attempted('payouts'),
    ),
    preview: {
      blockers: modeSteps
        .filter((step) => validation.byStep[step].length > 0)
        .map((step) => ({
          step,
          title: STEP_TITLES[step],
          problems:
            step === 'payouts'
              ? payoutBlockerProblems(draft.payoutSchedule, validation.byStep.payouts)
              : validation.byStep[step],
        })),
      setupComplete: modeSteps.every((step) => validation.byStep[step].length === 0),
    },
  };
}
