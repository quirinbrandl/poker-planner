import {
  act,
  fireEvent,
  renderRouter,
  screen,
} from "expo-router/testing-library";
import { type ReactNode } from "react";
import { BackHandler, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import CountScreen from "@/features/count/CountScreen";
import FixScreen from "@/features/fix/FixScreen";
import PlayerScreen from "@/features/player/PlayerScreen";
import RebuyMixScreen from "@/features/rebuy-mix/RebuyMixScreen";
import {
  createGameManagement,
  createMemoryStore,
  type DocumentStore,
  type GameManagement,
} from "@/game-management";
import { GameManagementProvider, useGameManagement } from "@/state";
import { ToastProvider } from "@/ui";

import {
  expectStatus,
  plannedGame,
  recordCount,
} from "../support/game-management";

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const STACK = [15, 2, 3, 1];

let live: GameManagement;
function Capture() {
  live = useGameManagement();
  return null;
}

/**
 * A started cash game (Alice, Bob, Cleo; every stack [15, 2, 3, 1]) prepared by `seed`, rendered
 * on the given route. `whites`: the White chips of the chip set (48 leaves the bank 3 after Start).
 */
async function open(
  url: (gameId: string, ids: string[]) => string,
  seed: (
    app: GameManagement,
    gameId: string,
    ids: string[],
  ) => Promise<void> = async () => undefined,
  whites = "100",
) {
  const store: DocumentStore = createMemoryStore();
  let n = 0;
  const app = await createGameManagement({ store, newId: () => `seed-${++n}` });
  const gameId = await plannedGame(app, "cash", {
    players: ["Alice", "Bob", "Cleo"],
    chips: [
      ["1", whites],
      ["5", "50"],
      ["25", "50"],
      ["100", "20"],
    ],
    colors: ["white", "red", "blue", "black"],
    reserve: "0",
  });
  const preview = app.planning.getDistributionPreview(gameId)!;
  if (preview.distribution.kind !== "planned")
    throw new Error("expected a plan");
  const plan = preview.distribution.plan;
  expectStatus(
    await app.planning.start(gameId, {
      depthBb: plan.depth.bb,
      reserveStacks: plan.reserve.stacks,
    }),
    "accepted",
  );
  const ids = app.play.getView(gameId)!.players.map((p) => p.id);
  expect(
    app.play.getPlayerBuyIns(gameId, ids[0])!.buyIns[0].mix.map((c) => c.count),
  ).toEqual(STACK);
  await seed(app, gameId, ids);
  await app.persistence.flush();
  let m = 0;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={metrics}>
      <ToastProvider>
        <GameManagementProvider
          store={store}
          newId={() => `app-${++m}`}
          loading={<Text>Loading</Text>}
        >
          <Capture />
          {children}
        </GameManagementProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
  const router = await renderRouter(
    {
      index: () => <Text>Games</Text>,
      "game/[gameId]/play": () => <Text>Play</Text>,
      "game/[gameId]/count/[participantId]": CountScreen,
      "game/[gameId]/player/[participantId]": PlayerScreen,
      "game/[gameId]/rebuy-mix/[participantId]": RebuyMixScreen,
      "game/[gameId]/fix": FixScreen,
    },
    { initialUrl: url(gameId, ids), wrapper },
  );
  await screen.findAllByText(/./);
  return { gameId, ids, router };
}

async function rebuy(
  app: GameManagement,
  gameId: string,
  participantId: string,
) {
  const proposal = expectStatus(
    app.play.proposeRebuy(gameId, participantId),
    "needsConfirmation",
  );
  expectStatus(
    await app.play.issueRebuy(gameId, proposal.confirmation.acceptance),
    "accepted",
  );
}

const press = async (name: string | RegExp) => {
  await act(async () => {
    await fireEvent.press(screen.getByRole("button", { name }));
  });
};

/** Types quantities one denomination at a time with Next denomination. */
async function typeQuantities(quantities: readonly number[]) {
  for (const [i, quantity] of quantities.entries()) {
    await act(async () => {
      fireEvent.changeText(
        screen.getByLabelText("Quantity (chips)"),
        String(quantity),
      );
    });
    if (i < quantities.length - 1) await press("Next denomination");
  }
  await act(() => live.persistence.flush());
}

const counts = (mix: readonly { count: number }[]) => mix.map((c) => c.count);

it("Correct opens a correction draft; Replace result records the new count once", async () => {
  const { gameId, ids, router } = await open(
    (gameId, ids) => `/game/${gameId}/player/${ids[0]}`,
    (app, gameId, ids) => recordCount(app, gameId, ids[0], STACK),
  );
  await press("Correct Alice’s final chips");
  expect(router.getPathname()).toBe(`/game/${gameId}/count/${ids[0]}`);
  expect(screen.getByText("Correction draft")).toBeTruthy();
  await typeQuantities([10, 3]);

  await press("Review correction");
  expect(screen.getByText("Replace Alice’s result?")).toBeTruthy();
  expect(
    screen.getByText(
      "Replaces the previous return once. This corrects records, not chips.",
    ),
  ).toBeTruthy();
  const bankBefore = counts(live.play.getView(gameId)!.bank.mix);
  await press("Replace result");

  expect(router.getPathname()).toBe(`/game/${gameId}/player/${ids[0]}`);
  expect(await screen.findByText("Result replaced")).toBeTruthy();
  expect(
    counts(live.play.getCashPlayer(gameId, ids[0])!.result!.finalChips),
  ).toEqual([10, 3, 3, 1]);
  expect(counts(live.play.getView(gameId)!.bank.mix)).toEqual([
    bankBefore[0] - 5,
    bankBefore[1] + 1,
    bankBefore[2],
    bankBefore[3],
  ]);
});

it("Undo on the player page removes only that rebuy after its popup", async () => {
  const { gameId, ids } = await open(
    (gameId, ids) => `/game/${gameId}/player/${ids[1]}`,
    (app, gameId, ids) => rebuy(app, gameId, ids[1]),
  );
  expect(screen.getByText("Buy-ins · EUR 40.00")).toBeTruthy();
  await press("Undo rebuy 1");
  expect(screen.getByText("Undo Bob’s rebuy 1?")).toBeTruthy();
  expect(
    screen.getByText(
      "Only the record is removed. Take the chips back if Bob already has them.",
    ),
  ).toBeTruthy();
  await press("Cancel");
  expect(live.play.getCashPlayer(gameId, ids[1])!.buyIns).toHaveLength(2);

  await press("Undo rebuy 1");
  await press("Undo rebuy");
  expect(await screen.findByText("Rebuy undone")).toBeTruthy();
  expect(screen.getByText("Buy-ins · EUR 20.00")).toBeTruthy();
  expect(live.play.getCashPlayer(gameId, ids[1])!.buyIns).toHaveLength(1);
});

it("Return to play removes the result and leaves the player playing", async () => {
  const { gameId, ids } = await open(
    (gameId, ids) => `/game/${gameId}/player/${ids[0]}`,
    (app, gameId, ids) => recordCount(app, gameId, ids[0], [15, 2, 5, 1]),
  );
  await press("Return to play…");
  expect(screen.getByText("Alice back in the game?")).toBeTruthy();
  expect(screen.getByText("Hand Alice back these chips:")).toBeTruthy();
  await press("Back in the game");
  expect(await screen.findByText("Back in the game")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Count chips" }),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Rebuy for Alice" })).toBeTruthy();
  expect(live.play.getCashPlayer(gameId, ids[0])).toMatchObject({
    result: null,
    buyInsTotalText: "EUR 20.00",
  });
});

