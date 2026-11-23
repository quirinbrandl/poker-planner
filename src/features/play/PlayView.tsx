import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { WorkspaceFrame, type WorkspaceTab } from '@/features/game/WorkspaceFrame';
import { spokenContribution } from '@/features/shared/format';
import {
  Badge,
  Button,
  focusView,
  InlineNotice,
  ListRow,
  SectionHeading,
  SignedAmount,
  space,
  TermsPanel,
  Text,
  type ViewRef,
} from '@/ui';

import { RebuyDialog } from './RebuyDialog';
import type { FinishedPlayerRow, PlayData, PlayingPlayerRow, RebuyPopupData } from './types';

export interface PlayViewProps {
  data: PlayData;
  /** One quiet confirmation after an accepted action ("Rebuy issued for Ben" + what was recorded). */
  feedback?: { title: string; message: string } | null;
  /** The rebuy popup's content; `null` while closed. */
  rebuy: RebuyPopupData | null;
  /** An accepted rebuy is being issued. */
  rebuyBusy: boolean;
  /** Ask for a rebuy proposal for this participant (opens the popup). */
  onRebuy: (playerId: string) => void;
  /** Issue the proposal in the popup exactly as shown. */
  onConfirmRebuy: () => void;
  /** Close the popup without recording anything. */
  onCancelRebuy: () => void;
  /** Open the participant's final chip count (Result), or resume its saved draft. */
  onResult: (playerId: string) => void;
  /** Open the player page. */
  onOpenPlayer: (playerId: string) => void;
  /** Open late entry. */
  onAddPlayer: () => void;
  /** Open Bank & reserve. */
  onViewBank: () => void;
  /** "Fixing Alice’s count · Step 2 of 3 →": continue the unfinished fix (shown while `data.fixText` is set). */
  onContinueFix?: () => void;
  onSelectTab: (tab: WorkspaceTab) => void;
  onBack: () => void;
  onMore: () => void;
}

/**
 * Play (In progress cash game): the locked terms, the reserve line, Playing with Rebuy and Count
 * shortcuts, Finished playing with each signed provisional balance, and the rebuy popup.
 */
