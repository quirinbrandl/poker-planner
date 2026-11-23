import { type ReactNode } from 'react';

import { Badge, BadgeRow, Screen, ScreenHeader, type ScreenProps, SegmentedTabs, TopBar } from '@/ui';

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
  /** The tab this screen is; also the page heading. */
  tab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  /** Where the top-left control leads: "Games", or "History" for a game opened from there. */
  backLabel: 'Games' | 'History';
  onBack: () => void;
  /** Opens the game actions (⋯). */
  onMore: () => void;
  /** Extra badges after the phase badge, e.g. "Reopened". */
  badges?: ReactNode;
  children?: ReactNode;
  /** Usually `FooterActions`. */
  footer?: ReactNode;
  scrollRef?: ScreenProps['scrollRef'];
}

/**
 * The shared shell of a started game's workspace screens: Games (or History) and game actions at
 * the top, the mode and date line, the phase badge, the page heading and the workspace tabs.
 * Purely presentational: the screen passes the navigation.
 */
export function WorkspaceFrame({
  phase,
  context,
  tab,
  onSelectTab,
  backLabel,
  onBack,
  onMore,
  badges,
  children,
  footer,
  scrollRef,
}: WorkspaceFrameProps) {
  return (
    <Screen scrollRef={scrollRef} topBar={<TopBar backLabel={backLabel} onBack={onBack} onMore={onMore} />} footer={footer}>
      <ScreenHeader
        context={context}
        badges={
          <BadgeRow>
            {phase === 'inProgress' ? (
              <Badge label="In progress" tone="primary" />
            ) : (
              <Badge label="Completed" tone="confirmed" />
            )}
            {badges}
          </BadgeRow>
        }
        title={TAB_LABELS[tab]}
      >
        <SegmentedTabs
          tabs={TABS[phase].map((key) => ({ key, label: TAB_LABELS[key] }))}
          selectedKey={tab}
          onChange={onSelectTab}
        />
      </ScreenHeader>
      {children}
    </Screen>
  );
}
