import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { WorkspaceFrame, type WorkspaceTab } from '@/features/game/WorkspaceFrame';
import {
  Button,
  Card,
  ListRow,
  PlaceBadge,
  SectionHeading,
  space,
  TermsPanel,
  Text,
  useToast,
} from '@/ui';

import { OutDialog } from './OutDialog';
import { PrizeLadder } from './PrizeLadder';
import { SameHandDialog } from './SameHandDialog';
import type { StillInData, TournamentActionResult, TournamentPlayData } from './types';
import { useOperation } from './useOperation';

/** Which popup Play shows on load (development fixtures and captures). */
export type TournamentPlayPopup =
  | { kind: 'out'; playerId: string }
  | { kind: 'sameHand'; selectedIds: readonly string[] };

export interface TournamentPlayProps {
  data: TournamentPlayData;
  /** Host is running an operation for this screen: confirms show busy and cannot run. */
  busy?: boolean;
  onSelectTab: (tab: WorkspaceTab) => void;
  onBack: () => void;
  /** Game actions (⋯). */
  onMore: () => void;
  /** Opens the approved rebuy popup for a player still in (also "Rebuy instead"). */
  onRebuy: (playerId: string) => void;
  /** Record one elimination at the place shown in its popup. */
  onRecordElimination: (playerId: string) => Promise<TournamentActionResult>;
  /** Record several eliminations from one hand, best place first. */
  onRecordSameHand: (playerIdsBestFirst: readonly string[]) => Promise<TournamentActionResult>;
  /** An operation was rejected; nothing changed. Show the reason. */
  onRejected: (message: string) => void;
  /** Late entry (only offered while it is open). */
  onAddPlayer: () => void;
  onOpenPlayer: (playerId: string) => void;
  /** The reserve line: opens the bank and reserve view. */
  onOpenBank: () => void;
  /** Development fixtures: a popup open on load. */
  initialPopup?: TournamentPlayPopup;
}

type Popup = TournamentPlayPopup | null;

/**
 * Tournament Play, layout B · Standings: terms, the prize ladder, the Still in card with + Rebuy and
 * Out per player, the unpaid places, and the reserve line. Everything shown comes from `data`.
 */
export function TournamentPlay({
  data,
  busy = false,
  onSelectTab,
  onBack,
  onMore,
  onRebuy,
  onRecordElimination,
  onRecordSameHand,
  onRejected,
  onAddPlayer,
  onOpenPlayer,
  onOpenBank,
  initialPopup,
}: TournamentPlayProps) {
  const [popup, setPopup] = useState<Popup>(initialPopup ?? null);
  const toast = useToast();
  const operation = useOperation(onRejected);
  const working = busy || operation.pending;
  const close = () => {
    if (!operation.isRunning()) setPopup(null);
  };
  const { stillIn, winner, lateEntry } = data;
  const outPlayer = popup?.kind === 'out' ? stillIn?.players.find((p) => p.playerId === popup.playerId) : undefined;

  return (
    <WorkspaceFrame
      phase="inProgress"
      context={data.frame.context}
      backLabel={data.frame.backLabel}
      tab="play"
      onSelectTab={onSelectTab}
      onBack={onBack}
      onMore={onMore}
    >
      <TermsPanel items={data.terms} />
      <PrizeLadder prizePool={data.prizePool} onOpenPlayer={onOpenPlayer} />
      {stillIn ? (
        <StillInCard
          stillIn={stillIn}
          lateEntryClosedReason={lateEntry.status === 'closed' ? lateEntry.message : null}
          onAddPlayer={onAddPlayer}
          onAddPlayerLocked={() => toast.show(LATE_ENTRY_CLOSED)}
          onRebuy={onRebuy}
          onOut={(playerId) => setPopup({ kind: 'out', playerId })}
          onSameHand={() => setPopup({ kind: 'sameHand', selectedIds: [] })}
          onOpenPlayer={onOpenPlayer}
        />
      ) : null}
      {winner ? (
        <View style={styles.winner}>
          <Text variant="sectionTitle" style={styles.title}>{`${winner.name} wins`}</Text>
          <Button
            label="Results"
            variant="primary"
            trailingIcon="chevronRight"
            accessibilityLabel={`${winner.name} wins. Go to Results`}
            onPress={() => onSelectTab('results')}
          />
        </View>
      ) : null}
      {data.unpaidFinishers.length > 0 ? (
        <View>
          <SectionHeading title="Out" />
          {data.unpaidFinishers.map((finisher, index) => (
            <ListRow
              key={finisher.playerId}
              title={finisher.name}
              subtitle={finisher.contributionText}
              leading={<PlaceBadge label={finisher.placeLabel} />}
              accessibilityLabel={`${finisher.name}, ${finisher.placeLabel} place, ${finisher.payoutText.toLowerCase()}, ${finisher.contributionText}`}
              onPress={() => onOpenPlayer(finisher.playerId)}
              divider={index < data.unpaidFinishers.length - 1}
            />
          ))}
        </View>
      ) : null}
      <Button
        label={data.reserveText}
        trailingIcon="external"
        fullWidth
        accessibilityLabel={`${data.reserveText}. Bank and reserve details`}
        variant="tertiary"
        onPress={onOpenBank}
      />

      <OutDialog
        visible={Boolean(outPlayer)}
        player={outPlayer ?? null}
        sameHandAvailable={stillIn?.sameHandAvailable ?? false}
        busy={working}
        onCancel={close}
        onConfirm={() => {
          if (!outPlayer || busy) return;
          void operation.run(() => onRecordElimination(outPlayer.playerId), () => setPopup(null));
        }}
        onRebuyInstead={() => {
          if (!outPlayer || operation.isRunning()) return;
          setPopup(null);
          onRebuy(outPlayer.playerId);
        }}
        onSameHand={() => {
          if (!outPlayer || operation.isRunning()) return;
          setPopup({ kind: 'sameHand', selectedIds: [outPlayer.playerId] });
        }}
      />
      {stillIn && popup?.kind === 'sameHand' ? (
        <SameHandDialog
          visible
          players={stillIn.players}
          selectedIds={popup.selectedIds}
          nextPlaceLabels={stillIn.nextPlaceLabels}
          busy={working}
          onToggle={(id) =>
            setPopup({
              kind: 'sameHand',
              selectedIds: popup.selectedIds.includes(id)
                ? popup.selectedIds.filter((selected) => selected !== id)
                : popup.selectedIds.length < stillIn.players.length - 1
                  ? [...popup.selectedIds, id]
                  : popup.selectedIds,
            })
          }
          onMoveUp={(id) => setPopup({ kind: 'sameHand', selectedIds: moved(popup.selectedIds, id, -1) })}
          onMoveDown={(id) => setPopup({ kind: 'sameHand', selectedIds: moved(popup.selectedIds, id, 1) })}
          onCancel={close}
          onConfirm={() => {
            if (busy) return;
            const order = popup.selectedIds;
            void operation.run(() => onRecordSameHand(order), () => setPopup(null));
          }}
        />
      ) : null}
    </WorkspaceFrame>
  );
}