it("a correction a later rebuy depends on opens the fix flow, which advances one confirmed step", async () => {
  const { gameId, ids, router } = await open(
    (gameId, ids) => `/game/${gameId}/count/${ids[0]}`,
    async (app, gameId, ids) => {
      await recordCount(app, gameId, ids[0], [15, 2, 5, 1]);
      await rebuy(app, gameId, ids[1]);
      for (const [value, text] of [
        [1, "10"],
        [5, "3"],
      ] as const) {
        expectStatus(
          await app.play.setCorrectionText(gameId, ids[0], value, text),
          "accepted",
        );
      }
    },
    "48",
  );
  await press("Review correction");
  expect(router.getPathname()).toBe(`/game/${gameId}/fix`);
  expect(screen.getByLabelText("Can’t save Alice’s count yet")).toBeTruthy();
  expect(
    screen.getByText("Bob’s rebuy 1 is using 2 of these White chips"),
  ).toBeTruthy();

  await press("Undo Bob’s rebuy 1…");
  expect(
    screen.getByText(
      "Only the record is removed. Bob keeps the chips until the new rebuy.",
    ),
  ).toBeTruthy();
  await press("Undo rebuy");
  expect(
    await screen.findByText("Now save Alice’s corrected count"),
  ).toBeTruthy();
  expect(live.play.getPlayScreen(gameId)!.fixText).toBe(
    "Fixing Alice’s count · Step 2 of 3",
  );
  expect(live.play.getCashPlayer(gameId, ids[1])!.buyIns).toHaveLength(1);
  // Alice's result is unchanged until step 2 is confirmed.
  expect(
    counts(live.play.getCashPlayer(gameId, ids[0])!.result!.finalChips),
  ).toEqual([15, 2, 5, 1]);

  await press("Save Alice’s count…");
  expect(screen.getByText("Replace Alice’s result?")).toBeTruthy();
  await press("Replace result");
  expect(await screen.findByText("Give Bob a new rebuy")).toBeTruthy();
  await press("Review Bob’s new rebuy…");
  expect(screen.getByText("Rebuy for Bob")).toBeTruthy();
  expect(
    screen.getByText("Swap Bob’s chips so they match this stack."),
  ).toBeTruthy();
});

