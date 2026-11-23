import { router } from 'expo-router';
import { useState } from 'react';

import {
  BottomSheet,
  Button,
  Card,
  ChipPill,
  ChipPillRow,
  Dialog,
  FactRow,
  InlineNotice,
  Screen,
  ScreenHeader,
  SectionHeading,
  space,
  Stack,
  Text,
  TopBar,
  useToast,
  Badge,
} from '@/ui';

type Open = null | 'confirm' | 'destructive' | 'scope' | 'long' | 'unavailable' | 'sheet';

export default function OverlaysGallery() {
  const [open, setOpen] = useState<Open>(null);
  const toast = useToast();
  const close = () => setOpen(null);

  return (
    <Screen topBar={<TopBar backLabel="Gallery" onBack={() => router.back()} />}>
      <ScreenHeader title="Overlays" context="Dialogs, sheets and toasts" />
      <SectionHeading title="Dialogs" />
      <Stack gap="sm">
        <Button label="Confirm result…" onPress={() => setOpen('confirm')} fullWidth />
        <Button label="Delete game…" variant="destructive" onPress={() => setOpen('destructive')} fullWidth />
        <Button label="Where should changes apply?" onPress={() => setOpen('scope')} fullWidth />
        <Button label="Long confirmation" onPress={() => setOpen('long')} fullWidth />
        <Button label="Confirm not possible yet" onPress={() => setOpen('unavailable')} fullWidth />
      </Stack>
      <SectionHeading title="Bottom sheet" />
      <Button label="Game actions" icon="more" onPress={() => setOpen('sheet')} fullWidth />
      <SectionHeading title="Toast" />
      <Stack direction="row" gap="sm">
        <Button label="Result confirmed" onPress={() => toast.show('Result confirmed')} />
        <Button label="Error toast" onPress={() => toast.show('Nothing was saved.', { tone: 'error' })} />
      </Stack>

      <Dialog
        visible={open === 'confirm'}
        title="Confirm Alice’s result?"
        confirmLabel="Confirm result"
        onConfirm={() => {
          close();
          toast.show('Result confirmed');
        }}
        onCancel={close}
      >
        <ChipPillRow>
          <ChipPill color="white" value={1} count={12} size="compact" />
          <ChipPill color="red" value={5} count={4} size="compact" />
          <ChipPill color="blue" value={25} count={3} size="compact" />
          <ChipPill color="black" value={100} count={1} size="compact" />
          <ChipPill color="green" value={500} count={0} size="compact" />
        </ChipPillRow>
        <Card variant="inset" padding={space.lg}>
          <FactRow label="Final chip units" value="207" />
          <FactRow label="Chip value" value="EUR 20.70" />
          <FactRow label="All contributions" value="EUR 20.00" />
          <FactRow label="Win / loss" value="+EUR 0.70" tone="confirmed" emphasis="large" divider={false} />
        </Card>
      </Dialog>

      <Dialog
        visible={open === 'destructive'}
        title="Delete this game?"
        confirmLabel="Delete game"
        destructive
        onConfirm={() => {
          close();
          toast.show('Game deleted');
        }}
        onCancel={close}
      >
        <Card variant="inset" padding={space.md + 2} gap={space.xs}>
          <Badge label="Completed · Cash game" tone="neutral" size="small" />
          <Text variant="title">Alice, Bob, Clara, David, Emma, Felix</Text>
          <Text variant="caption">23 Nov 2026 · 19:30</Text>
        </Card>
        <Text>Everything recorded in this game is deleted. This can’t be undone.</Text>
        <Text variant="supporting">Saved players and chip set templates stay.</Text>
      </Dialog>

      <Dialog
        visible={open === 'scope'}
        title="Where should changes apply?"
        confirmLabel="Only this game"
        onConfirm={close}
        onCancel={close}
        secondaryAction={{ label: 'Also update “Weeknight set”', onPress: close }}
      >
        <Text variant="supporting">Updating the template only affects future games.</Text>
      </Dialog>

      <Dialog
        visible={open === 'long'}
        title="Return to Planning?"
        confirmLabel="Return to Planning"
        destructive
        onConfirm={close}
        onCancel={close}
      >
        <Text variant="supporting">Clears</Text>
        <Text variant="title">2 rebuys · 6 results · all handed-out stacks</Text>
        <Text variant="supporting">Keeps</Text>
        <Text variant="title">6 players · buy-ins · settings</Text>
        <InlineNotice tone="warning">Collect all chips. You’ll hand out new stacks after Start.</InlineNotice>
        {Array.from({ length: 8 }, (_, i) => (
          <Text key={i} variant="supporting">
            {`Recorded item ${i + 1}: this paragraph makes the dialog long enough to scroll at large text sizes.`}
          </Text>
        ))}
      </Dialog>

      <Dialog
        visible={open === 'unavailable'}
        title="Out in the same hand"
        confirmLabel="Record eliminations"
        confirmIcon="exit"
        confirmUnavailable
        onConfirm={close}
        onCancel={close}
      >
        <Text variant="supporting">Tick at least two players.</Text>
      </Dialog>

      <BottomSheet
        visible={open === 'sheet'}
        title="Game actions"
        subtitle="Completed · Cash game · 23 Nov, 19:30"
        onCancel={close}
        actions={[
          {
            key: 'reopen',
            label: 'Reopen game…',
            description: 'Change results or buy-ins, then calculate again.',
            icon: 'reopen',
            onPress: close,
          },
          {
            key: 'delete',
            label: 'Delete game…',
            description: 'Removes this game for good.',
            icon: 'trash',
            destructive: true,
            onPress: () => setOpen('destructive'),
          },
        ]}
      />
    </Screen>
  );
}
