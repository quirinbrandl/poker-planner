/**
 * The game's chip set: denomination rows, applying templates and finishing the Chip set step with
 * a scope (only this game / also update template / save as new template).
 */
import type { ChipColor } from '@/domain/types';

import type { ChipRowDraft, ChipSetDraft, GameDocument } from '../core/documents';
import {
  type Accepted,
  type EditResult,
  type GameAccessCode,
  type NeedsConfirmation,
  type Rejected,
  rejected,
  type StepInvalid,
} from '../core/results';
import type { Runtime } from '../core/runtime';
import { prepareTemplate, type TemplateInput, type TemplateInvalidCode } from '../reusable/templates';
import { isBlankRow, isChipColor, rowsFromDenominations, validateChipRows } from '../shared/chip-rows';
import { markEdited, planningGame, withDraft, withGame, withoutEdited } from './draft';
import { editPlanningGame } from './edit';
import { validateGame } from './validation';
import { failContinue, moveTo, nextStepAfter } from './wizard';

export interface RemoveChipRowConfirmation {
  kind: 'removeChipRow';
  rowId: string;
  /** 1-based position, for "Remove denomination 2?". */
  index: number;
  valueText: string;
  quantityText: string;
}

export interface ReplaceChipSetConfirmation {
  kind: 'replaceChipSet';
  templateName: string;
}

/** The host's answer to "Where should changes apply?". */
export type ChipSetScope =
  | { kind: 'onlyThisGame' }
  | { kind: 'updateSourceTemplate' }
  | { kind: 'saveAsNewTemplate'; name: string };

type RowCode = GameAccessCode | 'rowNotFound';

export type AddChipRowResult = Accepted<{ rowId: string }> | Rejected<GameAccessCode>;
export type SetChipColorResult = Accepted | Rejected<RowCode | 'invalidColor'>;
export type RemoveChipRowResult = Accepted | NeedsConfirmation<RemoveChipRowConfirmation> | Rejected<RowCode>;
export type ApplyTemplateResult =
  | Accepted
  | NeedsConfirmation<ReplaceChipSetConfirmation>
  | Rejected<GameAccessCode | 'templateNotFound'>;
export type CreateTemplateAndApplyResult =
  | Accepted<{ templateId: string }>
  | NeedsConfirmation<ReplaceChipSetConfirmation>
  | Rejected<GameAccessCode | TemplateInvalidCode>;
export type CompleteChipSetStepResult =
  | Accepted<{ nextStep: 'settings' | 'preview'; templateId?: string }>
  | StepInvalid
  | Rejected<GameAccessCode | TemplateInvalidCode | 'sourceTemplateMissing'>;
export type SaveChipSetAsTemplateResult =
  | Accepted<{ templateId: string }>
  | StepInvalid
  | Rejected<GameAccessCode | TemplateInvalidCode>;

function updateRow(game: GameDocument, rowId: string, change: (row: ChipRowDraft) => ChipRowDraft) {
  if (!game.planning.chipSet.rows.some((r) => r.id === rowId)) {
    return rejected('rowNotFound', 'This denomination row no longer exists.');
  }
  return withDraft(game, (draft) => ({
    ...draft,
    chipSet: { ...draft.chipSet, rows: draft.chipSet.rows.map((r) => (r.id === rowId ? change(r) : r)) },
  }));
}

function rowProblems(game: GameDocument, rowId: string, part: 'value' | 'quantity') {
  const p = validateChipRows(game.planning.chipSet.rows).rows[rowId]?.[part];
  return p ? [p] : [];
}

function rowEditKeys(rowId: string) {
  return [`chipValue:${rowId}`, `chipQuantity:${rowId}`];
}

/** Replaces the game's rows with a copy of the template's denominations and links the source. */
function withTemplateCopy(game: GameDocument, templateId: string, denominations: TemplateInput['rows'], newId: () => string) {
  const oldRowKeys = game.planning.chipSet.rows.flatMap((r) => rowEditKeys(r.id));
  const chipSet: ChipSetDraft = {
    rows: denominations.map((row) => ({ ...row, id: newId() })),
    sourceTemplateId: templateId,
  };
  return withDraft(game, (draft) => withoutEdited({ ...draft, chipSet }, oldRowKeys));
}

