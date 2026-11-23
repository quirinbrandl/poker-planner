import { usePathname } from 'expo-router';
import { createContext, type ReactNode, useContext, useState } from 'react';

import type { WorkingLocation } from '@/game-management';
import { useGameManagement } from '@/state';

interface LaunchRestore {
  /** The location recorded before this launch, handed out once; afterwards `null`. */
  take(): WorkingLocation | null;
}

const LaunchRestoreContext = createContext<LaunchRestore>({ take: () => null });

/**
 * Remembers where the host was when the app last closed, read once at launch before any screen
 * records a new location. Games takes it on first focus and moves on to it, so Games stays
 * underneath in the stack. Reading the location never applies anything. A launch that opens a
 * deep link instead of Games restores nothing.
 */
export function LaunchRestoreProvider({ children }: { children: ReactNode }) {
  const app = useGameManagement();
  const pathname = usePathname();
  const [value] = useState<LaunchRestore>(() => {
    const location = app.location.get();
    let pending: WorkingLocation | null = pathname === '/' && location.kind !== 'games' ? location : null;
    return {
      take: () => {
        const taken = pending;
        pending = null;
        return taken;
      },
    };
  });
  return <LaunchRestoreContext.Provider value={value}>{children}</LaunchRestoreContext.Provider>;
}

export function useLaunchRestore(): LaunchRestore {
  return useContext(LaunchRestoreContext);
}