it("Android back on the fix page goes to Play, like its Back to Play", async () => {
  // Collect the hardware back handlers the screens register; the newest one runs first.
  type Handler = Parameters<typeof BackHandler.addEventListener>[1];
  const handlers: Handler[] = [];
  const spy = jest
    .spyOn(BackHandler, "addEventListener")
    .mockImplementation((_event, handler) => {
      handlers.push(handler);
      return {
        remove: () => {
          handlers.splice(handlers.indexOf(handler), 1);
        },
      };
    });
  try {
    const { gameId, router } = await open(
      (gameId, ids) => `/game/${gameId}/count/${ids[0]}`,
      async (app, gameId, ids) => {
        await recordCount(app, gameId, ids[0], [15, 2, 5, 1]);
        await rebuy(app, gameId, ids[1]);
        expectStatus(
          await app.play.setCorrectionText(gameId, ids[0], 1, "10"),
          "accepted",
        );
      },
      "48",
    );
    await press("Review correction");
    expect(router.getPathname()).toBe(`/game/${gameId}/fix`);
    await act(async () => {
      expect(handlers.at(-1)?.({} as Parameters<Handler>[0])).toBe(true);
    });
    expect(router.getPathname()).toBe(`/game/${gameId}/play`);
    // Step 1 recorded nothing, so Play offers no fix to continue.
    expect(live.play.getPlayScreen(gameId)!.fixText).toBeNull();
  } finally {
    spy.mockRestore();
  }
});

it("adds a forgotten rebuy with reduced coverage only after Accept & add", async () => {
  const { gameId, ids, router } = await open(
    (gameId, ids) => `/game/${gameId}/player/${ids[0]}`,
    (app, gameId, ids) => recordCount(app, gameId, ids[0], [15, 2, 5, 1]),
  );
  await press("Add forgotten rebuy for Alice");
  expect(router.getPathname()).toBe(`/game/${gameId}/rebuy-mix/${ids[0]}`);
  expect(screen.getByText("Alice · Forgotten rebuy")).toBeTruthy();
  expect(screen.getByText("of 200 chip units")).toBeTruthy();
  await typeQuantities([10, 3, 3, 1]);
  expect(screen.getByText("Exactly 200 ✓")).toBeTruthy();

  await press("Review rebuy");
  expect(screen.getByText("Add Alice’s forgotten rebuy?")).toBeTruthy();
  expect(
    screen.getByText("Covers only 3 of 4 blind payments with separate chips."),
  ).toBeTruthy();
  await press("Decline");
  expect(live.play.getCashPlayer(gameId, ids[0])!.buyIns).toHaveLength(1);

  await press("Review rebuy");
  await press("Accept & add");
  expect(router.getPathname()).toBe(`/game/${gameId}/player/${ids[0]}`);
  expect(await screen.findByText("Forgotten rebuy added")).toBeTruthy();
  expect(screen.getByText("added later")).toBeTruthy();
  expect(screen.getByText("3 of 4 coverage")).toBeTruthy();
  expect(live.play.getCashPlayer(gameId, ids[0])!.result).toMatchObject({
    unitsText: "250",
    winLoss: { amountText: "−EUR 15.00" },
  });
});
