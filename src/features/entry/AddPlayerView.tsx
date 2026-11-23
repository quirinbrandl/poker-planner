import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  colors,
  focusView,
  FooterActions,
  Icon,
  InlineNotice,
  RadioGroup,
  RadioRow,
  Screen,
  ScreenHeader,
  SearchField,
  space,
  Text,
  TopBar,
  touchTarget,
  type ViewRef,
} from '@/ui';

import { EntryDialog } from './EntryDialog';
import type { AddPlayerData, EntryNotice, EntryPopupData } from './types';

export interface AddPlayerViewProps {
  data: AddPlayerData;
  /** The staged choice (a saved player id). Nothing joins until the popup's final action. */
  selectedId: string | null;
  onSelect: (savedPlayerId: string) => void;
  search: string;
  onSearch: (text: string) => void;
  /** One quiet line about the last review ("Nora has not joined.") or a refused selection. */
  notice: EntryNotice | null;
  /** Ask for the entry proposal of the staged choice (opens the popup). */
  onReview: () => void;
  /** The popup's content; `null` while closed. */
  review: EntryPopupData | null;
  /** The accepted entry is being recorded. */
  busy: boolean;
  /** Add the player and issue the stack exactly as shown. */
  onConfirmEntry: () => void;
  /** Close the popup; the selection stays. */
  onCancelReview: () => void;
  /** Open Bank & reserve from a blocked entry. */
  onViewBank: () => void;
  /** Open the explicit new saved player editor (Save and select). */
  onNewPlayer: () => void;
  /** Back to Play without adding anyone. */
  onBack: () => void;
  onMore: () => void;
}

function matches(name: string, search: string): boolean {
  const query = search.trim().toLocaleLowerCase();
  return query === '' || name.toLocaleLowerCase().includes(query);
}

/**
 * Add player (late entry): choose a saved player who is not in the game, or create a new saved name,
 * then Review entry. The choice is staged; the Add <name> popup is the only place that adds them.
 */
export function AddPlayerView({
  data,
  selectedId,
  onSelect,
  search,
  onSearch,
  notice,
  onReview,
  review,
  busy,
  onConfirmEntry,
  onCancelReview,
  onViewBank,
  onNewPlayer,
  onBack,
  onMore,
}: AddPlayerViewProps) {
  const [missing, setMissing] = useState(false);
  const reviewRef = useRef<ViewRef>(null);
  const open = review !== null;
  const wasOpen = useRef(open);
  const selected = data.candidates.find((candidate) => candidate.savedPlayerId === selectedId && !candidate.inGame);
  const shown = data.candidates.filter((candidate) => matches(candidate.name, search));
  // Selectable names first; players already in the game follow as dimmed, non-selectable lines.
  const selectable = shown.filter((candidate) => !candidate.inGame);
  const inGame = shown.filter((candidate) => candidate.inGame);

  // Closing the popup puts focus back on Review entry, with the choice still staged.
  useEffect(() => {
    if (wasOpen.current && !open) {
      const timer = setTimeout(() => focusView(reviewRef.current), 100);
      wasOpen.current = open;
      return () => clearTimeout(timer);
    }
    wasOpen.current = open;
  }, [open]);

  const shownNotice: EntryNotice | null = missing
    ? { tone: 'error', message: 'Choose a saved player, or create a new one, to review their entry.' }
    : notice;

  return (
    <>
      <Screen
        topBar={<TopBar backLabel="Back to Play" onBack={onBack} onMore={onMore} />}
        footer={
          <FooterActions>
            <Button
              ref={reviewRef}
              label="Review entry"
              variant="primary"
              trailingIcon="chevronRight"
              unavailable={!selected}
              onUnavailablePress={() => setMissing(true)}
              onPress={onReview}
            />
          </FooterActions>
        }
      >
        <ScreenHeader title="Add player">
          <Text variant="supporting">
              {'Buy-in '}
              <Text variant="supporting" strong tone="main">
                {data.terms.buyInText}
              </Text>
              {' · Stack '}
              <Text variant="supporting" strong tone="main">
                {data.terms.stackText}
              </Text>
              {' · Blinds '}
              <Text variant="supporting" strong tone="main">
                {data.terms.blindsText.replace(/ \/ /g, '\u00A0/\u00A0')}
              </Text>
          </Text>
        </ScreenHeader>

        <SearchField accessibilityLabel="Search saved names" value={search} onChangeText={onSearch} />
        {shown.length > 0 ? (
          <View style={styles.lists}>
            {selectable.length > 0 ? (
              <RadioGroup label="Saved players" hideLabel>
                {selectable.map((candidate) => (
                  <RadioRow
                    key={candidate.savedPlayerId}
                    label={candidate.name}
                    selected={candidate.savedPlayerId === selectedId}
                    onPress={() => {
                      setMissing(false);
                      onSelect(candidate.savedPlayerId);
                    }}
                  />
                ))}
              </RadioGroup>
            ) : null}
            {inGame.length > 0 ? (
              <View accessibilityRole="list" accessibilityLabel="Already in this game">
                {inGame.map((candidate) => (
                  <View
                    key={candidate.savedPlayerId}
                    accessible
                    accessibilityLabel={`${candidate.name}, already in this game`}
                    style={styles.inGame}
                  >
                    <Icon name="check" size={18} color={colors.textSupporting} />
                    <Text tone="supporting" style={styles.inGameName}>
                      {candidate.name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <Text tone="supporting" align="center" style={styles.empty}>
            {data.candidates.length === 0 ? 'No saved players yet. Create a new one below.' : 'No matching saved players.'}
          </Text>
        )}
        {shownNotice ? <InlineNotice tone={shownNotice.tone}>{shownNotice.message}</InlineNotice> : null}
        <Button label="New player" icon="userPlus" fullWidth onPress={onNewPlayer} />
      </Screen>

      <EntryDialog entry={review} busy={busy} onConfirm={onConfirmEntry} onCancel={onCancelReview} onViewBank={onViewBank} />
    </>
  );
}

const styles = StyleSheet.create({
  lists: { gap: space.lg },
  inGame: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  inGameName: { flexShrink: 1 },
  empty: { paddingVertical: space.xl },
});
