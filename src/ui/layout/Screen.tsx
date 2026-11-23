import { type ReactNode, type Ref } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '../theme';
import { type ScrollViewRef } from '../refs';

export interface ScreenProps {
  /** Usually a TopBar. Scrolls with the content. */
  topBar?: ReactNode;
  children?: ReactNode;
  /**
   * Usually FooterActions. Part of the scrollable content (never a fixed overlay), pushed to the
   * bottom when the content is short, so it stays reachable with the keyboard open and at large text.
   */
  footer?: ReactNode;
  /** Gap between direct children. Default 16. */
  gap?: number;
  scrollRef?: Ref<ScrollViewRef>;
  testID?: string;
}

/**
 * Page scaffold: always-dark background, safe areas, vertical scroll, keyboard avoidance and
 * 20-unit gutters.
 */
export function Screen({ topBar, children, footer, gap = space.lg, scrollRef, testID }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    // The top inset is kept outside the scroll area so content never scrolls under the status bar.
    <View style={[styles.root, { paddingTop: insets.top }]} testID={testID}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: space.sm,
              paddingLeft: insets.left + space.gutter,
              paddingRight: insets.right + space.gutter,
              paddingBottom: footer ? 0 : insets.bottom + space.xxxl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          automaticallyAdjustKeyboardInsets={false}
        >
          {topBar}
          <View style={[styles.body, { gap }]}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  body: { minWidth: 0 },
  footer: { marginTop: 'auto', paddingTop: space.section },
});
