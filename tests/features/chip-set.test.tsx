import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { type ReactNode } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ChipSetStepScreen from '@/features/planning/ChipSetStepScreen';
import TemplatePickerScreen from '@/features/templates/TemplatePickerScreen';
import {
  type ChipRowInput,
  createGameManagement,
  createMemoryStore,
  type DocumentStore,
  type GameManagement,
} from '@/game-management';
import { GameManagementProvider, useGameManagement } from '@/state';
import { ToastProvider } from '@/ui';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

let live: GameManagement;
function Capture() {
  live = useGameManagement();
  return null;
}

const rows = (...entries: [string, string][]): ChipRowInput[] =>
  entries.map(([valueText, quantityText], i) => ({ id: `r${i}`, valueText, quantityText, color: null }));

/** Prepares saved data with `setup`, then renders the app's routes on the same store. */
async function open(setup: (app: GameManagement) => Promise<string>, url: (gameId: string) => string) {
  const store: DocumentStore = createMemoryStore();
  let n = 0;
  const seed = await createGameManagement({ store, newId: () => `seed-${++n}` });
  const gameId = await setup(seed);
  await seed.persistence.flush();
  let m = 0;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={metrics}>
      <ToastProvider>
        <GameManagementProvider store={store} newId={() => `app-${++m}`} loading={<Text>Loading</Text>}>
          <Capture />
          {children}
        </GameManagementProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
  const router = await renderRouter(
    {
      index: () => <Text>Games</Text>,
      'game/[gameId]/planning/chip-set': ChipSetStepScreen,
      'game/[gameId]/planning/settings': () => <Text>Game settings step</Text>,
      'templates/choose': TemplatePickerScreen,
    },
    { initialUrl: url(gameId), wrapper },
  );
  await screen.findAllByText(/./);
  return { gameId, router };
}

const chipSetUrl = (gameId: string) => `/game/${gameId}/planning/chip-set`;
const press = async (name: string | RegExp) => {
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name }));
  });
};

/** A cash game whose chip set was copied from "Home" (1 × 100, 5 × 50), then edited to 1 × 80. */
async function gameFromHome(app: GameManagement) {
  const created = await app.templates.create({ name: 'Home', rows: rows(['1', '100'], ['5', '50']) });
  if (created.status !== 'accepted') throw new Error('template');
  const { gameId } = (await app.games.create('cash')) as { gameId: string };
  await app.planning.applyTemplate(gameId, created.templateId);
  const firstRow = app.planning.getView(gameId)!.chipSet.rows[0].id;
  await app.planning.setChipQuantityText(gameId, firstRow, '80');
  return gameId;
}
const homeQuantities = () => live.templates.list()[0].denominations.map((d) => d.quantity);

describe('Chip set step', () => {
  it('opens the scope popup on a valid Continue; Only this game advances and leaves the template alone', async () => {
    const { router } = await open(gameFromHome, chipSetUrl);
    await press('Continue');
    expect(screen.getByText('Where should changes apply?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Also update template' })).toBeTruthy();

    await press('Only this game');
    expect(await screen.findByText('Game settings step')).toBeTruthy();
    expect(router.getPathname()).toMatch(/\/planning\/settings$/);
    expect(homeQuantities()).toEqual([100, 50]);
  });

  it('Also update template writes the game’s rows into the source template', async () => {
    await open(gameFromHome, chipSetUrl);
    await press('Continue');
    await press('Also update template');
    expect(await screen.findByText('Game settings step')).toBeTruthy();
    expect(homeQuantities()).toEqual([80, 50]);
  });

  it('Save as new template with a duplicate name shows the name error, keeps the text and stays on the step', async () => {
    const { router } = await open(async (app) => {
      await app.templates.create({ name: 'Home', rows: rows(['1', '100']) });
      const { gameId } = (await app.games.create('cash')) as { gameId: string };
      const { rowId } = (await app.planning.addChipRow(gameId)) as { rowId: string };
      await app.planning.setChipValueText(gameId, rowId, '5');
      await app.planning.setChipQuantityText(gameId, rowId, '20');
      return gameId;
    }, chipSetUrl);

    await press('Continue');
    await press('Save as new template');
    await act(async () => {
      await fireEvent.changeText(screen.getByTestId('new-template-name'), ' home ');
    });
    await press('Save template and continue');

    expect(screen.getByText('A template named “Home” already exists.')).toBeTruthy();
    expect(screen.getByTestId('new-template-name').props.value).toBe(' home ');
    expect(router.getPathname()).toMatch(/\/planning\/chip-set$/);
    expect(live.templates.list().map((t) => t.name)).toEqual(['Home']);
  });

  it('asks before removing a populated row; Cancel keeps it', async () => {
    const { gameId } = await open(gameFromHome, chipSetUrl);
    await press('Remove denomination 2 (value 5)');
    expect(screen.getByText('Remove value “5” with quantity “50” (No color) from this game’s chip set?')).toBeTruthy();
    await press('Cancel');
    expect(live.planning.getView(gameId)!.chipSet.rows).toHaveLength(2);

    await press('Remove denomination 2 (value 5)');
    await press('Remove denomination');
    expect(live.planning.getView(gameId)!.chipSet.rows.map((r) => r.value.text)).toEqual(['1']);
  });

  it('applies a staged colour only on Apply color', async () => {
    const { gameId } = await open(gameFromHome, chipSetUrl);
    const color = () => live.planning.getView(gameId)!.chipSet.rows[0].color;

    await press(/^Change chip color for denomination 1,/);
    await act(async () => {
      await fireEvent.press(screen.getByRole('radio', { name: 'Red' }));
    });
    await press('Cancel');
    expect(color()).toBeNull();

    await press(/^Change chip color for denomination 1,/);
    await act(async () => {
      await fireEvent.press(screen.getByRole('radio', { name: 'Red' }));
    });
    await press('Apply color');
    expect(color()).toBe('red');
  });
});

describe('Template picker', () => {
  it('asks before replacing entered rows; Cancel changes nothing', async () => {
    const { gameId } = await open(
      async (app) => {
        await app.templates.create({ name: 'Club', rows: rows(['25', '40']) });
        const { gameId } = (await app.games.create('cash')) as { gameId: string };
        const { rowId } = (await app.planning.addChipRow(gameId)) as { rowId: string };
        await app.planning.setChipValueText(gameId, rowId, '1');
        return gameId;
      },
      (id) => `/templates/choose?gameId=${id}`,
    );
    const values = () => live.planning.getView(gameId)!.chipSet.rows.map((r) => r.value.text);

    await act(async () => {
      await fireEvent.press(screen.getByRole('radio', { name: 'Club' }));
    });
    await press('Use template');
    expect(screen.getByText('Replace this game’s chip set?')).toBeTruthy();
    await press('Cancel');
    expect(values()).toEqual(['1']);

    await press('Use template');
    await press('Replace chip set');
    expect(values()).toEqual(['25']);
  });
});
