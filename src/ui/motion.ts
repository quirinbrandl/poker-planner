import { useEffect, useState } from 'react';
import { AccessibilityInfo, type PressableStateCallbackType, type ViewStyle } from 'react-native';

/** True while the platform "Reduce motion" setting is on. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => mounted && setReduce(value))
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);
  return reduce;
}

/**
 * Subtle press feedback shared by every pressable primitive: an immediate colour change plus a
 * 1-unit downward offset, the offset removed under Reduce Motion. No other animation exists.
 */
export function usePressFeedback() {
  const reduceMotion = useReduceMotion();
  return (pressed: boolean, pressedBackground?: string): ViewStyle | undefined => {
    if (!pressed) return undefined;
    return {
      ...(pressedBackground ? { backgroundColor: pressedBackground } : { opacity: 0.85 }),
      ...(reduceMotion ? null : { transform: [{ translateY: 1 }] }),
    };
  };
}

export type PressState = PressableStateCallbackType;