export function PlayView({
  data,
  feedback,
  rebuy,
  rebuyBusy,
  onRebuy,
  onConfirmRebuy,
  onCancelRebuy,
  onResult,
  onOpenPlayer,
  onAddPlayer,
  onViewBank,
  onContinueFix,
  onSelectTab,
  onBack,
  onMore,
}: PlayViewProps) {
  const rebuyRefs = useRef(new Map<string, ViewRef | null>());
  const popupFor = rebuy?.playerId ?? null;
  const lastPopupFor = useRef<string | null>(null);

  // When the popup closes, focus returns to the Rebuy control of the player it was for.
  useEffect(() => {
    if (popupFor) {
      lastPopupFor.current = popupFor;
      return;
    }
    const playerId = lastPopupFor.current;
    lastPopupFor.current = null;
    if (!playerId) return;
    const timer = setTimeout(() => focusView(rebuyRefs.current.get(playerId) ?? null), 100);
    return () => clearTimeout(timer);
  }, [popupFor]);

  const { terms } = data;
  return (
    <WorkspaceFrame
      phase="inProgress"
      context={data.context}
      tab="play"
      onSelectTab={onSelectTab}
      backLabel={data.backLabel}
      onBack={onBack}
      onMore={onMore}
    >
      <TermsPanel
        items={[
          { label: 'Blinds', value: terms.blindsText, unit: 'chip units' },
          { label: 'Rebuy', value: terms.rebuyText, unit: terms.currency },
          { label: 'Stack', value: terms.stackText, unit: 'chip units' },
        ]}
      />
      <Button
        label={data.reserveText}
        trailingIcon="external"
        fullWidth
        accessibilityLabel={`${data.reserveText}. Bank and reserve`}
        onPress={onViewBank}
      />
      {data.fixText && onContinueFix ? (
        <Button label={data.fixText} trailingIcon="forward" variant="primary" fullWidth onPress={onContinueFix} />
      ) : null}
      {feedback ? (
        <InlineNotice tone="confirmed" title={feedback.title}>
          {feedback.message}
        </InlineNotice>
      ) : null}

      <View>
        <SectionHeading
          title={`Playing · ${data.playing.length}`}
          action={{ label: 'Add player', icon: 'plus', onPress: onAddPlayer }}
        />
        {data.playing.length === 0 ? (
          <View style={styles.allCounted}>
            <InlineNotice tone="confirmed">Everyone is counted</InlineNotice>
            <Button
              label="Results"
              variant="primary"
              trailingIcon="forward"
              fullWidth
              accessibilityLabel="Go to Results"
              onPress={() => onSelectTab('results')}
            />
          </View>
        ) : (
          data.playing.map((player) => (
            <PlayingRow
              key={player.id}
              player={player}
              rebuyRef={(view) => {
                rebuyRefs.current.set(player.id, view);
              }}
              onRebuy={() => onRebuy(player.id)}
              onResult={() => onResult(player.id)}
              onOpen={() => onOpenPlayer(player.id)}
            />
          ))
        )}
      </View>

      {data.finished.length > 0 ? (
        <View>
          <SectionHeading title={`Finished playing · ${data.finished.length}`} />
          {data.finished.map((player) => (
            <FinishedRow key={player.id} player={player} onOpen={() => onOpenPlayer(player.id)} />
          ))}
        </View>
      ) : null}

      <Text variant="supporting" tabular>
        {data.totalContributionsText}
      </Text>

      <RebuyDialog
        rebuy={rebuy}
        busy={rebuyBusy}
        onConfirm={onConfirmRebuy}
        onCancel={onCancelRebuy}
        onViewBank={onViewBank}
      />
    </WorkspaceFrame>
  );
}

function PlayingRow({
  player,
  rebuyRef,
  onRebuy,
  onResult,
  onOpen,
}: {
  player: PlayingPlayerRow;
  rebuyRef: (view: ViewRef | null) => void;
  onRebuy: () => void;
  onResult: () => void;
  onOpen: () => void;
}) {
  const draft = player.hasCountDraft;
  return (
    <ListRow
      title={player.name}
      subtitle={player.contributionText}
      tags={draft ? <Badge label="Count draft" tone="warning" size="small" /> : undefined}
      accessibilityLabel={[player.name, spokenContribution(player.contributionText), draft ? 'Count draft' : null]
        .filter(Boolean)
        .join(', ')}
      onPress={onOpen}
      actions={
        <>
          <Button
            ref={rebuyRef}
            label="Rebuy"
            icon="plus"
            variant="tonal"
            size="compact"
            accessibilityLabel={`Rebuy for ${player.name}`}
            onPress={onRebuy}
          />
          <Button
            label={draft ? 'Resume' : 'Count'}
            icon="count"
            size="compact"
            accessibilityLabel={draft ? `Resume count for ${player.name}` : `Count for ${player.name}`}
            onPress={onResult}
          />
        </>
      }
    />
  );
}

function FinishedRow({ player, onOpen }: { player: FinishedPlayerRow; onOpen: () => void }) {
  const draft = player.hasCorrectionDraft;
  return (
    <ListRow
      title={player.name}
      subtitle={player.contributionText}
      tags={draft ? <Badge label="Correction draft" tone="warning" size="small" /> : undefined}
      trailing={<SignedAmount amount={player.balanceText} direction={player.direction} caption={player.balanceCaption} />}
      accessibilityLabel={[
        player.name,
        spokenContribution(player.contributionText),
        `${player.balanceCaption} ${player.balanceText.replace('−', 'minus ')}`,
        draft ? 'Correction draft' : null,
      ]
        .filter(Boolean)
        .join(', ')}
      onPress={onOpen}
    />
  );
}

const styles = StyleSheet.create({
  allCounted: { gap: space.md, paddingVertical: space.md },
});
