/**
 * Persisted document shapes (schema version 1). Internal to game management: screens read views,
 * never these documents.
 *
 * One game is one `GameDocument`. Reusable players, chip set templates and the working location are
 * one document each. Later work adds optional sections to `GameDocument` (accepted setup, play,
 * completion); add them as new optional fields or bump `SCHEMA_VERSION` with a migration in
 * `core/persistence.ts`.
 */
import type { PayoutPresetId } from '@/domain/payouts';
import type { ChipColor, ChipDenomination, DistributionPreference, GameMode, GamePhase } from '@/domain/types';

export const SCHEMA_VERSION = 1;

/** Wizard steps in display order. Which ones a game shows depends on its mode (see `stepsForMode`). */
export type StepId = 'mode' | 'players' | 'chipSet' | 'settings' | 'payouts' | 'preview';

export interface GameDocument {
  id: string;
  mode: GameMode;
  phase: GamePhase;
  /** ISO 8601 date-time of creation. */
  createdAt: string;
  planning: PlanningDraft;
}

/** The Planning draft: every input exactly as typed. */
export interface PlanningDraft {
  /** In fixed joining order. */
  participants: Participant[];
  chipSet: ChipSetDraft;
  settings: SettingsDraft;
  /** Tournament only; kept dormant while the game is a cash game. */
  payoutSchedule: PayoutScheduleDraft;
  wizard: WizardState;
}

export interface Participant {
  id: string;
  /** Captured, trimmed name. Never changes when the saved player is renamed or deleted. */
  name: string;
  /** The saved player this participant was captured from, if any. May no longer exist. */
  savedPlayerId: string | null;
}

export interface ChipRowDraft {
  id: string;
  valueText: string;
  quantityText: string;
  color: ChipColor | null;
}

export interface ChipSetDraft {
  rows: ChipRowDraft[];
  /** The template this chip set was last copied from or saved to. It may since have been deleted. */
  sourceTemplateId: string | null;
}

export type ReserveDraft = { mode: 'automatic' } | { mode: 'custom'; text: string };

export interface SettingsDraft {
  buyInText: string;
  depthText: string;
  preference: DistributionPreference;
  coverageText: string;
  reserve: ReserveDraft;
}

export interface PayoutRowDraft {
  id: string;
  shareText: string;
}

export interface PayoutScheduleDraft {
  /** Ordered by finishing place: first row is first place. Empty: no schedule chosen yet. */
  rows: PayoutRowDraft[];
  /**
   * The preset the rows were last set from, until the host edits a share or adds or removes a place
   * (then `null`: Custom). Absent in drafts saved before presets existed (= Custom).
   */
  presetId?: PayoutPresetId | null;
}

export interface WizardState {
  lastStep: StepId;
  reachedSteps: StepId[];
  /** A correction was opened from Distribution preview; the step's primary action returns there. */
  returnToPreview: boolean;
  /** Fields the host has edited (`FieldKey`s). */
  editedFields: string[];
  /** Steps where Continue failed at least once. */
  continueAttemptedSteps: StepId[];
}

export interface SavedPlayer {
  id: string;
  name: string;
}

export interface ChipSetTemplate {
  id: string;
  name: string;
  /** Validated denominations in the host's row order. */
  denominations: ChipDenomination[];
}

/** Where the host last was. Planning is the only game workspace so far; later work adds more kinds. */
export type WorkingLocation =
  | { kind: 'games' }
  | { kind: 'history' }
  | { kind: 'savedPlayers' }
  | { kind: 'templates' }
  | { kind: 'planning'; gameId: string; step: StepId };

/** The whole application state, immutable. Each change produces a new object. */
export interface AppState {
  games: Readonly<Record<string, GameDocument>>;
  savedPlayers: readonly SavedPlayer[];
  templates: readonly ChipSetTemplate[];
  location: WorkingLocation;
}

export const EMPTY_STATE: AppState = {
  games: {},
  savedPlayers: [],
  templates: [],
  location: { kind: 'games' },
};
