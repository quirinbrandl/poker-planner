import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../Icon';
import { Text } from '../Text';
import { colors, radii, space } from '../theme';

export type ToastTone = 'confirmed' | 'error';

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface ToastApi {
  /** Show a short outcome, e.g. show("Result confirmed"). Announced to screen readers. */
  show: (message: string, options?: { tone?: ToastTone }) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** How long a toast stays visible. */
export const TOAST_DURATION_MS = 3500;

/** Hosts the single toast slot above the bottom safe area. Put it once in the root layout. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const counter = useRef(0);
  const insets = useSafeAreaInsets();

  const show = useCallback<ToastApi['show']>((message, options) => {
    counter.current += 1;
    setToast({ id: counter.current, message, tone: options?.tone ?? 'confirmed' });
    AccessibilityInfo.announceForAccessibility(message);
  }, []);
  const hide = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(
      () => setToast((current) => (current?.id === toast.id ? null : current)),
      TOAST_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [toast]);

  const api = useMemo(() => ({ show, hide }), [show, hide]);
  const tone =
    toast?.tone === 'error'
      ? { bg: colors.errorBackground, fg: colors.error }
      : { bg: colors.confirmedBackground, fg: colors.confirmed };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + space.xl }]}>
          <View
            key={toast.id}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[styles.toast, { backgroundColor: tone.bg, borderColor: tone.fg }]}
            testID="toast"
          >
            <Icon name={toast.tone === 'error' ? 'error' : 'check'} size={18} color={tone.fg} strokeWidth={2.4} />
            <Text variant="label" style={{ color: tone.fg, flexShrink: 1 }}>
              {toast.message}
            </Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

/** Access the toast host. Throws outside ToastProvider. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: space.gutter, right: space.gutter, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    maxWidth: '100%',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});
