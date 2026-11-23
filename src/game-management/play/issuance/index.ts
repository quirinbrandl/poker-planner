/**
 * Rebuys and late entry: proposals from the bank and their confirmed issuance, plus the screen
 * reads of Play, Bank & reserve, Add player and Game details. Everything returned here becomes
 * part of `app.play`.
 */
import type { Runtime } from '../../core/runtime';
import { findGame } from '../../planning/draft';
import {
  type BankReserveScreenView,
  type GameDetailsScreenView,
  getBankReserve,
  getGameDetails,
  getPlayScreen,
  type PlayScreenView,
} from '../view';
import { addLatePlayer, getAddPlayer, proposeEntry } from './entry';
import { issueRebuy, proposeRebuy } from './rebuy';
import type {
  AddLatePlayerResult,
  AddPlayerScreenView,
  EntryAcceptance,
  EntryProposalResult,
  IssueRebuyResult,
  RebuyAcceptance,
  RebuyProposalResult,
} from './types';

export function createIssuanceOperations(rt: Runtime) {
  return {
    /** Play of an In progress cash game; `null` otherwise (tournaments have their own Play). */
    getPlayScreen(gameId: string): PlayScreenView | null {
      return getPlayScreen(rt, findGame(rt.state(), gameId));
    },

    /** Bank & reserve of an In progress game; `null` otherwise. */
    getBankReserve(gameId: string): BankReserveScreenView | null {
      return getBankReserve(rt, findGame(rt.state(), gameId));
    },

    /** Locked Game details of a started game (In progress or Completed, both modes); `null` in Planning. */
    getGameDetails(gameId: string): GameDetailsScreenView | null {
      return getGameDetails(rt, findGame(rt.state(), gameId));
    },

    /** Add player (late entry): the entry terms and the saved players to choose from; `null` unless In progress. */
    getAddPlayer(gameId: string): AddPlayerScreenView | null {
      return getAddPlayer(rt, gameId);
    },

    /**
     * Rebuy for a participant: `needsConfirmation` with the popup and the `acceptance` to pass to
     * `issueRebuy`, or a blocked request (`rejected` with `blocked`: show it in the popup), or a
     * rejection. Records nothing.
     */
    proposeRebuy(gameId: string, participantId: string): RebuyProposalResult {
      return proposeRebuy(rt, gameId, participantId);
    },

    /** Issue rebuy / Accept & issue: records exactly the reviewed proposal, or `proposalChanged`. */
    issueRebuy(gameId: string, acceptance: RebuyAcceptance): Promise<IssueRebuyResult> {
      return issueRebuy(rt, gameId, acceptance);
    },

    /**
     * Review entry for a saved player: `needsConfirmation` with the popup and the `acceptance` to
     * pass to `addLatePlayer`, or a blocked entry (`rejected` with `blocked`), or a rejection.
     * Records nothing.
     */
    proposeEntry(gameId: string, savedPlayerId: string): EntryProposalResult {
      return proposeEntry(rt, gameId, savedPlayerId);
    },

    /** Add player & issue stack: admits the player exactly as reviewed, or `proposalChanged`. */
    addLatePlayer(gameId: string, acceptance: EntryAcceptance): Promise<AddLatePlayerResult> {
      return addLatePlayer(rt, gameId, acceptance);
    },
  };
}
