/**
 * Development only: the tournament screens with fixture data (six players, EUR 20 buy-in, Top 2 at
 * 70 / 30, Bob with one rebuy). Nothing touches game management; a fixture model stands in for it.
 *   /dev/tournament?state=
 *     Play:     open | midway | bubble | heads | winner
 *     popups:   out-first | out-winner | same-hand
 *     Results:  resultsMid | withdrawn | winnerResults | completedResults | reopened | calc-blocked
 *     Editor:   edit | undoAll | missed | save-order | undo-all-save | discard
 *     Player:   backin | back-in | winner-player | forgotten
 * Play and the editor are live: Out, same hand, ↑ / ↓, undo, missed and Save change the fixture.
 * Add `&reject=1` to see operations rejected.
 */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { OrderEditor, type OrderEditorPopup } from '@/features/tournament/OrderEditor';
import {
  backInData,
  draftIntents,
  editorData,
  type FixtureDraft,
  fixtureGame,
  type FixtureGame,
  forgottenRebuyData,
  ORDERS,
  playData,
  playerResult,
  prizePoolAfterOneMore,
  resultsData,
  startDraft,
  withEliminations,
} from '@/features/tournament/fixtures';
import { BackInButton, BackInDialog, StaysOutLine, TournamentResultCard } from '@/features/tournament/PlayerSections';
import { forgottenRebuyTournamentRows, prizePoolChangeRow } from '@/features/tournament/rows';
import { TournamentPlay, type TournamentPlayPopup } from '@/features/tournament/TournamentPlay';
import { TournamentResults } from '@/features/tournament/TournamentResults';
import type { TournamentActionResult } from '@/features/tournament/types';
import {
  Badge,
  BadgeRow,
  Button,
  ChipPill,
  ChipPillRow,
  Dialog,
  FactRow,
  Screen,
  ScreenHeader,
  SectionHeading,
  space,
  Text,
  TopBar,
  useToast,
} from '@/ui';

type Toast = ReturnType<typeof useToast>;

const later = (result: TournamentActionResult) =>
  new Promise<TournamentActionResult>((resolve) => setTimeout(() => resolve(result), 600));

function nav(toast: Toast) {
  return {
    onSelectTab: (tab: string) => toast.show(`Opens ${tab} (fixture)`),
    onBack: () => toast.show('Back to Games (fixture)'),
    onMore: () => toast.show('Game actions (fixture)'),
    onOpenPlayer: (id: string) => toast.show(`Opens ${id}’s page (fixture)`),
  };
}

function PlayFixture({ order, popup, reject }: { order: readonly string[]; popup?: TournamentPlayPopup; reject: boolean }) {
  const toast = useToast();
  const [game, setGame] = useState<FixtureGame>(() => fixtureGame(order));
  const record = async (ids: readonly string[]) => {
    if (reject) return later({ status: 'rejected', message: 'The order changed. Check it and try again.' });
    const result = await later({ status: 'accepted' });
    setGame((g) => withEliminations(g, ids));
    return result;
  };
  return (
    <TournamentPlay
      data={playData(game)}
      initialPopup={popup}
      {...nav(toast)}
      onRebuy={(id) => toast.show(`Opens the rebuy popup for ${id} (fixture)`)}
      onRecordElimination={(id) => record([id])}
      onRecordSameHand={record}
      onRejected={(message) => toast.show(message, { tone: 'error' })}
      onAddPlayer={() => toast.show('Opens late entry (fixture)')}
      onOpenBank={() => toast.show('Opens the bank (fixture)')}
    />
  );
}

function ResultsFixture({ game, blocked }: { game: FixtureGame; blocked?: boolean }) {
  const toast = useToast();
  return (
    <TournamentResults
      data={resultsData(game)}
      initialBlockedOpen={blocked}
      {...nav(toast)}
      onEditOrder={() => toast.show('Opens the finishing order (fixture)')}
      onCalculatePayments={() => toast.show('Opens Calculate Payments (fixture)')}
    />
  );
}

