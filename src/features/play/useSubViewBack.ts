import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * While a screen shows a view in place (Bank & reserve, an editor), Android back leaves that view
 * instead of the screen. Registered after the screen's own handler, so it runs first.
 */
export function useSubViewBack(active: boolean, onBack: () => void): void {
  useEffect(() => {
    if (!active) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [active, onBack]);
}