/** The toast when the locked Add player is pressed; the full reason is its spoken hint. */
const LATE_ENTRY_CLOSED = 'Late entry closed: someone is out.';

function moved(ids: readonly string[], id: string, by: -1 | 1): readonly string[] {
  const from = ids.indexOf(id);
  const to = from + by;
  if (from < 0 || to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

interface StillInCardProps {
  stillIn: StillInData;
  /** Late entry is closed: why, spoken as the locked Add player's hint. `null` while open. */
  lateEntryClosedReason: string | null;
  onAddPlayer: () => void;
  onAddPlayerLocked: () => void;
  onRebuy: (playerId: string) => void;
  onOut: (playerId: string) => void;
  onSameHand: () => void;
  onOpenPlayer: (playerId: string) => void;
}

/** "Still in · N": who is playing for which places, with + Rebuy and Out beside each player. */
function StillInCard({
  stillIn,
  lateEntryClosedReason,
  onAddPlayer,
  onAddPlayerLocked,
  onRebuy,
  onOut,
  onSameHand,
  onOpenPlayer,
}: StillInCardProps) {
  return (
    <Card gap={space.xs}>
      <View style={styles.heading}>
        <Text variant="sectionTitle" style={styles.title}>{`Still in · ${stillIn.count}`}</Text>
        {lateEntryClosedReason === null ? (
          <Button label="Add player" icon="plus" variant="tertiary" onPress={onAddPlayer} />
        ) : (
          <Button
            label="Add player"
            icon="lock"
            unavailable
            accessibilityHint={lateEntryClosedReason}
            onUnavailablePress={onAddPlayerLocked}
          />
        )}
      </View>
      <Text variant="supporting">{stillIn.summary}</Text>
      <View>
        {stillIn.players.map((player, index) => (
          <ListRow
            key={player.playerId}
            title={player.name}
            subtitle={player.contributionText}
            onPress={() => onOpenPlayer(player.playerId)}
            divider={index < stillIn.players.length - 1}
            actions={
              <>
                <Button
                  label="Rebuy"
                  icon="plus"
                  variant="tonal"
                  size="compact"
                  accessibilityLabel={`Rebuy for ${player.name}`}
                  onPress={() => onRebuy(player.playerId)}
                />
                <Button
                  label="Out"
                  icon="exit"
                  size="compact"
                  accessibilityLabel={`${player.name} is out…`}
                  onPress={() => onOut(player.playerId)}
                />
              </>
            }
          />
        ))}
      </View>
      {stillIn.sameHandAvailable ? (
        <Button label="Several out in the same hand…" variant="tertiary" alignStart onPress={onSameHand} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: space.md,
    rowGap: space.xs,
  },
  title: { flexShrink: 1 },
  winner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: space.md,
    rowGap: space.sm,
  },
});
