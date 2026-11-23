import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';

import { useWorkspace } from '@/features/game/useWorkspace';
import { BankReserveView } from '@/features/play/BankReserveView';
import { useSubViewBack } from '@/features/play/useSubViewBack';
import { formatGameDateTime } from '@/features/shared/format';
import { useBankReserve, useGameDetails } from '@/state';
import { Screen } from '@/ui';

import { GameDetailsView } from './GameDetailsView';

/** Game details of a started game: the locked setup, read-only, with the current bank and reserve. */
export default function GameDetailsScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const workspace = useWorkspace(gameId);
  const details = useGameDetails(gameId);
  const bank = useBankReserve(gameId);
  const [showBank, setShowBank] = useState(false);
  const closeBank = useCallback(() => setShowBank(false), []);
  useSubViewBack(showBank, closeBank);

  if (!workspace || !details) return <Screen>{workspace?.actions}</Screen>;

  if (showBank && bank) {
    return (
      <>
        <BankReserveView
          data={{ ...bank, context: workspace.context }}
          backLabel="Back to Game details"
          onBack={closeBank}
          onMore={workspace.onMore}
        />
        {workspace.actions}
      </>
    );
  }

  return (
    <>
      <GameDetailsView
        data={{
          ...details,
          context: workspace.context,
          backLabel: workspace.backLabel,
          createdText: formatGameDateTime(details.createdAt),
          finishedText: null,
        }}
        onViewBank={bank ? () => setShowBank(true) : undefined}
        onSelectTab={workspace.onSelectTab}
        onBack={workspace.onBack}
        onMore={workspace.onMore}
      />
      {workspace.actions}
    </>
  );
}
