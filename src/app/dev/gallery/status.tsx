import { router } from 'expo-router';
import { View } from 'react-native';

import {
  Avatar,
  Badge,
  BadgeRow,
  Card,
  ChangePill,
  EmptyState,
  FactRow,
  Icon,
  InlineNotice,
  ListRow,
  MetricStrip,
  MetricTile,
  PlaceBadge,
  ProgressBar,
  Screen,
  ScreenHeader,
  SectionHeading,
  SignedAmount,
  space,
  Stack,
  StatusCard,
  TermsPanel,
  Text,
  TopBar,
  TransferCard,
} from '@/ui';

export default function StatusGallery() {
  return (
    <Screen topBar={<TopBar backLabel="Gallery" onBack={() => router.back()} />}>
      <ScreenHeader title="Status" context="Badges, cards, metrics and rows" />

      <SectionHeading title="Badges" />
      <BadgeRow>
        <Badge label="Cash game" />
        <Badge label="Planning" tone="primary" />
        <Badge label="In progress" tone="primary" />
        <Badge label="6 players" />
        <Badge label="Completed" tone="confirmed" />
        <Badge label="Count draft" tone="warning" />
        <Badge label="Correction draft · unconfirmed" tone="warning" />
        <Badge label="Blocked" tone="error" icon="lock" />
        <Badge label="added later" size="small" />
        <Badge label="2 of 4 coverage" size="small" tone="warning" />
      </BadgeRow>

      <SectionHeading title="Avatars and progress" />
      <Stack direction="row" gap="sm">
        {['Alice', 'Bob', 'Clara', 'émile'].map((n) => (
          <Avatar key={n} name={n} />
        ))}
      </Stack>
      <ProgressBar value={4} max={6} accessibilityLabel="4 of 6 players counted" />
      <ProgressBar value={1} max={3} segments={3} accessibilityLabel="Step 1 of 3" />

      <SectionHeading title="Status cards" />
      <StatusCard title="Everything adds up" description="All 6 counted · 1,600 chip units" />
      <StatusCard
        tone="primary"
        ringText="4/6"
        title="2 still to count"
        description="Clara, Emma"
        progress={{ value: 4, max: 6, accessibilityLabel: '4 of 6 players counted' }}
      />
      <StatusCard tone="error" title="Chips don’t add up" description="The counts are 25 chip units short." />

      <SectionHeading title="Metric tiles" />
      <MetricStrip>
        <MetricTile label="Blinds" value="1 / 2" subLabel="98 BB" adjustedFrom="100 BB" adjusts="subLabel" />
        <MetricTile label="Cash value" value="EUR 20.00" subLabel="EUR 0.10 / unit" />
        <MetricTile label="Reserve" value="1 stack" subLabel="1 of 3 possible" adjustedFrom="3" />
      </MetricStrip>
      <ChangePill from="100 BB" to="98 BB" />

      <SectionHeading title="Terms panel" />
      <TermsPanel
        items={[
          { label: 'Blinds', value: '1 / 2', unit: 'chip units' },
          { label: 'Rebuy', value: '20.00', unit: 'EUR' },
          { label: 'Stack', value: '200', unit: 'chip units' },
        ]}
      />

      <SectionHeading title="Inline notices" />
      <Stack gap="sm">
        <InlineNotice tone="warning">Covers only 2 of 4 blind payments with separate chips.</InlineNotice>
        <InlineNotice tone="error" title="Can’t calculate Payments yet.">
          Clara and Emma still need a final count.
        </InlineNotice>
        <InlineNotice tone="info">Reopened · calculate Payments again when you’re done.</InlineNotice>
        <InlineNotice tone="confirmed">All 6 counted · 1,600 chip units</InlineNotice>
      </Stack>

      <SectionHeading title="Fact rows" />
      <Card padding={space.lg}>
        <FactRow label="Reserve after rebuy" value="1" unit="stack left" emphasis="large" />
        <FactRow label="Additional contribution" value="EUR 20.00" emphasis="large" />
        <FactRow label="New total contribution" value="EUR 60.00" emphasis="large" divider={false} />
      </Card>
      <Card padding={space.lg}>
        <FactRow label="Created" value="23 Nov 2026 · 19:30" stacked />
        <FactRow label="Buy-in" value="EUR 20.00 · EUR 0.10 / unit" stacked divider={false} />
      </Card>

      <SectionHeading title="Rows" />
      <View>
        <ListRow
          title="Alice"
          subtitle="EUR 20.00 contribution"
          trailing={<SignedAmount amount="+EUR 13.00" direction="gain" caption="Won" />}
          onPress={() => undefined}
        />
        <ListRow
          title="Bob"
          subtitle="EUR 40.00 contribution · 1 rebuy"
          trailing={<SignedAmount amount="−EUR 8.00" direction="loss" caption="Lost" />}
          onPress={() => undefined}
        />
        <ListRow
          title="Felix"
          subtitle={['Final result EUR 20.00', 'Buy-ins EUR 20.00']}
          trailing={<SignedAmount amount="EUR 0.00" direction="even" caption="Even" />}
        />
        <ListRow
          title="Alice"
          titleAside={<PlaceBadge label="1st" highlight />}
          subtitle={['Payout EUR 98.00', 'Buy-ins EUR 20.00']}
          trailing={<SignedAmount amount="+EUR 78.00" direction="gain" caption="Gets" />}
          accessibilityLabel="Alice, 1st, Payout EUR 98.00, Buy-ins EUR 20.00, +EUR 78.00, Gets"
          onPress={() => undefined}
        />
        <ListRow
          title="History"
          leading={<Icon name="clock" />}
          trailing={<Text variant="supporting">3 games</Text>}
          chevron
          onPress={() => undefined}
        />
      </View>

      <SectionHeading title="Payment card" size="large" aside="EUR 21.00 in total" />
      <TransferCard from="Bob" to="Clara" amount="EUR 8.00" />
      <TransferCard from="David" to="Alice" amount="EUR 7.00" />

      <SectionHeading title="Empty state" />
      <EmptyState
        icon="clock"
        title="No finished games yet"
        description="A game shows up here once you calculate its Payments."
        action={{ label: 'Back to Games', onPress: () => undefined }}
      />
    </Screen>
  );
}