export function createChipSetOperations(rt: Runtime) {
  return {
    /** Add denomination: appends a blank row (no colour) at the bottom. */
    async addChipRow(gameId: string): Promise<AddChipRowResult> {
      const rowId = rt.newId();
      const result = await editPlanningGame(rt, gameId, (game) =>
        withDraft(game, (draft) => ({
          ...draft,
          chipSet: {
            ...draft.chipSet,
            rows: [...draft.chipSet.rows, { id: rowId, valueText: '', quantityText: '', color: null }],
          },
        })),
      );
      return result.status === 'rejected' ? result : { status: 'accepted', rowId };
    },

    setChipValueText(gameId: string, rowId: string, text: string): Promise<EditResult> {
      return editPlanningGame(
        rt,
        gameId,
        (game) => {
          const next = updateRow(game, rowId, (row) => ({ ...row, valueText: text }));
          return 'status' in next ? next : withDraft(next, (d) => markEdited(d, `chipValue:${rowId}`));
        },
        (game) => rowProblems(game, rowId, 'value'),
      );
    },

    setChipQuantityText(gameId: string, rowId: string, text: string): Promise<EditResult> {
      return editPlanningGame(
        rt,
        gameId,
        (game) => {
          const next = updateRow(game, rowId, (row) => ({ ...row, quantityText: text }));
          return 'status' in next ? next : withDraft(next, (d) => markEdited(d, `chipQuantity:${rowId}`));
        },
        (game) => rowProblems(game, rowId, 'quantity'),
      );
    },

    /** Apply color. `null` is "No color". Never affects any number. */
    setChipColor(gameId: string, rowId: string, color: ChipColor | null): Promise<SetChipColorResult> {
      if (color !== null && !isChipColor(color)) {
        return Promise.resolve(rejected('invalidColor', 'Choose one of the listed colors.'));
      }
      return editPlanningGame(rt, gameId, (game) => updateRow(game, rowId, (row) => ({ ...row, color }))) as Promise<SetChipColorResult>;
    },

    /**
     * Removes a row. A blank row goes immediately; a row with any entered value or quantity returns
     * `needsConfirmation` first; call again with `{ confirmed: true }`. Removing every row is allowed.
     */
    async removeChipRow(gameId: string, rowId: string, options: { confirmed?: boolean } = {}): Promise<RemoveChipRowResult> {
      const access = planningGame(rt.state(), gameId);
      if (!access.ok) return access.rejection;
      const rows = access.game.planning.chipSet.rows;
      const index = rows.findIndex((r) => r.id === rowId);
      if (index < 0) return rejected('rowNotFound', 'This denomination row no longer exists.');
      const row = rows[index];
      if (!isBlankRow(row) && !options.confirmed) {
        return {
          status: 'needsConfirmation',
          confirmation: { kind: 'removeChipRow', rowId, index: index + 1, valueText: row.valueText, quantityText: row.quantityText },
        };
      }
      return editPlanningGame(rt, gameId, (game) =>
        withDraft(game, (draft) =>
          withoutEdited(
            { ...draft, chipSet: { ...draft.chipSet, rows: draft.chipSet.rows.filter((r) => r.id !== rowId) } },
            rowEditKeys(rowId),
          ),
        ),
      ) as Promise<RemoveChipRowResult>;
    },

    /**
     * Use template: copies the template's rows and colours into this game and remembers it as the
     * source. If the game already has entered rows, returns `needsConfirmation` ("Replace this game's
     * chip set?") until called with `{ confirmed: true }`.
     */
    async applyTemplate(gameId: string, templateId: string, options: { confirmed?: boolean } = {}): Promise<ApplyTemplateResult> {
      const state = rt.state();
      const access = planningGame(state, gameId);
      if (!access.ok) return access.rejection;
      const template = state.templates.find((t) => t.id === templateId);
      if (!template) return rejected('templateNotFound', 'This template no longer exists.');
      const game = access.game;
      if (game.planning.chipSet.rows.some((r) => !isBlankRow(r)) && !options.confirmed) {
        return { status: 'needsConfirmation', confirmation: { kind: 'replaceChipSet', templateName: template.name } };
      }
      const next = withTemplateCopy(game, template.id, rowsFromDenominations(template.denominations), rt.newId);
      await rt.apply(withGame(state, next));
      return { status: 'accepted' };
    },

    /**
     * Save and use (template editor opened from the picker): validates, then — after the replace
     * confirmation if the game has entered rows — creates the template and applies a copy, atomically.
     */
    async createTemplateAndApply(
      gameId: string,
      input: TemplateInput,
      options: { confirmed?: boolean } = {},
    ): Promise<CreateTemplateAndApplyResult> {
      const state = rt.state();
      const access = planningGame(state, gameId);
      if (!access.ok) return access.rejection;
      const prepared = prepareTemplate(state, input, rt.newId());
      if (!prepared.ok) return prepared.rejection;
      const game = access.game;
      if (game.planning.chipSet.rows.some((r) => !isBlankRow(r)) && !options.confirmed) {
        return { status: 'needsConfirmation', confirmation: { kind: 'replaceChipSet', templateName: prepared.template.name } };
      }
      const template = prepared.template;
      const next = withTemplateCopy(game, template.id, rowsFromDenominations(template.denominations), rt.newId);
      await rt.apply({ ...withGame(state, next), templates: [...state.templates, template] });
      return { status: 'accepted', templateId: template.id };
    },

    /**
     * Finishes a valid Chip set step with the host's scope choice and advances (to Game settings,
     * or back to Distribution preview during a correction). Invalid rows → `stepInvalid`, nothing else
     * changes. `updateSourceTemplate` needs an existing source template. `saveAsNewTemplate` creates
     * a template from the game's rows and links it as the source.
     */
    async completeChipSetStep(gameId: string, scope: ChipSetScope): Promise<CompleteChipSetStepResult> {
      const state = rt.state();
      const access = planningGame(state, gameId);
      if (!access.ok) return access.rejection;
      let game = access.game;
      if (validateGame(game).byStep.chipSet.length > 0) return failContinue(rt, game, 'chipSet');
      const denominations = validateChipRows(game.planning.chipSet.rows).denominations!;
      let templates = state.templates;
      let templateId: string | undefined;

      if (scope.kind === 'updateSourceTemplate') {
        const sourceId = game.planning.chipSet.sourceTemplateId;
        const source = sourceId ? templates.find((t) => t.id === sourceId) : undefined;
        if (!source) {
          return rejected('sourceTemplateMissing', 'The source template no longer exists. Save as a new template instead.');
        }
        templates = templates.map((t) => (t.id === source.id ? { ...t, denominations } : t));
        templateId = source.id;
      } else if (scope.kind === 'saveAsNewTemplate') {
        const prepared = prepareTemplate(state, { name: scope.name, rows: rowsFromDenominations(denominations) }, rt.newId());
        if (!prepared.ok) return prepared.rejection;
        templates = [...templates, prepared.template];
        templateId = prepared.template.id;
        game = withDraft(game, (d) => ({ ...d, chipSet: { ...d.chipSet, sourceTemplateId: templateId! } }));
      }

      const nextStep = nextStepAfter(game, 'chipSet') as 'settings' | 'preview';
      const moved = moveTo({ ...state, templates }, game, nextStep, game.planning.wizard.returnToPreview, rt.newId);
      await rt.apply(moved);
      return templateId ? { status: 'accepted', nextStep, templateId } : { status: 'accepted', nextStep };
    },

    /**
     * Saves the game's current (valid) chip set as a new template and links it as the source,
     * without leaving the step.
     */
    async saveChipSetAsTemplate(gameId: string, name: string): Promise<SaveChipSetAsTemplateResult> {
      const state = rt.state();
      const access = planningGame(state, gameId);
      if (!access.ok) return access.rejection;
      const game = access.game;
      const denominations = validateChipRows(game.planning.chipSet.rows).denominations;
      if (!denominations) return failContinue(rt, game, 'chipSet');
      const prepared = prepareTemplate(state, { name, rows: rowsFromDenominations(denominations) }, rt.newId());
      if (!prepared.ok) return prepared.rejection;
      const linked = withDraft(game, (d) => ({ ...d, chipSet: { ...d.chipSet, sourceTemplateId: prepared.template.id } }));
      await rt.apply({ ...withGame(state, linked), templates: [...state.templates, prepared.template] });
      return { status: 'accepted', templateId: prepared.template.id };
    },
  };
}
