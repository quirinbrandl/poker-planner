import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Badge,
  BadgeRow,
  BottomSheet,
  Button,
  Card,
  ChipColorButton,
  ChipPill,
  ChipPillRow,
  ChipTowers,
  ChangePill,
  Columns,
  Dialog,
  Divider,
  FactRow,
  FooterActions,
  Icon,
  IconButton,
  ListRow,
  MetricStrip,
  MetricTile,
  RadioGroup,
  RadioRow,
  Screen,
  ScreenHeader,
  SectionHeading,
  SegmentedTabs,
  SignedAmount,
  space,
  Stack,
  StackShowcase,
  StepLink,
  TermsPanel,
  Text,
  TextField,
  TopBar,
  TransferCard,
  useToast,
} from '@/ui';

const stack = [
  { value: 1, color: 'grey', count: 15 },
  { value: 5, color: 'red', count: 2 },
  { value: 25, color: 'blue', count: 3 },
  { value: 100, color: 'green', count: 1 },
] as const;

function Label({ children }: { children: string }) {
  return (
    <Text variant="overline" tone="primary">
      {children}
    </Text>
  );
}

export default function CompositionsGallery() {
  const toast = useToast();
  const [buyIn, setBuyIn] = useState('20');
  const [depth, setDepth] = useState('100');
  const [coverage, setCoverage] = useState('4');
  const [reserve, setReserve] = useState('5');
  const [preference, setPreference] = useState<'fewer' | 'more'>('fewer');
  const [value, setValue] = useState('5');
  const [quantity, setQuantity] = useState('150');
  const [rebuyOpen, setRebuyOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState<'play' | 'results' | 'details'>('play');

  return (
    <Screen
      topBar={<TopBar backLabel="Gallery" onBack={() => router.back()} onMore={() => setSheetOpen(true)} />}
      gap={space.lg}
    >
      <ScreenHeader title="Compositions" context="Approved blocks rebuilt from primitives only" />

      <Label>Games card</Label>
      <SectionHeading title="In progress" />
      <Card
        variant="highlight"
        gap={space.xs + 2}
        onPress={() => undefined}
        accessibilityLabel="In progress cash game, Alice, Bob, Clara, David, Emma, Felix, 23 Nov 2026 19:30. Reopened, calculate Payments again"
      >
        <Badge label="In progress · Cash game" tone="primary" />
        <Text variant="title">Alice, Bob, Clara, David, Emma, Felix</Text>
        <Text variant="supporting">23 Nov 2026 · 19:30</Text>
        <Text variant="supporting" tone="main">
          Reopened · calculate Payments again →
        </Text>
      </Card>
      <SectionHeading title="Planning" meta="1 draft" />
      <Card
        gap={space.xs + 2}
        onPress={() => undefined}
        accessibilityLabel="Planning cash game, Maya, Jonas, Lena, Sam, Alex, Noor. Resume game settings"
      >
        <Badge label="Planning · Cash game" />
        <Text variant="title">Maya, Jonas, Lena, Sam, Alex, Noor</Text>
        <Text variant="supporting">25 Nov 2026 · 19:30</Text>
        <Text variant="supporting" tone="main">
          Resume game settings →
        </Text>
      </Card>
      <Divider />
      <View>
        <ListRow
          title="History"
          leading={<Icon name="clock" />}
          trailing={<Text variant="supporting">3 games</Text>}
          divider={false}
          density="compact"
          onPress={() => undefined}
        />
        <ListRow
          title="Saved players"
          leading={<Icon name="players" />}
          divider={false}
          density="compact"
          onPress={() => undefined}
        />
        <ListRow
          title="Chip set templates"
          leading={<Icon name="templates" />}
          divider={false}
          density="compact"
          onPress={() => undefined}
        />
      </View>

      <Label>Game settings</Label>
      <ScreenHeader
        badges={
          <BadgeRow>
            <Badge label="Cash game" />
            <Badge label="Planning" tone="primary" />
            <Badge label="6 players" />
          </BadgeRow>
        }
        context="23 Nov 2026 · 19:30"
        title="Game settings"
      >
        <StepLink label="Step 4 of 5 · Setup steps" onPress={() => undefined} />
      </ScreenHeader>
      <Card gap={space.xl}>
        <TextField
          label="Buy-in per player"
          icon="wallet"
          unit="EUR"
          unitSpoken="euros"
          keyboard="decimal"
          value={buyIn}
          onChangeText={setBuyIn}
        />
        <TextField
          label="Starting stack"
          icon="templates"
          unit="BB"
          unitSpoken="big blinds"
          keyboard="whole"
          value={depth}
          onChangeText={setDepth}
          helper="Recommended: 100 BB."
        />
      </Card>
      <RadioGroup label="Distribution preference">
        <RadioRow label="Fewer chips" selected={preference === 'fewer'} onPress={() => setPreference('fewer')} />
        <RadioRow label="More chips" selected={preference === 'more'} onPress={() => setPreference('more')} />
      </RadioGroup>
      <Card gap={space.xl}>
        <TextField
          label="Blind-payment coverage"
          icon="shield"
          unit="payments"
          keyboard="whole"
          value={coverage}
          onChangeText={setCoverage}
          helper="Payments of each blind without needing change."
        />
        <TextField
          label="Chip reserve"
          icon="reserve"
          unit="stacks"
          keyboard="whole"
          value={reserve}
          onChangeText={setReserve}
          helper="For rebuys and late arrivals. Custom · automatic would be 3 for 6 players."
          footer={
            <Button
              label="Use automatic (3)"
              variant="tertiary"
              icon="undo"
              size="compact"
              onPress={() => setReserve('3')}
              alignStart
            />
          }
        />
      </Card>
      <FooterActions note="Draft saved · no chips issued">
        <Button label="Back" icon="chevronLeft" />
        <Button label="Continue" variant="primary" trailingIcon="chevronRight" />
      </FooterActions>

      <Label>Chip-set denomination row</Label>
      <Card gap={space.lg}>
        <Stack direction="row" justify="space-between" wrap={false}>
          <ChipColorButton
            color="red"
            value={value}
            onPress={() => undefined}
            accessibilityLabel={`Change chip color for denomination 2, value ${value || 'not entered'} chip units. Current color Red.`}
          />
          <IconButton icon="trash" accessibilityLabel={`Remove denomination 2 (value ${value})`} />
        </Stack>
        <Columns>
          <TextField label="Value (chip units)" keyboard="whole" value={value} onChangeText={setValue} />
          <TextField label="Quantity (chips)" keyboard="whole" value={quantity} onChangeText={setQuantity} />
        </Columns>
      </Card>

      <Label>Distribution preview</Label>
      <StackShowcase
        label="1 starting stack"
        value="200"
        unit="chip units"
        adjustment={<ChangePill from="100 BB" to="98 BB" />}
      >
        <ChipTowers columns={stack} />
      </StackShowcase>
      <MetricStrip accessibilityLabel="Game terms summary">
        <MetricTile label="Blinds" value="1 / 2" subLabel="98 BB depth" adjustedFrom="100 BB" />
        <MetricTile label="Cash value" value="EUR 20.00" subLabel="EUR 0.10 / unit" />
        <MetricTile label="Reserve" value="3 stacks" subLabel="Shared in bank" />
      </MetricStrip>
      <Card gap={space.md}>
        <Text variant="sectionTitle">Unissued bank (374 chips)</Text>
        <Text variant="supporting">Covers 3 reserved stacks</Text>
        <ChipPillRow accessibilityLabel="Unissued bank">
          <ChipPill color="grey" value={1} count={110} showValue />
          <ChipPill color="red" value={5} count={138} showValue />
          <ChipPill color="blue" value={25} count={82} showValue />
          <ChipPill color="green" value={100} count={44} showValue />
        </ChipPillRow>
      </Card>

      <Label>Play</Label>
      <SegmentedTabs
        tabs={[
          { key: 'play', label: 'Play' },
          { key: 'results', label: 'Results' },
          { key: 'details', label: 'Game details' },
        ]}
        selectedKey={tab}
        onChange={setTab}
      />
      <TermsPanel
        items={[
          { label: 'Blinds', value: '1 / 2', unit: 'chip units' },
          { label: 'Rebuy', value: '20.00', unit: 'EUR' },
          { label: 'Stack', value: '200', unit: 'chip units' },
        ]}
      />
      <Button label="2 reserve stacks available" trailingIcon="external" fullWidth />
      <SectionHeading title="Playing · 5" action={{ label: 'Add player', icon: 'plus', onPress: () => undefined }} />
      <View>
        <ListRow
          title="Ben"
          subtitle="EUR 40.00 contribution · 1 rebuy"
          onPress={() => undefined}
          actions={
            <>
              <Button
                label="Rebuy"
                icon="plus"
                variant="tonal"
                size="compact"
                accessibilityLabel="Rebuy for Ben"
                onPress={() => setRebuyOpen(true)}
              />
              <Button label="Result" icon="count" size="compact" accessibilityLabel="Result for Ben" />
            </>
          }
        />
        <ListRow
          title="Clara"
          subtitle="EUR 20.00 contribution"
          tags={<Badge label="Count draft" tone="warning" size="small" />}
          onPress={() => undefined}
          actions={
            <>
              <Button label="Rebuy" icon="plus" variant="tonal" size="compact" accessibilityLabel="Rebuy for Clara" />
              <Button label="Resume" icon="count" size="compact" accessibilityLabel="Resume count for Clara" />
            </>
          }
        />
      </View>
      <SectionHeading title="Finished playing · 1" />
      <ListRow
        title="Alice"
        subtitle="EUR 20.00 contribution"
        trailing={<SignedAmount amount="+EUR 5.00" direction="gain" caption="Won" />}
        onPress={() => undefined}
      />

      <Label>Payments</Label>
      <Text variant="supporting">Who pays whom. The app doesn’t track payments.</Text>
      <SectionHeading title="3 payments" size="large" aside="EUR 21.00 in total" />
      <Stack gap="sm">
        <TransferCard from="Bob" to="Clara" amount="EUR 8.00" />
        <TransferCard from="Emma" to="Alice" amount="EUR 6.00" />
      </Stack>
      <SectionHeading title="Balances" />
      <View>
        <ListRow
          title="Alice"
          subtitle={['Final result EUR 33.00', 'Buy-ins EUR 20.00']}
          trailing={<SignedAmount amount="+EUR 13.00" direction="gain" caption="Gets" />}
          onPress={() => undefined}
        />
        <ListRow
          title="Bob"
          subtitle={['Final result EUR 32.00', 'Buy-ins EUR 40.00']}
          trailing={<SignedAmount amount="−EUR 8.00" direction="loss" caption="Pays" />}
          onPress={() => undefined}
        />
      </View>

      <Button label="Open Game actions sheet" icon="more" onPress={() => setSheetOpen(true)} fullWidth />

      <Dialog
        visible={rebuyOpen}
        title="Rebuy for Ben"
        confirmLabel="Issue rebuy · EUR 20.00"
        onConfirm={() => {
          setRebuyOpen(false);
          toast.show('Rebuy issued for Ben');
        }}
        onCancel={() => setRebuyOpen(false)}
      >
        <StackShowcase label="Stack to hand out" value="200" unit="chip units" size="compact">
          <ChipTowers columns={stack} size="compact" />
        </StackShowcase>
        <View>
          <FactRow label="Reserve after rebuy" value="1" unit="stack left" emphasis="large" />
          <FactRow label="Additional contribution" value="EUR 20.00" emphasis="large" />
          <FactRow label="New total contribution" value="EUR 60.00" emphasis="large" />
        </View>
      </Dialog>

      <BottomSheet
        visible={sheetOpen}
        title="Game actions"
        subtitle="In progress · Cash game · 23 Nov, 19:30"
        onCancel={() => setSheetOpen(false)}
        actions={[
          {
            key: 'planning',
            label: 'Return to Planning…',
            description: 'Clear play and hand out new stacks.',
            icon: 'undo',
            destructive: true,
            onPress: () => setSheetOpen(false),
          },
          {
            key: 'delete',
            label: 'Delete game…',
            description: 'Removes this game for good.',
            icon: 'trash',
            destructive: true,
            onPress: () => setSheetOpen(false),
          },
        ]}
      />
    </Screen>
  );
}
