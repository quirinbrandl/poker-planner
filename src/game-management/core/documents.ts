/**
 * Persisted document shapes (schema version 1). Internal to game management: screens read views,
 * never these documents.
 *
 * One game is one `GameDocument`. Reusable players, chip set templates and the working location are
 * one document each. Later work adds optional sections to `GameDocument` (completion) or to its
 * `play` record (results, eliminations, …); add them as new optional fields or bump
 * `SCHEMA_VERSION` with a migration in `core/persistence.ts`.
 */
import type { ExactCents } from '@/domain/money';
import type { PayoutPresetId, ShareBasisPoints } from '@/domain/payouts';
import type {
  Cents,
  ChipColor,
  ChipDenomination,
  ChipMix,
  DistributionPreference,
  GameMode,
  GamePhase,
} from '@/domain/types';

export const SCHEMA_VERSION = 1;

/** Wizard steps in display order. Which ones a game shows depends on its mode (see `stepsForMode`). */
export type StepId = 'mode' | 'players' | 'chipSet' | 'settings' | 'payouts' | 'preview';

export interface GameDocument {
  id: string;
  mode: GameMode;
  phase: GamePhase;
  /** ISO 8601 date-time of creation. */
  createdAt: string;
  /**
   * The Planning draft. While the game is In progress it stays exactly as it was at Start (it is
   * locked); Return to Planning reopens it with the then current roster.
   */
  planning: PlanningDraft;
  /** Present from Start on (In progress, later Completed); removed by Return to Planning. */
  play?: PlayRecord;
}

/**
 * What Start fixed and what has physically happened since. Only facts are stored: the bank,
 * contributions, reserve consumption and totals are derived from these records (`play/ledger.ts`).
 *
 * Later record types are appended as further fields (for example cash-game final results with the
 * mixes they return, count drafts, the tournament elimination order); every such field must be
 * cleared by Return to Planning and counted in its confirmation.
 */
export interface PlayRecord {
  /** ISO 8601 date-time of Start. */
  startedAt: string;
  terms: StartedTerms;
  /** Everyone who played, in fixed joining order: the initial roster, then late arrivals. */
  roster: RosterEntry[];
  /** Every stack handed out, in the order it was handed out, with the contribution it was for. */
  issuances: IssuanceRecord[];
}

export interface RosterEntry extends Participant {
  /** `initial`: in the roster at Start. `lateEntry`: joined while In progress. */
  entry: 'initial' | 'lateEntry';
}

/** The setup Start locked. Never changes while the game is In progress or Completed. */
export interface StartedTerms {
  /** The chip set, ascending by value (row order of the draft is kept there). */
  chipSet: ChipDenomination[];
  /** The shared buy-in; every rebuy and late entry costs the same. */
  buyIn: Cents;
  requestedDepthBb: number;
  /** The accepted depth (may differ from the requested one). */
  depthBb: number;
  blinds: { small: number; big: number };
  /** Exact chip-unit value T of every starting stack, rebuy and late-entry stack. */
  stackValue: number;
  coverage: number;
  preference: DistributionPreference;
  reserve: {
    /** How the target was configured in Game settings. */
    mode: 'automatic' | 'custom';
    /** The configured target R at Start. */
    configured: number;
    /** The reserve Start guaranteed (r ≤ R): the started target that rebuys and late entries consume. */
    target: number;
  };
  /** Cash games: the exact fixed rate in cents per chip unit (buy-in ÷ stack value). */
  cashRate: ExactCents | null;
  /** Tournaments: the locked payout schedule. */
  payoutSchedule: LockedPayoutSchedule | null;
}

export interface LockedPayoutSchedule {
  /** 1st, 2nd … place in basis points; they sum to 10000. */
  shares: ShareBasisPoints[];
  presetId: PayoutPresetId | null;
}

/** One stack physically handed out, with the contribution it was handed out for. */
export interface IssuanceRecord {
  id: string;
  participantId: string;
  /** `initial`: at Start. Later work adds `rebuy` and `lateEntry`. */
  kind: 'initial' | 'rebuy' | 'lateEntry';
  /** The money this stack was contributed for (always the buy-in). */
  contribution: Cents;
  /** The actual chips handed out, one entry per denomination of the chip set, ascending. */
  mix: ChipMix;
  /** ISO 8601 date-time it was recorded. */
  recordedAt: string;
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

/** Where the host last was. */
export type WorkingLocation =
  | { kind: 'games' }
  | { kind: 'history' }
  | { kind: 'savedPlayers' }
  | { kind: 'templates' }
  | { kind: 'planning'; gameId: string; step: StepId }
  /** The workspace tabs of a started game. */
  | { kind: 'play' | 'results' | 'details'; gameId: string };

/** The working-location kinds of a started game's workspace. */
export type GameWorkspaceKind = 'play' | 'results' | 'details';

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
