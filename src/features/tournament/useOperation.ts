import { useCallback, useRef, useState } from 'react';

import type { TournamentActionResult } from './types';

/**
 * Runs one host operation at a time from a confirmation popup. A second confirm while one runs is
 * ignored. `close` runs whenever the operation settles; a rejection is handed to `onRejected`.
 */
export function useOperation(onRejected: (message: string) => void) {
  const running = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (operation: () => Promise<TournamentActionResult>, close: () => void) => {
      if (running.current) return;
      running.current = true;
      setPending(true);
      try {
        const result = await operation();
        close();
        if (result.status === 'rejected') onRejected(result.message);
      } finally {
        running.current = false;
        setPending(false);
      }
    },
    [onRejected],
  );

  return { pending, run, isRunning: () => running.current };
}
