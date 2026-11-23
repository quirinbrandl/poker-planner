import { fireEvent, screen } from '@testing-library/react-native';

import { Dialog, Text } from '@/ui';
import { renderUi } from './render';

function setup(destructive = false) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  return {
    onConfirm,
    onCancel,
    rendered: renderUi(
      <Dialog
        visible
        title="Delete this game?"
        confirmLabel="Delete game"
        destructive={destructive}
        onConfirm={onConfirm}
        onCancel={onCancel}
        testID="delete-dialog"
      >
        <Text>Everything recorded in this game is deleted.</Text>
      </Dialog>,
    ),
  };
}

describe('Dialog', () => {
  it('confirms with the specific verb', async () => {
    const { onConfirm, onCancel, rendered } = setup();
    await rendered;
    expect(screen.getByText('Everything recorded in this game is deleted.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete game' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels with the Cancel button', async () => {
    const { onConfirm, onCancel, rendered } = setup(true);
    await rendered;
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('treats the Android back button as cancel', async () => {
    const { onConfirm, onCancel, rendered } = setup();
    await rendered;
    // React Native routes the Android hardware back button to the Modal's onRequestClose.
    await fireEvent(screen.getByTestId('delete-dialog', { includeHiddenElements: true }), 'requestClose');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('treats a backdrop tap as cancel', async () => {
    const { onConfirm, onCancel, rendered } = setup();
    await rendered;
    await fireEvent.press(screen.getByTestId('delete-dialog-backdrop', { includeHiddenElements: true }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders nothing while not visible', async () => {
    await renderUi(<Dialog visible={false} title="Hidden" onCancel={() => undefined} />);
    expect(screen.queryByText('Hidden')).toBeNull();
  });
});
