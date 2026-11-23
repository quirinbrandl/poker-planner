import { screen } from '@testing-library/react-native';

import { ChipCase, chipCaseLayout, ChipPill, ChipTowers, MAX_CHANNELS_PER_DENOMINATION } from '@/ui';
import { renderUi } from './render';

describe('ChipPill', () => {
  it('is spoken as "N × value color"', async () => {
    await renderUi(
      <>
        <ChipPill color="white" value={1} count={15} />
        <ChipPill color={null} value={500} count={0} />
      </>,
    );
    expect(screen.getByLabelText('15 × 1 White')).toBeTruthy();
    expect(screen.getByLabelText('0 × 500 No color')).toBeTruthy();
    expect(screen.getByText('×15')).toBeTruthy();
  });
});

describe('ChipTowers', () => {
  it('labels each used denomination in ascending order and skips zero counts', async () => {
    await renderUi(
      <ChipTowers
        columns={[
          { value: 25, color: 'blue', count: 3 },
          { value: 1, color: 'white', count: 15 },
          { value: 500, color: 'purple', count: 0 },
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.props.accessibilityLabel)).toEqual([
      '15 chips of value 1 (White)',
      '3 chips of value 25 (Blue)',
    ]);
    expect(screen.queryByText('500 · Purple')).toBeNull();
  });
});

describe('chip case layout', () => {
  it('opens a channel per started 100 chips and never shares channels', () => {
    const { channels } = chipCaseLayout([
      { key: 'w', color: 'white', quantity: 240 },
      { key: 'r', color: 'white', quantity: 40 },
    ]);
    expect(channels.map((c) => c.count)).toEqual([100, 100, 40, 40]);
    expect(new Set(channels.slice(0, 3).map((c) => c.key.split('-')[0]))).toEqual(new Set(['w']));
  });

  it('draws nothing for zero or blank quantities', () => {
    const { channels } = chipCaseLayout([
      { key: 'a', color: 'red', quantity: 0 },
      { key: 'b', color: 'red', quantity: null },
    ]);
    expect(channels).toEqual([]);
  });

  it('bounds the drawing per denomination and marks the schematic channel', () => {
    const { channels, schematic } = chipCaseLayout([{ key: 'y', color: 'yellow', quantity: 5000 }]);
    expect(channels).toHaveLength(MAX_CHANNELS_PER_DENOMINATION);
    expect(schematic).toBe(true);
    expect(channels.filter((c) => c.more)).toHaveLength(1);
  });

  it('is one labelled image for assistive tech', async () => {
    await renderUi(<ChipCase denominations={[{ key: 'w', color: 'white', quantity: 40 }]} />);
    expect(screen.getByRole('image', { name: /Chip case illustration/ })).toBeTruthy();
  });
});
