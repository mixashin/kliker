import { Blob as NodeBlob } from "node:buffer";
import { beforeEach, expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "../game/types";
import { saveClip } from "../lib/clips";
import { clearAll, loadRounds } from "./db";
import {
  counters,
  getRounds,
  getSettings,
  hasRecordedName,
  initSession,
  lastPrompt,
  recordedNames,
  recordRound,
  redeemCoin,
  resetProgress,
  setLastPrompt,
  updateSettings,
} from "./session";

beforeEach(async () => {
  await clearAll();
  await initSession();
});

test("recordRound persists and recomputes the streak", async () => {
  await recordRound("recognize", "Б", true, "2026-01-01T00:00:01.000Z");
  await recordRound("recognize", "Б", true, "2026-01-01T00:00:02.000Z");
  expect(counters().streak).toBe(2);
  expect((await loadRounds()).length).toBe(2);
});

test("redeemCoin spends one coin and is a no-op at zero", async () => {
  await updateSettings({ opening: { ...DEFAULT_SETTINGS.opening, coins: 1 } });
  await redeemCoin();
  expect(counters().coins).toBe(0);
  await redeemCoin();
  expect(counters().coins).toBe(0);
  expect(getSettings().redeemed).toBe(1);
});

test("resetProgress folds counters into opening and clears the log", async () => {
  await updateSettings({ opening: { ...DEFAULT_SETTINGS.opening, coins: 8 } });
  for (let i = 0; i < 10; i++) {
    await recordRound("recognize", "Б", true, `2026-01-01T00:00:${String(i).padStart(2, "0")}.000Z`);
  }
  await resetProgress();
  expect(getRounds().length).toBe(0);
  expect(counters().coins).toBe(8);
  expect(counters().rainbows).toBe(1);
  expect(getSettings().seededAt).not.toBe("");
  expect(getSettings().opening.totalCorrect).toBe(10);
  expect((await loadRounds()).length).toBe(0);
});

test("a fresh install has names with the bundled voice", () => {
  expect(getSettings().names).toEqual(DEFAULT_SETTINGS.names);
  expect(hasRecordedName()).toBe(true);
  expect(recordedNames()).toEqual(DEFAULT_SETTINGS.names);
});

test("a name without any clip counts only after its clip is saved", async () => {
  await updateSettings({ names: ["ЂУРЂА"] });
  expect(hasRecordedName()).toBe(false);
  expect(recordedNames()).toEqual([]);
  await saveClip("name", "ЂУРЂА", new NodeBlob(["x"], { type: "audio/webm" }) as unknown as Blob);
  expect(hasRecordedName()).toBe(true);
  expect(recordedNames()).toEqual(["ЂУРЂА"]);
});

test("lastPrompt is per unit and reset by initSession", async () => {
  expect(lastPrompt("recognize")).toBeNull();
  setLastPrompt("recognize", "Б");
  expect(lastPrompt("recognize")).toBe("Б");
  await initSession();
  expect(lastPrompt("recognize")).toBeNull();
});