function EditorFixture({
  order,
  draft: initialDraft,
  popup,
  reject,
}: {
  order: readonly string[];
  draft?: FixtureDraft;
  popup?: OrderEditorPopup;
  reject: boolean;
}) {
  const toast = useToast();
  const [game, setGame] = useState<FixtureGame>(() => fixtureGame(order));
  const [draft, setDraft] = useState<FixtureDraft>(() => initialDraft ?? startDraft(game));
  return (
    <OrderEditor
      data={editorData(game, draft)}
      initialPopup={popup}
      onMoveUp={(id) => setDraft((d) => draftIntents.moveUp(d, id))}
      onMoveDown={(id) => setDraft((d) => draftIntents.moveDown(d, id))}
      onUndoElimination={(id) => setDraft((d) => draftIntents.undo(d, id))}
      onAddMissed={({ playerId, slotId }) => setDraft((d) => draftIntents.addMissed(d, playerId, slotId))}
      onSave={async () => {
        if (reject) return later({ status: 'rejected', message: 'The order changed meanwhile. Nothing was saved.' });
        const result = await later({ status: 'accepted' });
        const saved = { ...game, order: draft.order };
        setGame(saved);
        setDraft(startDraft(saved));
        toast.show('Order saved', { tone: 'confirmed' });
        return result;
      }}
      onDiscard={() => {
        setDraft(startDraft(game));
        toast.show('Back to Results (fixture)');
      }}
      onRejected={(message) => toast.show(message, { tone: 'error' })}
      onMore={() => toast.show('Game actions (fixture)')}
    />
  );
}

function PlayerFixture({ order, id, backInOpen }: { order: readonly string[]; id: string; backInOpen?: boolean }) {
  const toast = useToast();
  const game = fixtureGame(order);
  const result = playerResult(game, id);
  const [open, setOpen] = useState(Boolean(backInOpen));
  const [busy, setBusy] = useState(false);
  const name = game.players.find((p) => p.id === id)?.name ?? id;
  return (
    <Screen topBar={<TopBar backLabel="Play" onBack={() => toast.show('Back to Play (fixture)')} onMore={() => undefined} />}>
      <ScreenHeader
        context="Tournament · 23 Nov, 19:30"
        badges={
          <BadgeRow>
            <Badge label="In progress" tone="primary" />
          </BadgeRow>
        }
        title={name}
      />
      {result ? <TournamentResultCard result={result} /> : <Text variant="supporting">Still playing.</Text>}
      {result && result.placeLabel !== '1st' ? <BackInButton name={name} onPress={() => setOpen(true)} /> : null}
      <BackInDialog
        visible={open}
        data={backInData(game, id)}
        busy={busy}
        onCancel={() => !busy && setOpen(false)}
        onConfirm={() => {
          setBusy(true);
          setTimeout(() => {
            setBusy(false);
            setOpen(false);
            toast.show(`${name} is back in the game`, { tone: 'confirmed' });
          }, 600);
        }}
      />
    </Screen>
  );
}

/** The extra rows the shared popups take, inside stand-ins of those popups. */
function SharedRowsFixture() {
  const game = fixtureGame(ORDERS.midway);
  const forgotten = forgottenRebuyData(game, 'felix');
  const [open, setOpen] = useState<'forgotten' | 'rebuy' | null>('forgotten');
  return (
    <Screen topBar={<TopBar backLabel="Back" onBack={() => undefined} />}>
      <ScreenHeader context="Tournament · 23 Nov, 19:30" title="Felix · Forgotten rebuy" />
      <Text>Enter the chips Felix actually got. They must add up to 200.</Text>
      <StaysOutLine name={forgotten.name} placeLabel={forgotten.placeLabel} />
      <SectionHeading title="Shared popups with the tournament rows" />
      <View style={{ gap: space.sm }}>
        <Button label="Forgotten rebuy confirmation" fullWidth onPress={() => setOpen('forgotten')} />
        <Button label="Rebuy popup row" fullWidth onPress={() => setOpen('rebuy')} />
      </View>
      <Dialog
        visible={open === 'forgotten'}
        title="Add Felix’s forgotten rebuy?"
        confirmLabel="Add rebuy"
        onConfirm={() => setOpen(null)}
        onCancel={() => setOpen(null)}
      >
        <ChipPillRow>
          <ChipPill color="grey" value={1} count={15} size="compact" />
          <ChipPill color="red" value={5} count={2} size="compact" />
          <ChipPill color="blue" value={25} count={3} size="compact" />
          <ChipPill color="green" value={100} count={1} size="compact" />
        </ChipPillRow>
        <View>
          <FactRow label="Felix’s buy-ins" value="EUR 20.00 → EUR 40.00" />
          {forgottenRebuyTournamentRows(forgotten).map((row, index, rows) => (
            <FactRow key={row.label} {...row} divider={index < rows.length - 1} />
          ))}
        </View>
      </Dialog>
      <Dialog
        visible={open === 'rebuy'}
        title="Rebuy for Bob"
        confirmLabel="Issue rebuy · 20.00"
        onConfirm={() => setOpen(null)}
        onCancel={() => setOpen(null)}
      >
        <View>
          <FactRow label="Reserve after rebuy" value="1 stack" />
          <FactRow label="Additional contribution" value="EUR 20.00" />
          <FactRow label="New total contribution" value="EUR 60.00" />
          <FactRow {...prizePoolChangeRow(prizePoolAfterOneMore(game))} divider={false} />
        </View>
      </Dialog>
    </Screen>
  );
}

