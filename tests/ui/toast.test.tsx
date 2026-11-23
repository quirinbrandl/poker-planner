import { act, fireEvent, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { Button, TOAST_DURATION_MS, useToast } from '@/ui';
import { renderUi } from './render';

function Trigger() {
  const toast = useToast();
  return <Button label="Confirm" onPress={() => toast.show('Result confirmed')} />;
}

describe('Toast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows a short message, announces it and disappears', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await renderUi(<Trigger />);
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));
    expect(screen.getByText('Result confirmed')).toBeTruthy();
    expect(announce).toHaveBeenCalledWith('Result confirmed');
    await act(async () => {
      jest.advanceTimersByTime(TOAST_DURATION_MS + 10);
    });
    expect(screen.queryByText('Result confirmed')).toBeNull();
  });
});
