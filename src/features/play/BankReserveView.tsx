import { View } from 'react-native';

import {
  Badge,
  BadgeRow,
  Button,
  Card,
  ChipPill,
  ChipPillRow,
  FactRow,
  FooterActions,
  Screen,
  ScreenHeader,
  space,
  Text,
  TopBar,
} from '@/ui';

import type { BankReserveData } from './types';

export interface BankReserveViewProps {
  data: BankReserveData;
  /** "Back to Play", or "Back to player selection" when opened from late entry. */
  backLabel: string;
  /** Leaves the view; nothing here changes the game. */
  onBack: () => void;
  onMore: () => void;
}

/**
 * Bank & reserve: what the bank holds per denomination and how much of the shared reserve target
 * is left and achievable. Read-only; opened from Play's reserve line or a blocked request.
 */
export function BankReserveView({ data, backLabel, onBack, onMore }: BankReserveViewProps) {
  const { reserve } = data;
  return (
    <Screen
      topBar={<TopBar backLabel={backLabel} onBack={onBack} onMore={onMore} />}
      footer={
        <FooterActions>
          <Button label={backLabel} variant="primary" onPress={onBack} />
        </FooterActions>
      }
    >
      <ScreenHeader
        context={data.context}
        badges={
          <BadgeRow>
            <Badge label="In progress" tone="primary" />
          </BadgeRow>
        }
        title="Bank & reserve"
      />
      <Card gap={space.md}>
        <Text variant="sectionTitle">{data.chipsText}</Text>
        <ChipPillRow accessibilityLabel="Chips in the bank">
          {data.chips.map((chip) => (
            <ChipPill key={chip.value} color={chip.color} value={chip.value} count={chip.count} showValue />
          ))}
        </ChipPillRow>
        <Text variant="supporting">{data.valueNote}</Text>
      </Card>
      <Card gap={space.xs}>
        <Text variant="sectionTitle">Shared reserve</Text>
        <View>
          <FactRow label="Started target" value={reserve.startedTargetText} />
          <FactRow label="Rebuys + late entries" value={reserve.consumedText} />
          <FactRow label="Unconsumed target" value={reserve.unconsumedText} />
          <FactRow label="Simultaneously achievable" value={reserve.achievableText} divider={false} />
        </View>
      </Card>
      <Text variant="supporting">
        Shared bank capacity, not prepacked stacks or a limit on rebuys. Chip returns add available chips; they do not
        reset reserve consumption.
      </Text>
    </Screen>
  );
}