function Fixture({ state, reject }: { state: string; reject: boolean }) {
  switch (state) {
    case 'open':
    case 'midway':
    case 'bubble':
    case 'heads':
    case 'winner':
      return <PlayFixture order={ORDERS[state]} reject={reject} />;
    case 'out-first':
      return <PlayFixture order={ORDERS.open} popup={{ kind: 'out', playerId: 'clara' }} reject={reject} />;
    case 'out-winner':
      return <PlayFixture order={ORDERS.heads} popup={{ kind: 'out', playerId: 'clara' }} reject={reject} />;
    case 'same-hand':
      return <PlayFixture order={ORDERS.midway} popup={{ kind: 'sameHand', selectedIds: ['bob', 'clara'] }} reject={reject} />;
    case 'resultsMid':
      return <ResultsFixture game={fixtureGame(ORDERS.midway)} />;
    case 'calc-blocked':
      return <ResultsFixture game={fixtureGame(ORDERS.midway)} blocked />;
    case 'withdrawn':
      return <ResultsFixture game={fixtureGame(ORDERS.heads)} />;
    case 'winnerResults':
      return <ResultsFixture game={fixtureGame(ORDERS.winner)} />;
    case 'completedResults':
      return <ResultsFixture game={fixtureGame(ORDERS.winner, { phase: 'completed' })} />;
    case 'reopened':
      return <ResultsFixture game={fixtureGame(ORDERS.winner, { reopened: true })} />;
    case 'edit':
    case 'missed':
    case 'save-order':
    case 'discard':
      return (
        <EditorFixture
          order={ORDERS.midway}
          draft={{ order: ['felix', 'emma', 'david'], added: ['emma'] }}
          popup={state === 'missed' ? 'missed' : state === 'save-order' ? 'save' : state === 'discard' ? 'discard' : undefined}
          reject={reject}
        />
      );
    case 'undoAll':
    case 'undo-all-save':
      return (
        <EditorFixture
          order={ORDERS.midway}
          draft={{ order: [], added: [] }}
          popup={state === 'undo-all-save' ? 'save' : undefined}
          reject={reject}
        />
      );
    case 'editSaved':
      return <EditorFixture order={ORDERS.midway} reject={reject} />;
    case 'backin':
      return <PlayerFixture order={ORDERS.bubble} id="david" />;
    case 'back-in':
      return <PlayerFixture order={ORDERS.winner} id="clara" backInOpen />;
    case 'winner-player':
      return <PlayerFixture order={ORDERS.winner} id="alice" />;
    case 'forgotten':
      return <SharedRowsFixture />;
    default:
      return <PlayFixture order={ORDERS.midway} reject={reject} />;
  }
}

export default function TournamentDevRoute() {
  const { state = 'midway', reject } = useLocalSearchParams<{ state?: string; reject?: string }>();
  return <Fixture key={state} state={state} reject={reject === '1'} />;
}
