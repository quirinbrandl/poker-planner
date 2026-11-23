import { StyleSheet, View } from 'react-native';

import { Badge, BadgeRow, Card, colors, Icon, space, StepProgress, Text } from '@/ui';

import type { GameCardData } from './types';

export interface GameCardViewProps {
  game: GameCardData;
  onPress: () => void;
}

/**
 * One game on Games: the mode badge (the section names the phase), a Reopened tag, participant
 * names, creation date, and for a Planning game how far its setup is. The whole card is the button,
 * marked by a chevron; where it leads is in the spoken name. In progress games get the prominent
 * highlighted card, Planning games the quiet one.
 */
export function GameCardView({ game, onPress }: GameCardViewProps) {
  const prominent = game.phase === 'inProgress';
  const progressText = game.progress ? `Step ${game.progress.current} of ${game.progress.count}. ` : '';
  return (
    <Card
      variant={prominent ? 'highlight' : 'raised'}
      onPress={onPress}
      accessibilityLabel={`${game.identityLabel}. ${game.namesText}. ${game.dateText.replace(' · ', ', ')}. ${progressText}${game.entryText}`}
    >
      <View style={styles.row}>
        <View style={styles.body}>
          <BadgeRow>
            <Badge label={game.modeText} tone={prominent ? 'primary' : 'neutral'} size="small" />
            {game.reopened ? <Badge label="Reopened" tone="warning" icon="reopen" size="small" /> : null}
          </BadgeRow>
          <Text variant="title">{game.namesText}</Text>
          <Text variant="supporting">{game.dateText}</Text>
          {game.progress ? (
            <View style={styles.progress} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <StepProgress
                count={game.progress.count}
                current={game.progress.current}
                size="small"
                accessibilityLabel={`Step ${game.progress.current} of ${game.progress.count}`}
              />
            </View>
          ) : null}
        </View>
        <Icon name="chevronRight" color={colors.textSupporting} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  body: { flex: 1, minWidth: 0, gap: space.xs + 2 },
  progress: { marginTop: space.xs },
});
