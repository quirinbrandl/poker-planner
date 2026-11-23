/**
 * Chip set templates. A game holds an independent copy of its chip set; editing or deleting a
 * template never changes any game, and a game edit reaches a template only through an explicit
 * scope choice (see `planning.completeChipSetStep`).
 */
import type { ChipDenomination } from '@/domain/types';

import type { AppState, ChipSetTemplate } from '../core/documents';
import type { Problem } from '../core/problems';
import { type Accepted, type Rejected, rejected } from '../core/results';
import type { Runtime } from '../core/runtime';
import {
  type ChipRowInput,
  type ChipRowsValidation,
  type ChipSetSummary,
  isChipColor,
  rowsFromDenominations,
  summarizeDenominations,
  validateChipRows,
} from '../shared/chip-rows';
import { byName, checkName } from '../shared/names';

export interface TemplateInput {
  name: string;
  rows: readonly ChipRowInput[];
}

export interface TemplateView {
  id: string;
  name: string;
  /** Denominations in the template's row order, with colours: enough for a compact chip tray. */
  denominations: readonly ChipDenomination[];
  /** Counts and the "N denominations · M chips · K chip units" label. */
  summary: ChipSetSummary;
}

/** What a template editor starts from: the saved name and its rows as editable text. */
export interface TemplateEditorDraft {
  name: string;
  rows: ChipRowInput[];
}

export type TemplateInvalidCode = 'invalidTemplate';
export type CreateTemplateResult = Accepted<{ templateId: string }> | Rejected<TemplateInvalidCode>;
export type UpdateTemplateResult = Accepted | Rejected<TemplateInvalidCode | 'templateNotFound'>;
export type DeleteTemplateResult = Accepted | Rejected<'templateNotFound'>;

/**
 * Validates a template's name and rows (excluding `exceptId` from the duplicate-name check).
 * Rejection reason `invalidTemplate` carries every problem: `name` and row fields.
 */
export function prepareTemplate(
  state: AppState,
  input: TemplateInput,
  id: string,
  exceptId?: string,
): { ok: true; template: ChipSetTemplate } | { ok: false; rejection: Rejected<TemplateInvalidCode> } {
  const check = checkName(
    input.name,
    state.templates.filter((t) => t.id !== exceptId).map((t) => t.name),
    'template',
  );
  const rows = input.rows.map((row) => ({ ...row, color: isChipColor(row.color) ? row.color : null }));
  const validation = validateChipRows(rows);
  const problems: Problem[] = [...(check.ok ? [] : [check.problem]), ...validation.problems];
  if (!check.ok || !validation.denominations) {
    return { ok: false, rejection: rejected('invalidTemplate', problems[0].message, problems) };
  }
  return { ok: true, template: { id, name: check.name, denominations: validation.denominations } };
}

export function templateView(template: ChipSetTemplate): TemplateView {
  return {
    id: template.id,
    name: template.name,
    denominations: template.denominations,
    summary: summarizeDenominations(template.denominations),
  };
}

export function createTemplateOperations(rt: Runtime) {
  const views = () => {
    const templates = rt.state().templates;
    return rt.memo('templates.list', [templates], () => [...templates].sort(byName).map(templateView));
  };

async function update(templateId: string, input: TemplateInput): Promise<UpdateTemplateResult> {
    const state = rt.state();
    if (!state.templates.some((t) => t.id === templateId)) {
      return rejected('templateNotFound', 'This template no longer exists.');
    }
    const prepared = prepareTemplate(state, input, templateId, templateId);
    if (!prepared.ok) return prepared.rejection;
    await rt.apply({
      ...state,
      templates: state.templates.map((t) => (t.id === templateId ? prepared.template : t)),
    });
    return { status: 'accepted' };
  }

  return {
    /** Templates in alphabetical order, with what the picker and management list show. */
    list(): readonly TemplateView[] {
      return views();
    },

    get(templateId: string): TemplateView | null {
      return views().find((t) => t.id === templateId) ?? null;
    },

    /** The saved name and rows as text, to start editing an existing template. */
    getEditorDraft(templateId: string): TemplateEditorDraft | null {
      const template = rt.state().templates.find((t) => t.id === templateId);
      return template ? { name: template.name, rows: rowsFromDenominations(template.denominations) } : null;
    },

    /**
     * Live validation for a template editor's unsaved rows: per-row problems and the summary.
     * Pure; nothing is stored.
     */
    describeRows(rows: readonly ChipRowInput[]): ChipRowsValidation {
      return validateChipRows(rows);
    },

    /** Save in the template editor for a new template. */
    async create(input: TemplateInput): Promise<CreateTemplateResult> {
      const state = rt.state();
      const prepared = prepareTemplate(state, input, rt.newId());
      if (!prepared.ok) return prepared.rejection;
      await rt.apply({ ...state, templates: [...state.templates, prepared.template] });
      return { status: 'accepted', templateId: prepared.template.id };
    },

    /** Save in the template editor for an existing template: replaces its name and rows. */
    update,

    /** Renames a template, keeping its rows. */
    async rename(templateId: string, name: string): Promise<UpdateTemplateResult> {
      const template = rt.state().templates.find((t) => t.id === templateId);
      if (!template) return rejected('templateNotFound', 'This template no longer exists.');
      return update(templateId, { name, rows: rowsFromDenominations(template.denominations) });
    },

    /** Deletes a template. Games keep their copies; the source link of a game shows it as deleted. */
    async delete(templateId: string): Promise<DeleteTemplateResult> {
      const state = rt.state();
      if (!state.templates.some((t) => t.id === templateId)) {
        return rejected('templateNotFound', 'This template no longer exists.');
      }
      await rt.apply({ ...state, templates: state.templates.filter((t) => t.id !== templateId) });
      return { status: 'accepted' };
    },
  };
}
