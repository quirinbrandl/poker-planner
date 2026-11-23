import { type ReactNode, useRef, useState } from 'react';

import { Button } from '@/ui';

import { NoDistributionCard, SetupIncompleteCard } from './BlockedPreview';
import { PlannedPreview } from './PlannedPreview';
import { StartDialog } from './StartDialog';
import type { PreviewData, StartAcceptance, StartResult, StepId } from './types';

/** What the preview hands to the wizard frame around it (see `PlanningStepFrame`). */
export interface PreviewFrameProps {
  primaryAction: ReactNode;
  footerNote?: string;
  footerNoteTone?: 'supporting' | 'warning' | 'error';
  children: ReactNode;
}

export interface PreviewStepProps {
  data: PreviewData;
  /** Open a setup step as a correction that returns to the preview. */
  onOpenStep: (step: StepId) => void;
  /** Start with what the host saw. Resolves with the game-management result. */
  onStart: (acceptance: StartAcceptance) => Promise<StartResult>;
  /** Start was accepted: leave for Play. */
  onStarted: () => void;
  /** Start was rejected: the popup has closed; show the reason. */
  onStartRejected: (message: string) => void;
  /** Wraps the content in the wizard shell. */
  renderFrame: (frame: PreviewFrameProps) => ReactNode;
  /** Development fixtures: open the Start popup right away. */
  initialStartOpen?: boolean;
}

const BLOCKED_NOTE = {
  setupIncomplete: 'Fix setup inputs before starting.',
  noDistribution: 'No valid distribution for current setup.',
} as const;

/**
 * Distribution preview (wizard step), presentational: the recommendation for one starting stack,
 * or why there is none, plus the Start confirmation popup. Everything shown comes from `data`.
 */
export function PreviewStep({
  data,
  onOpenStep,
  onStart,
  onStarted,
  onStartRejected,
  renderFrame,
  initialStartOpen = false,
}: PreviewStepProps) {
  const { mode, preview, payouts, playerCount } = data;
  const distribution = preview.distribution;
  const plan = distribution.kind === 'planned' ? distribution.plan : null;
  const canStart = preview.canStart && plan !== null;
  const [startOpen, setStartOpen] = useState(initialStartOpen && canStart);
  const [starting, setStarting] = useState(false);
  const busy = useRef(false);

  const confirmStart = async () => {
    if (busy.current || !plan) return;
    busy.current = true;
    setStarting(true);
    try {
      const result = await onStart({ depthBb: plan.depth.bb, reserveStacks: plan.reserve.stacks });
      if (result.status === 'accepted') {
        onStarted();
      } else {
        setStartOpen(false);
        onStartRejected(result.reason.message);
      }
    } finally {
      busy.current = false;
      setStarting(false);
    }
  };

  const startLabel = mode === 'tournament' ? 'Start tournament' : 'Start cash game';
  const primaryAction = (
    <Button
      label={canStart ? startLabel : 'Start game'}
      icon="play"
      variant="primary"
      unavailable={!canStart}
      onPress={() => setStartOpen(true)}
    />
  );

  let content: ReactNode;
  let footerNote: string | undefined;
  switch (distribution.kind) {
    case 'planned':
      // Approved: nothing above Back / Start when the game can start.
      footerNote = '';
      content = <PlannedPreview plan={distribution.plan} payouts={payouts} onEditPayouts={() => onOpenStep('payouts')} />;
      break;
    case 'setupIncomplete':
      footerNote = BLOCKED_NOTE.setupIncomplete;
      content = <SetupIncompleteCard blockers={preview.blockers} playerCount={playerCount} onOpenStep={onOpenStep} />;
      break;
    case 'noValidDistribution':
      footerNote = BLOCKED_NOTE.noDistribution;
      content = (
        <NoDistributionCard
          title={distribution.title}
          message={distribution.message}
          playerCount={playerCount}
          steps={['chipSet', 'settings', 'players']}
          onOpenStep={onOpenStep}
        />
      );
      break;
    case 'tooComplex':
      footerNote = BLOCKED_NOTE.noDistribution;
      content = (
        <NoDistributionCard
          title="Chip set too complex"
          message={distribution.message}
          playerCount={playerCount}
          steps={['chipSet']}
          onOpenStep={onOpenStep}
        />
      );
      break;
  }

  return (
    <>
      {renderFrame({ primaryAction, footerNote, footerNoteTone: 'supporting', children: content })}
      {plan ? (
        <StartDialog
          visible={startOpen}
          plan={plan}
          payouts={payouts}
          starting={starting}
          onConfirm={() => void confirmStart()}
          onCancel={() => {
            if (!busy.current) setStartOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
