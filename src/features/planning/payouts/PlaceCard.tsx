import { type Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PayoutPlaceView } from '@/game-management';
import { useGameManagement } from '@/state';
import {
  Card,
  colors,
  IconButton,
  PlaceBadge,
  ShareBar,
  space,
  Text,
  TextField,
  type TextInputRef,
} from '@/ui';

import { useFieldError } from '../useFieldError';

export interface PlaceCardProps {
  gameId: string;
  place: PayoutPlaceView;
  continueAttempted: boolean;
  inputRef: Ref<TextInputRef>;
  /** Keyboard Next: the following place's field. Omitted on the last place. */
  onNext?: () => void;
}

/** One rung of the prize ladder: place badge and prize, then share bar and percentage field. */
export function PlaceCard({ gameId, place, continueAttempted, inputRef, onNext }: PlaceCardProps) {
  const app = useGameManagement();
  const field = useFieldError(place.share, continueAttempted);
  const none = place.amount.kind === 'none';

  return (
    <Card gap={space.md} padding={space.lg} style={field.error ? styles.invalid : undefined}>
      <View style={styles.top}>
        <View
          style={styles.prize}
          accessible
          accessibilityLabel={`${place.placeLabel} place: ${none ? 'no prize amount yet' : place.amount.text}`}
        >
          <PlaceBadge label={place.placeLabel} highlight={place.place === 1} />
          <Text variant="amount" tone={none ? 'supporting' : 'main'} style={styles.amount}>
            {place.amount.text}
          </Text>
        </View>
        {place.removable ? (
          <IconButton
            icon="trash"
            variant="plain"
            accessibilityLabel={place.removeLabel}
            onPress={() => void app.planning.removePayoutPlace(gameId, place.id)}
          />
        ) : null}
      </View>
      <TextField
        label={place.shareLabel}
        labelHidden
        size="compact"
        inputWidth={96}
        unit="%"
        unitSpoken="percent"
        keyboard="decimal"
        value={place.share.text}
        onChangeText={(text) => {
          field.onEdit();
          void app.planning.setPayoutShareText(gameId, place.id, text);
        }}
        onBlur={field.onBlur}
        error={field.error}
        inputRef={inputRef}
        returnKeyType={onNext ? 'next' : 'done'}
        onSubmitEditing={onNext}
        before={
          <View style={styles.bar}>
            <ShareBar percent={place.barPercent} />
          </View>
        }
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  invalid: { borderColor: colors.errorBorder },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48 },
  prize: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.md },
  amount: { flexShrink: 1 },
  bar: { flex: 1, minWidth: 0 },
});
