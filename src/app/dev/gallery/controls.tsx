import { router } from 'expo-router';
import { useState } from 'react';

import {
  Button,
  Card,
  FooterActions,
  IconButton,
  RadioGroup,
  RadioRow,
  Screen,
  ScreenHeader,
  SectionHeading,
  SegmentedTabs,
  space,
  Stack,
  StepLink,
  StepList,
  StepperField,
  Text,
  TextField,
  TopBar,
} from '@/ui';

const tabs = [
  { key: 'play', label: 'Play' },
  { key: 'results', label: 'Results' },
  { key: 'details', label: 'Game details' },
] as const;

export default function ControlsGallery() {
  const [buyIn, setBuyIn] = useState('20');
  const [depth, setDepth] = useState('');
  const [name, setName] = useState('alice');
  const [coverage, setCoverage] = useState('4,5');
  const [quantity, setQuantity] = useState('12');
  const [preference, setPreference] = useState<'fewer' | 'more'>('fewer');
  const [tab, setTab] = useState<(typeof tabs)[number]['key']>('play');

  const step = (delta: number) => {
    const n = /^\d+$/.test(quantity) ? Number(quantity) : 0;
    setQuantity(String(Math.max(0, n + delta)));
  };

  return (
    <Screen
      topBar={<TopBar backLabel="Gallery" onBack={() => router.back()} onMore={() => undefined} />}
      footer={
        <FooterActions note="Draft saved · no chips issued">
          <Button label="Back" icon="chevronLeft" />
          <Button label="Continue" variant="primary" trailingIcon="chevronRight" />
        </FooterActions>
      }
    >
      <ScreenHeader title="Controls" context="Buttons, fields and choices" />

      <SectionHeading title="Buttons" />
      <Stack gap="sm">
        <Button label="New game" icon="plus" variant="primary" fullWidth />
        <Button label="Choose template" icon="templates" fullWidth />
        <Stack direction="row" gap="sm">
          <Button label="Use automatic (3)" variant="tertiary" icon="undo" size="compact" />
          <Button label="Add player" variant="tertiary" icon="plus" />
        </Stack>
        <Button label="Delete game" variant="destructive" icon="trash" />
        <Stack direction="row" gap="sm">
          <Button label="Rebuy" icon="plus" variant="tonal" size="compact" accessibilityLabel="Rebuy for Ben" />
          <Button label="Result" icon="count" size="compact" accessibilityLabel="Result for Ben" />
        </Stack>
        <Text variant="caption">Unavailable (still focusable, explains itself) and loading:</Text>
        <Button
          label="Calculate Payments"
          variant="primary"
          unavailable
          onUnavailablePress={() => undefined}
          fullWidth
        />
        <Button label="Calculate Payments" variant="primary" loading loadingLabel="Calculating…" fullWidth />
        <Button label="Edit chip set" icon="edit" unavailable />
      </Stack>

      <SectionHeading title="Icon buttons" />
      <Stack direction="row" gap="sm">
        <IconButton icon="trash" accessibilityLabel="Remove denomination 2 (value 5)" />
        <IconButton icon="edit" accessibilityLabel="Edit Weeknight set" />
        <IconButton icon="trash" tone="destructive" accessibilityLabel="Delete Weeknight set" />
        <IconButton icon="more" variant="plain" accessibilityLabel="Game actions" />
        <IconButton icon="arrowUp" accessibilityLabel="Move Alice up" unavailable />
        <IconButton icon="arrowDown" accessibilityLabel="Move Alice down" />
      </Stack>

      <SectionHeading title="Text fields" />
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
        <TextField
          label="Blind-payment coverage"
          icon="shield"
          unit="payments"
          keyboard="whole"
          value={coverage}
          onChangeText={setCoverage}
          helper="Payments of each blind without needing change."
          error="Enter a whole number of 1 or more."
        />
      </Card>
      <TextField label="Player name" value={name} onChangeText={setName} error="Alice is already in this game." />
      <TextField
        label="Starting stack (read-only)"
        unit="BB"
        value="100"
        onChangeText={() => undefined}
        editable={false}
      />

      <SectionHeading title="Stepper" />
      <Card variant="showcase">
        <StepperField
          label="Quantity (chips)"
          value={quantity}
          onChangeText={setQuantity}
          onDecrement={() => step(-1)}
          onIncrement={() => step(1)}
          decrementLabel="One White chip fewer"
          incrementLabel="One White chip more"
        />
      </Card>

      <SectionHeading title="Radio rows" />
      <RadioGroup label="Distribution preference">
        <RadioRow label="Fewer chips" selected={preference === 'fewer'} onPress={() => setPreference('fewer')} />
        <RadioRow
          label="More chips"
          description="Uses more small chips, so blinds are easier to pay."
          selected={preference === 'more'}
          onPress={() => setPreference('more')}
        />
        <RadioRow
          label="Tournament"
          description="Not available after Start."
          selected={false}
          unavailable
          onPress={() => undefined}
        />
      </RadioGroup>

      <SectionHeading title="Workspace tabs" />
      <SegmentedTabs tabs={tabs} selectedKey={tab} onChange={setTab} />

      <SectionHeading title="Wizard steps" />
      <StepLink label="Step 5 of 5 · Setup steps" onPress={() => undefined} />
      <StepList
        steps={[
          { key: 'mode', label: 'Mode', status: 'complete', onPress: () => undefined },
          { key: 'players', label: 'Players', status: 'complete', onPress: () => undefined },
          { key: 'chips', label: 'Chip set', status: 'needsAttention', onPress: () => undefined },
          { key: 'settings', label: 'Game settings', status: 'notFilled', current: true, onPress: () => undefined },
          { key: 'preview', label: 'Distribution preview', status: 'notFilled' },
        ]}
      />
    </Screen>
  );
}
