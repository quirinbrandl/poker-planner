import { render } from '@testing-library/react-native';
import { type ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/ui';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** Render inside the same providers as the root layout. */
export function renderUi(element: ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ToastProvider>{element}</ToastProvider>
    </SafeAreaProvider>,
  );
}
