import { useRef, useState } from 'react';
import { View } from 'react-native';

import { WorkspaceFrame, type WorkspaceTab } from '@/features/game/WorkspaceFrame';
import { spokenContribution } from '@/features/shared/format';
import {
  Badge,
  Button,
  focusView,
  InlineNotice,
  ListRow,
  type ScrollViewRef,
  SignedAmount,
  space,
  StatusCard,
  Text,
  type ViewRef,
} from '@/ui';

import type { ResultsData, ResultsPlayerRow, ResultsStatus } from './types';

export interface ResultsViewProps {
  data: ResultsData;
  onSelectTab: (tab: WorkspaceTab) => void;
  onBack: () => void;
  onMore: () => void;
  /** Open the player page (every row). */
  onOpenPlayer: (playerId: string) => void;
  /** Count / Resume: open the final chip count editor. In progress only. */
  onCount: (playerId: string) => void;
  /** Calculate Payments… when everything adds up: open the Calculate Payments? popup. */
  onCalculatePayments: () => void;
}

/** Why Calculate Payments is unavailable, by status; `null` when everything adds up. */
function calculateBlocker(status: ResultsStatus): string | null {
  switch (status.kind) {
    case 'toCount':
      return 'Count everyone first.';
    case 'missing':
      return 'Find the missing chips first.';
    case 'tooMany':
      return 'Fix the extra chips first.';
    case 'addsUp':
      return null;
  }
}

const CAPTION = { gain: 'Won', loss: 'Lost', even: 'Break-even' } as const;

/**
 * Cash-game Results tab: the accounting status card, one row per player and Calculate Payments.
 * Completed shows the same rows read-only with allocated cents.
 */
export function ResultsView({ data, onSelectTab, onBack, onMore, onOpenPlayer, onCount, onCalculatePayments }: ResultsViewProps) {
  const statusRef = useRef<ViewRef>(null);
  const scrollRef = useRef<ScrollViewRef>(null);
  const [explained, setExplained] = useState(false);
  const completed = data.phase === 'completed';
  const blocker = calculateBlocker(data.status);

  const explain = () => {
    setExplained(true);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setTimeout(() => focusView(statusRef.current), 50);
  };

  return (
    <WorkspaceFrame
      phase={data.phase}
      context={data.context}
      tab="results"
      onSelectTab={onSelectTab}
      backLabel={data.backLabel}
      onBack={onBack}
      onMore={onMore}
      reopened={data.reopened}
      scrollRef={scrollRef}
    >
      {explained && blocker && !completed ? (
        <InlineNotice tone="error" title="Can’t calculate Payments yet.">
          {blocker}
        </InlineNotice>
      ) : null}
      <StatusView status={data.status} statusRef={statusRef} />

      <View>
        {data.players.map((player) => (
          <PlayerRow key={player.id} player={player} completed={completed} onOpen={onOpenPlayer} onCount={onCount} />
        ))}
      </View>

      {completed ? null : (
        <View style={{ gap: space.sm }}>
          <Button
            label="Calculate Payments…"
            variant={blocker ? 'secondary' : 'primary'}
            fullWidth
            unavailable={blocker !== null}
            accessibilityHint={blocker ?? undefined}
            onUnavailablePress={explain}
            onPress={onCalculatePayments}
          />
          {blocker ? (
            <Text variant="supporting" tone="supporting" align="center">
              {blocker}
            </Text>
          ) : null}
        </View>
      )}
    </WorkspaceFrame>
  );
}

function StatusView({ status, statusRef }: { status: ResultsStatus; statusRef: React.Ref<ViewRef> }) {
  switch (status.kind) {
    case 'toCount':
      return (
        <StatusCard
          ref={statusRef}
          tone="primary"
          ringText={`${status.counted}/${status.total}`}
          title={status.title}
          description={status.namesText}
          progress={{
            value: status.counted,
            max: status.total,
            accessibilityLabel: `${status.counted} of ${status.total} players counted`,
          }}
        />
      );
    case 'missing':
    case 'tooMany':
      return <StatusCard ref={statusRef} tone="error" title={status.title} description={status.description} />;
    case 'addsUp':
      return <StatusCard ref={statusRef} tone="confirmed" title="Everything adds up" description={status.description} />;
  }
}

function PlayerRow({
  player,
  completed,
  onOpen,
  onCount,
}: {
  player: ResultsPlayerRow;
  completed: boolean;
  onOpen: (id: string) => void;
  onCount: (id: string) => void;
}) {
  const tag =
    player.state === 'countDraft' ? (
      <Badge label="Count draft" tone="warning" size="small" />
    ) : player.correctionDraft && !completed ? (
      <Badge label="Correction draft" tone="warning" size="small" />
    ) : null;
  const action =
    completed || player.state === 'result' ? null : (
      <Button
        label={player.state === 'countDraft' ? 'Resume' : 'Count'}
        icon="count"
        size="compact"
        accessibilityLabel={`${player.state === 'countDraft' ? 'Resume count' : 'Count'} for ${player.name}`}
        onPress={() => onCount(player.id)}
      />
    );
  return (
    <ListRow
      title={player.name}
      subtitle={player.contributionText}
      accessibilityLabel={[
        player.name,
        spokenContribution(player.contributionText),
        player.result
          ? `${CAPTION[player.result.direction]} ${player.result.amountText.replace('−', 'minus ')}`
          : player.state === 'uncounted'
            ? 'Not counted yet'
            : 'Count draft',
        player.state === 'result' && player.correctionDraft && !completed ? 'Correction draft' : null,
      ]
        .filter(Boolean)
        .join(', ')}
      tags={tag}
      trailing={
        player.result ? (
          <SignedAmount amount={player.result.amountText} direction={player.result.direction} caption={CAPTION[player.result.direction]} />
        ) : undefined
      }
      actions={action}
      onPress={() => onOpen(player.id)}
    />
  );
}
