import { type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Badge, BadgeRow, Screen, type ScreenProps, SegmentedTabs, space, Text, TopBar } from '@/ui';

/** The tabs of a started game. In progress: Play, Results, Game details. Completed: Payments first. */
export type WorkspaceTab = 'play' | 'results' | 'details' | 'payments';

const TAB_LABELS: Readonly<Record<WorkspaceTab, string>> = {
  play: 'Play',
  results: 'Results',
  details: 'Game details',
  payments: 'Payments',
};

const TABS: Readonly<Record<WorkspaceFrameProps['phase'], readonly WorkspaceTab[]>> = {
  inProgress: ['play', 'results', 'details'],
  completed: ['payments', 'results', 'details'],
};

export interface WorkspaceFrameProps {
  phase: 'inProgress' | 'completed';
  /** "Cash game · 13 Nov, 19:30" (Completed adds the finishing time). */
  context: string;
  /** The tab this screen is; the selected tab is the visible heading, and it is spoken as one. */
  tab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  /** Where the top-left control leads: "Games", or "History" for a game opened from there. */
  backLabel: 'Games' | 'History';
  onBack: () => void;
  /** Opens the game actions (⋯). */
  onMore: () => void;
  /** In progress after Reopen: shows "Reopened" in the game line. */
  reopened?: boolean;
  /** Extra badges at the end of the game line. */
  badges?: ReactNode;
  children?: ReactNode;
  /** Usually `FooterActions`. */
  footer?: ReactNode;
  scrollRef?: ScreenProps['scrollRef'];
}

/**
 * The shared shell of a started game's workspace screens: Games (or History) and game actions at
 * the top, one game line (mode and date; on the right only a state that is not the default:
 * Completed, Reopened) and the workspace tabs. The selected tab is the heading; the game line is
 * spoken as the screen heading ("Play, Cash game · 23 Nov, 19:30"). Purely presentational.
 */
export function WorkspaceFrame({
  phase,
  context,
  tab,
  onSelectTab,
  backLabel,
  onBack,
  onMore,
  reopened,
  badges,
  children,
  footer,
  scrollRef,
}: WorkspaceFrameProps) {
  const { fontScale } = useWindowDimensions();
  const stacked = (fontScale || 1) >= 1.3;
  const showState = phase === 'completed' || reopened || badges;
  return (
    <Screen scrollRef={scrollRef} topBar={<TopBar backLabel={backLabel} onBack={onBack} onMore={onMore} />} footer={footer}>
      <View style={styles.header}>
        <View style={[styles.meta, stacked && styles.metaStacked]}>
          <Text
            variant="supporting"
            accessibilityRole="header"
            accessibilityLabel={`${TAB_LABELS[tab]}, ${context}`}
            style={!stacked && styles.context}
          >
            {context}
          </Text>
          {showState ? (
            <BadgeRow>
              {phase === 'completed' ? <Badge label="Completed" tone="confirmed" size="small" /> : null}
              {reopened && phase === 'inProgress' ? <Badge label="Reopened" tone="primary" size="small" /> : null}
              {badges}
            </BadgeRow>
          ) : null}
        </View>
        <SegmentedTabs
          tabs={TABS[phase].map((key) => ({ key, label: TAB_LABELS[key] }))}
          selectedKey={tab}
          onChange={onSelectTab}
        />
      </View>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.md },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, minHeight: 24 },
  metaStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  context: { flex: 1 },
});
