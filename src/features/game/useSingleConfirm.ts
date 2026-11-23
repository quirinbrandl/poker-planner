import { useEffect, useRef } from 'react';

/**
 * Wraps a confirmation's callbacks so a confirm runs at most once per opening: further presses are
 * ignored while `busy`, and also in the moment between the press and the host passing `busy`.
 * Cancel is ignored while busy. The latch resets when the dialog closes or `busy` ends (a rejection
 * that keeps the dialog open can be confirmed again).
 */
export function useSingleConfirm(visible: boolean, busy: boolean, onConfirm: () => void, onCancel: () => void) {
  const fired = useRef(false);
  const wasBusy = useRef(busy);
  useEffect(() => {
    if (!visible || (wasBusy.current && !busy)) fired.current = false;
    wasBusy.current = busy;
  }, [visible, busy]);
  return {
    confirm: () => {
      if (busy || fired.current) return;
      fired.current = true;
      onConfirm();
    },
    cancel: () => {
      if (!busy) onCancel();
    },
  };
}
