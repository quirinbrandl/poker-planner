/**
 * Development only: Calculate Payments? and Completed Payments with fixture data (nothing is stored).
 *   /dev/payments?state=ready|even|two|cents|big|tournament        Completed Payments
 *     |calculate|calculate-tournament|calculating|blocked           the stand-in Results with its popup
 *     |menu|reopen|delete                                           game actions over Payments
 *   &from=history   opens Payments with ← History
 * Calculate Payments resolves after a short delay, then shows Payments with “✓ Game finished”.
 */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { GameActionsView } from '@/features/game/actions/GameActionsView';
import { ACTION_GAMES } from '@/features/game/actions/fixtures';
import { GAME_TOASTS } from '@/features/game/actions/texts';
import type { GameAction } from '@/features/game/actions/types';
import { WorkspaceFrame } from '@/features/game/WorkspaceFrame';
import { CalculateBlocked } from '@/features/payments/CalculateBlocked';
import { CalculatePaymentsDialog } from '@/features/payments/CalculatePaymentsDialog';
import {
  CALCULATE_BLOCKED_REASON,
  CALCULATE_FIXTURES,
  PAYMENTS_FIXTURES,
  type PaymentsFixtureName,
} from '@/features/payments/fixtures';
import { PaymentsView } from '@/features/payments/PaymentsView';
import { CALCULATE_LABEL } from '@/features/payments/texts';
import type { PaymentsMode } from '@/features/payments/types';
import { Button, FooterActions, StatusCard, useToast } from '@/ui';

const DELAY_MS = 800;

/** Stand-in for In progress Results: just enough to open Calculate Payments? from. */
function ResultsStandIn({
  mode,
  blocked,
  initialOpen,
  initialBusy,
  onFinished,
}: {
  mode: PaymentsMode;
  blocked: boolean;
  initialOpen: boolean;
  initialBusy: boolean;
  onFinished: () => void;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [busy, setBusy] = useState(initialBusy);
  const [explained, setExplained] = useState(blocked);
  const calculate = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setOpen(false);
      onFinished();
    }, DELAY_MS);
  };
  return (
    <WorkspaceFrame
      phase="inProgress"
      context={mode === 'cash' ? 'Cash game · 23 Nov, 19:30' : 'Tournament · 23 Nov, 19:30'}
      tab="results"
      onSelectTab={() => undefined}
      backLabel="Games"
      onBack={() => undefined}
      onMore={() => undefined}
      footer={
        <FooterActions note={blocked ? CALCULATE_BLOCKED_REASON : undefined}>
          <Button
            label={`${CALCULATE_LABEL}…`}
            icon="calculator"
            variant="primary"
            unavailable={blocked}
            onUnavailablePress={() => setExplained(true)}
            onPress={() => setOpen(true)}
          />
        </FooterActions>
      }
    >
      {explained ? <CalculateBlocked reason={CALCULATE_BLOCKED_REASON} /> : null}
      {blocked ? (
        <StatusCard tone="error" title="1 chip unit missing" description="EUR 0.10 · 1,599 of 1,600 counted. Recount, or correct a result." />
      ) : (
        <StatusCard title="Everything adds up" description={CALCULATE_FIXTURES[mode].readyLine} />
      )}
      <CalculatePaymentsDialog
        visible={open}
        data={CALCULATE_FIXTURES[mode]}
        busy={busy}
        onConfirm={calculate}
        onCancel={() => setOpen(false)}
      />
    </WorkspaceFrame>
  );
}

function Payments({ name, from, initial }: { name: PaymentsFixtureName; from: 'Games' | 'History'; initial: 'menu' | GameAction | null }) {
  const toast = useToast();
  const data = PAYMENTS_FIXTURES[name];
  const [sheet, setSheet] = useState(initial === 'menu');
  const [confirmation, setConfirmation] = useState<GameAction | null>(initial === 'menu' ? null : initial);
  const [busy, setBusy] = useState<GameAction | null>(null);
  const run = (action: GameAction, message: string) => {
    setBusy(action);
    setTimeout(() => {
      setBusy(null);
      setConfirmation(null);
      toast.show(message, { tone: 'confirmed' });
    }, DELAY_MS);
  };
  return (
    <>
      <PaymentsView
        data={data}
        backLabel={from}
        onBack={() => toast.show(`Back to ${from} (fixture)`)}
        onMore={() => setSheet(true)}
        onSelectTab={(tab) => toast.show(`Opens ${tab} (fixture)`)}
        onOpenPlayer={(id) => toast.show(`Opens player ${id} (fixture)`)}
      />
      <GameActionsView
        game={data.mode === 'cash' ? ACTION_GAMES.completed : ACTION_GAMES.tournamentCompleted}
        sheetVisible={sheet}
        onCloseSheet={() => setSheet(false)}
        confirmation={confirmation}
        onChoose={(action) => {
          setSheet(false);
          setConfirmation(action);
        }}
        onCancelConfirmation={() => setConfirmation(null)}
        busy={busy}
        onReopen={() => run('reopen', GAME_TOASTS.reopened)}
        onDelete={() => run('delete', GAME_TOASTS.deleted)}
      />
    </>
  );
}

const CALCULATE_STATES: Record<string, { mode: PaymentsMode; blocked: boolean; open: boolean; busy: boolean }> = {
  calculate: { mode: 'cash', blocked: false, open: true, busy: false },
  'calculate-tournament': { mode: 'tournament', blocked: false, open: true, busy: false },
  calculating: { mode: 'cash', blocked: false, open: true, busy: true },
  blocked: { mode: 'cash', blocked: true, open: false, busy: false },
};

const ACTION_STATES: Record<string, 'menu' | GameAction> = { menu: 'menu', reopen: 'reopen', delete: 'delete' };

function Fixture({ state, from }: { state: string; from: 'Games' | 'History' }) {
  const toast = useToast();
  const calculate = CALCULATE_STATES[state];
  const [finished, setFinished] = useState(false);
  if (calculate && !finished) {
    return (
      <ResultsStandIn
        mode={calculate.mode}
        blocked={calculate.blocked}
        initialOpen={calculate.open}
        initialBusy={calculate.busy}
        onFinished={() => {
          setFinished(true);
          toast.show(GAME_TOASTS.finished, { tone: 'confirmed' });
        }}
      />
    );
  }
  if (calculate) return <Payments name={calculate.mode === 'cash' ? 'ready' : 'tournament'} from={from} initial={null} />;
  const name: PaymentsFixtureName = state in PAYMENTS_FIXTURES ? (state as PaymentsFixtureName) : 'ready';
  return <Payments name={name} from={from} initial={ACTION_STATES[state] ?? null} />;
}

export default function PaymentsDevRoute() {
  const { state = 'ready', from } = useLocalSearchParams<{ state?: string; from?: string }>();
  return <Fixture key={state} state={state} from={from === 'history' ? 'History' : 'Games'} />;
}
