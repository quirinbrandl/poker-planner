/**
 * Game management: the one public application-level interface for screens and integration tests.
 * See docs/application-interface.md. Import only from this file (and `storage/*` adapters).
 */
export { createGameManagement } from './application';
export type { GameManagement, GameManagementOptions } from './application';

// Results and problems
export type {
  Accepted,
  EditResult,
  GameAccessCode,
  NeedsConfirmation,
  Rejected,
  RejectionReason,
  SavedInvalid,
  StepInvalid,
} from './core/results';
export type { FieldKey, Problem, ProblemCode } from './core/problems';
export type { PersistenceStatus } from './core/runtime';
export { CorruptDataError, UnsupportedDataVersionError } from './core/persistence';
export type { GameWorkspaceKind, StepId, WorkingLocation } from './core/documents';

// Games
export type { CreateGameResult, DeleteGameResult, GameCard, OpenGameResult } from './games/games';

// Planning
export type { PlanningApi } from './planning';
export type {
  ChipRowView,
  ChipSetSource,
  FieldView,
  ParticipantView,
  PlanningView,
  StepView,
} from './planning/view';
export type { StepStatus } from './planning/validation';
export type {
  ChipCountView,
  DistributionPlanView,
  DistributionPreviewView,
  NoValidDistributionReason,
  PreviewStepView,
  StartAcceptance,
  StartCode,
  StartResult,
} from './planning/distribution-view';
export type {
  ChangeModeResult,
  ChipSetScopeConfirmation,
  ChipSetScopeOption,
  ContinueResult,
  GoBackResult,
  GoToStepResult,
} from './planning/wizard';
export type {
  AddChipRowResult,
  ApplyTemplateResult,
  ChipSetScope,
  CompleteChipSetStepResult,
  CreateTemplateAndApplyResult,
  RemoveChipRowConfirmation,
  RemoveChipRowResult,
  ReplaceChipSetConfirmation,
  SaveChipSetAsTemplateResult,
  SetChipColorResult,
} from './planning/chip-set';
export type { SettingTextField } from './planning/settings';
export type {
  AddSavedPlayersResult,
  CreateSavedPlayerAndAddResult,
  PlayerPickerEntry,
  RemoveParticipantResult,
} from './planning/participants';
export type {
  AddPayoutPlaceResult,
  ChoosePayoutPresetResult,
  RemovePayoutPlaceResult,
} from './planning/payout-schedule';
export type {
  PayoutPlaceView,
  PayoutPresetOption,
  PayoutScheduleView,
  PayoutTotalView,
  PrizeAmountView,
  PrizePoolView,
} from './planning/payout-view';
export type { ValidPayoutSchedule } from './planning/payout-validation';
export type { PayoutPresetId, ShareBasisPoints } from '@/domain/payouts';

// In progress
export type { PlayApi } from './play';
export type {
  ChipsView,
  LockedDetailsView,
  MoneyView,
  PlayPlayerView,
  PlayTermsView,
  PlayView,
  ReserveStatusView,
} from './play/view';
export type {
  ReturnToPlanningCode,
  ReturnToPlanningConfirmation,
  ReturnToPlanningResult,
} from './play/return-to-planning';

// Cash-game final chip counts, results and accounting status
export type {
  BlockedChip,
  BlockedMixData,
  BuyInRecord,
  CashPlayerView,
  CashResultsView,
  ChipFace,
  CountEditorView,
  CountTotals,
  EditorProblem,
  MixChip,
  PlayerResult,
  QuantityEntry,
  QuantityState,
  ResultConfirmationData,
  ResultsPlayerRow,
  ResultsStatus,
  ReturnToPlayData,
  SignedMoney,
  UndoRebuyData,
} from './play/results/types';
export type {
  ConfirmResultCode,
  ConfirmResultResult,
  CountBlocked,
  CountEditCode,
  CountEditResult,
  CountNeedsCorrection,
  ReviewCountResult,
  ReviewedCount,
} from './play/results/count';
export type { ResultAccessCode } from './play/results/shared';

// Reusable records
export type {
  CreateSavedPlayerResult,
  DeleteSavedPlayerResult,
  RenameSavedPlayerResult,
  SavedPlayerView,
} from './reusable/saved-players';
export type {
  CreateTemplateResult,
  DeleteTemplateResult,
  TemplateEditorDraft,
  TemplateInput,
  TemplateView,
  UpdateTemplateResult,
} from './reusable/templates';
export type { ChipRowInput, ChipRowProblems, ChipRowsValidation, ChipSetSummary } from './shared/chip-rows';

// Working location
export type { SetLocationResult } from './location/working-location';

// Storage
export type { DocumentChange, DocumentStore } from './storage/document-store';
export { createMemoryStore } from './storage/memory-store';
export { openPlatformStore } from './storage/platform-store';
