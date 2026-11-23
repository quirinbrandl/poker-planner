import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CHIP_COLORS } from '@/domain/types';
import {
  Card,
  ChipCase,
  ChipColorButton,
  ChipPill,
  ChipPillRow,
  chipColorChoices,
  chipColorName,
  ChipSymbol,
  ChipTowers,
  Screen,
  ScreenHeader,
  SectionHeading,
  space,
  Stack,
  StackShowcase,
  Text,
  TopBar,
} from '@/ui';

const weeknight = [
  { key: 'a', color: 'grey', quantity: 200 },
  { key: 'b', color: 'red', quantity: 150 },
  { key: 'c', color: 'blue', quantity: 100 },
  { key: 'd', color: 'green', quantity: 50 },
] as const;

export default function ChipsGallery() {
  return (
    <Screen topBar={<TopBar backLabel="Gallery" onBack={() => router.back()} />}>
      <ScreenHeader title="Chips" context="Functional chip graphics" />

      <SectionHeading title="Chip symbol" meta="11 colours + No color" />
      <View style={styles.grid}>
        {chipColorChoices.map((color, i) => (
          <View key={color ?? 'none'} style={styles.cell}>
            <ChipSymbol color={color} value={[1, 5, 25, 100, 500, 1000, 5, 10, 2500, 50, 10000, 2][i]} size={48} />
            <Text variant="caption" align="center">
              {chipColorName(color)}
            </Text>
          </View>
        ))}
      </View>
      <Stack direction="row" gap="md" align="flex-end">
        <ChipSymbol color="red" size={20} />
        <ChipSymbol color="red" value={5} size={28} />
        <ChipSymbol color="red" value={5} size={48} />
        <ChipSymbol color="red" value={5} size={60} />
        <ChipSymbol color="red" value={5} size={96} accessibilityLabel="5 chip units, Red" />
        <ChipSymbol color={null} size={60} />
      </Stack>

      <SectionHeading title="Chip pills" />
      <ChipPillRow accessibilityLabel="Unissued bank">
        <ChipPill color="grey" value={1} count={110} showValue />
        <ChipPill color="red" value={5} count={138} showValue />
        <ChipPill color="blue" value={25} count={82} showValue />
        <ChipPill color="green" value={100} count={44} showValue />
      </ChipPillRow>
      <ChipPillRow>
        <ChipPill color="white" value={1} count={15} size="compact" />
        <ChipPill color={null} value={5} count={0} size="compact" />
        <ChipPill color="white" value={1} count={5} size="compact" delta="−5" />
      </ChipPillRow>

      <SectionHeading title="Chip colour control" />
      <Card>
        <ChipColorButton
          color="grey"
          value={1}
          onPress={() => undefined}
          accessibilityLabel="Change chip color for denomination 1, value 1 chip units. Current color Grey."
        />
      </Card>

      <SectionHeading title="Chip case" meta="Fits width, no numbers" />
      <ChipCase denominations={weeknight} />
      <Text variant="caption">40 White · 240 White · 1,000 Black (fits 320 px) · empty</Text>
      <Stack direction="row" gap="md" align="flex-start">
        <View style={styles.smallCase}>
          <ChipCase denominations={[{ key: 'w', color: 'white', quantity: 40 }]} />
        </View>
        <View style={styles.smallCase}>
          <ChipCase denominations={[{ key: 'w', color: 'white', quantity: 240 }]} />
        </View>
      </Stack>
      <ChipCase
        denominations={[
          { key: 'w', color: 'white', quantity: 300 },
          { key: 'k', color: 'black', quantity: 1000 },
          { key: 'n', color: null, quantity: 60 },
          { key: 'z', color: 'red', quantity: 0 },
          { key: 'x', color: 'blue', quantity: null },
        ]}
      />
      <ChipCase denominations={[]} />
      <Text variant="caption">Schematic: 3,350 Yellow + 40 per colour</Text>
      <ChipCase
        denominations={[
          { key: 'y', color: 'yellow', quantity: 3350 },
          ...CHIP_COLORS.map((color) => ({ key: color, color, quantity: 40 })),
        ]}
      />

      <SectionHeading title="Chip towers" />
      <StackShowcase label="1 starting stack" value="200" unit="chip units">
        <ChipTowers
          columns={[
            { value: 100, color: 'green', count: 1 },
            { value: 1, color: 'grey', count: 15 },
            { value: 5, color: 'red', count: 2 },
            { value: 25, color: 'blue', count: 3 },
            { value: 500, color: 'purple', count: 0 },
          ]}
        />
      </StackShowcase>
      <StackShowcase label="Stack to hand out" value="1,000" unit="chip units" size="compact">
        <ChipTowers
          size="compact"
          columns={[
            { value: 1, color: 'white', count: 45 },
            { value: 5, color: 'red', count: 11 },
            { value: 25, color: 'blue', count: 6 },
            { value: 100, color: 'black', count: 4 },
            { value: 1000, color: null, count: 0 },
          ]}
        />
      </StackShowcase>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: { width: 68, alignItems: 'center', gap: space.xs },
  smallCase: { flexGrow: 1, flexBasis: 120 },
});
