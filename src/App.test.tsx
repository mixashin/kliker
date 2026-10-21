import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App from "./App";
import type { Counters } from "./game/replay";
import { playClip } from "./lib/clips";
import { coinAward, rainbowSpill } from "./lib/fx";
import { applyPendingUpdate } from "./lib/update";
import { counters, recordRound } from "./store/session";

const { ZERO } = vi.hoisted(() => {
  const ZERO: Counters = {
    barFill: 0, streak: 0, rainbows: 0, coins: 0, bestStreak: 0, totalCorrect: 0, lastAt: null,
  };
  return { ZERO };
});

vi.mock("./store/session", async () => {
  const { DEFAULT_SETTINGS } = await import("./game/types");
  return {
    counters: vi.fn(() => ZERO),
    recordRound: vi.fn(async () => ZERO),
    hasRecordedName: () => false,
    getSettings: () => DEFAULT_SETTINGS,
    getRounds: () => [],
    lastPrompt: () => null,
    setLastPrompt: vi.fn(),
    initSession: vi.fn(),
  };
});
vi.mock("./lib/clips", () => ({
  hasClip: () => false,
  playClip: vi.fn(() => Promise.resolve()),
  playSequence: vi.fn(() => Promise.resolve()),
}));
vi.mock("./lib/fx", () => ({
  celebrate: vi.fn(),
  sadBeep: vi.fn(),
  rainbowSpill: vi.fn(),
  coinAward: vi.fn(),
}));
vi.mock("./lib/update", () => ({ registerUpdates: vi.fn(), applyPendingUpdate: vi.fn(() => false) }));
vi.mock("./lib/audio", () => ({
  unlockAudio: vi.fn(),
  play: vi.fn(() => Promise.resolve()),
}));
vi.mock("./game/units", () => ({ pickNextUnit: () => "recognize" }));
vi.mock("./game/picker", () => ({
  pickLetter: () => "Б",
  letterDistractors: () => ["А", "В", "Г"],
}));

afterEach(() => vi.useRealTimers());

const startGame = async () => {
  const view = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "ПОЧНИ" }));
  await waitFor(() => expect(view.container.querySelector(".hint")).toBeInTheDocument(), { timeout: 2000 });
  return view;
};

// 10th correct answer of the 10th rainbow: replay wraps the bar and the
// rainbows, and pays out one coin.
const startAtCoinEdge = async () => {
  vi.clearAllMocks();
  vi.mocked(counters).mockReturnValueOnce({ ...ZERO, barFill: 9, rainbows: 9 });
  vi.mocked(recordRound).mockResolvedValueOnce({ ...ZERO, rainbows: 0, coins: 1 });
  const view = await startGame();
  vi.useFakeTimers();
  return view;
};

const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

test("start button opens the first round", async () => {
  await startGame();
});

test("a pending update keeps the start screen: no intro, no round", async () => {
  vi.mocked(applyPendingUpdate).mockReturnValueOnce(true);
  vi.mocked(playClip).mockClear();
  const view = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "ПОЧНИ" }));
  await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
  expect(view.container.querySelector(".hint")).toBeNull();
  expect(playClip).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "ПОЧНИ" })).toBeInTheDocument();
});

test("a correct tap records the round", async () => {
  await startGame();
  fireEvent.click(screen.getByRole("button", { name: "Б" }));
  await waitFor(() => expect(recordRound).toHaveBeenCalledWith("recognize", "Б", true));
});

test("a coin answer holds the full bar, then spills and awards the coin once each", async () => {
  await startAtCoinEdge();
  fireEvent.click(screen.getByRole("button", { name: "Б" }));
  await tick(10);
  expect(screen.getByLabelText("НАПРЕДАК 10 ОД 10")).toBeInTheDocument();
  expect(screen.getByLabelText("ДУГЕ: 9")).toBeInTheDocument();
  expect(rainbowSpill).not.toHaveBeenCalled();

  await tick(3000);
  expect(rainbowSpill).toHaveBeenCalledOnce();
  expect(coinAward).toHaveBeenCalledOnce();
  expect(screen.getByLabelText("НАПРЕДАК 0 ОД 10")).toBeInTheDocument();
  expect(screen.getByLabelText("ДУГЕ: 0")).toBeInTheDocument();
});

test("unmount right after a coin answer cancels the pending effects", async () => {
  const { unmount } = await startAtCoinEdge();
  fireEvent.click(screen.getByRole("button", { name: "Б" }));
  await tick(10);   // the write resolved, spill and coin are scheduled
  unmount();
  await tick(3000);
  expect(rainbowSpill).not.toHaveBeenCalled();
  expect(coinAward).not.toHaveBeenCalled();
});
