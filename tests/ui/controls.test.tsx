import { fireEvent, screen } from '@testing-library/react-native';

import { Button, RadioRow, SegmentedTabs, TextField } from '@/ui';
import { renderUi } from './render';

describe('RadioRow', () => {
  it('exposes its selected state and the whole row is the target', async () => {
    const onFewer = jest.fn();
    const onMore = jest.fn();
    await renderUi(
      <>
        <RadioRow label="Fewer chips" selected onPress={onFewer} />
        <RadioRow label="More chips" description="Easier blinds" selected={false} onPress={onMore} />
      </>,
    );
    expect(screen.getByRole('radio', { name: 'Fewer chips' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'More chips' })).not.toBeChecked();
    await fireEvent.press(screen.getByText('Easier blinds'));
    expect(onMore).toHaveBeenCalledTimes(1);
    expect(onFewer).not.toHaveBeenCalled();
  });
});

describe('TextField', () => {
  it('keeps the unit in the accessible name and ties the error to the input', async () => {
    await renderUi(
      <TextField
        label="Blind-payment coverage"
        unit="payments"
        keyboard="whole"
        value="4,5"
        onChangeText={() => undefined}
        helper="Payments of each blind without needing change."
        error="Enter a whole number of 1 or more."
      />,
    );
    const input = screen.getByLabelText('Blind-payment coverage, payments');
    expect(input.props.accessibilityHint).toContain('Error: Enter a whole number of 1 or more.');
    expect(input.props.accessibilityHint).toContain('Payments of each blind without needing change.');
    expect(input.props.keyboardType).toBe('number-pad');
    expect(input.props.value).toBe('4,5');
    expect(screen.getByText('Enter a whole number of 1 or more.')).toBeTruthy();
  });

  it('has no error hint without an error', async () => {
    await renderUi(
      <TextField
        label="Buy-in per player"
        unit="EUR"
        unitSpoken="euros"
        keyboard="decimal"
        value=""
        onChangeText={() => undefined}
      />,
    );
    const input = screen.getByLabelText('Buy-in per player, euros');
    expect(input.props.accessibilityHint).toBeUndefined();
    expect(input.props.keyboardType).toBe('decimal-pad');
  });
});

describe('Button', () => {
  it('reports an unavailable action and never runs it', async () => {
    const onPress = jest.fn();
    const onUnavailablePress = jest.fn();
    await renderUi(
      <Button
        label="Calculate Payments"
        variant="primary"
        unavailable
        onPress={onPress}
        onUnavailablePress={onUnavailablePress}
      />,
    );
    const button = screen.getByRole('button', { name: 'Calculate Payments' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(onUnavailablePress).toHaveBeenCalledTimes(1);
  });

  it('shows the loading label and reports busy', async () => {
    const onPress = jest.fn();
    await renderUi(<Button label="Calculate Payments" loading loadingLabel="Calculating…" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Calculating…' });
    expect(button).toBeBusy();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('SegmentedTabs', () => {
  it('marks the selected tab', async () => {
    const onChange = jest.fn();
    await renderUi(
      <SegmentedTabs
        tabs={[
          { key: 'play', label: 'Play' },
          { key: 'results', label: 'Results' },
        ]}
        selectedKey="play"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Play' })).toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: 'Results' }));
    expect(onChange).toHaveBeenCalledWith('results');
  });
});
