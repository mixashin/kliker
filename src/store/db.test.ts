import { Blob as NodeBlob } from "node:buffer";
import { beforeEach, expect, test } from "vitest";
import { DEFAULT_SETTINGS, type RoundRow } from "../game/types";
import {
  appendRound, clearAll, getClip, listClips, listDrawings, loadRounds, loadSettings,
  putClip, putDrawing, saveSettings,
} from "./db";

beforeEach(clearAll);

const row = (p: string): RoundRow => ({ u: "recognize", p, c: true, t: "2026-10-21T00:00:00.000Z" });

test("loadSettings returns defaults then the saved value", async () => {
  expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  await saveSettings({ ...DEFAULT_SETTINGS, kidName: "МАЈА" });
  expect((await loadSettings()).kidName).toBe("МАЈА");
});

test("appendRound keeps order", async () => {
  expect(await loadRounds()).toEqual([]);
  await appendRound(row("А"));
  await appendRound(row("Б"));
  const rows = await loadRounds();
  expect(rows).toHaveLength(2);
  expect(rows[1].p).toBe("Б");
});

test("clips round-trip and list", async () => {
  // jsdom Blob does not survive fake-indexeddb structuredClone; Node Blob does (real browsers keep both)
  await putClip("letter", "Б", new NodeBlob(["x"], { type: "audio/webm" }) as unknown as Blob);
  expect((await getClip("letter", "Б"))?.type).toBe("audio/webm");
  const clips = await listClips();
  expect(clips).toHaveLength(1);
  expect(clips[0].kind).toBe("letter");
  expect(clips[0].key).toBe("Б");
});

test("putDrawing prunes the oldest beyond max", async () => {
  for (let i = 0; i < 4; i++) await putDrawing("Б", new Blob(["x"]), `2026-10-21T00:00:0${i}.000Z`, 3);
  const d = await listDrawings();
  expect(d).toHaveLength(3);
  expect(d[0].at).toBe("2026-10-21T00:00:03.000Z");
  expect(d.map((x) => x.at)).not.toContain("2026-10-21T00:00:00.000Z");
});

test("clearAll empties everything", async () => {
  await saveSettings({ ...DEFAULT_SETTINGS, kidName: "МАЈА" });
  await appendRound(row("А"));
  await putClip("letter", "Б", new Blob(["x"]));
  await clearAll();
  expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  expect(await loadRounds()).toEqual([]);
  expect(await listClips()).toEqual([]);
});
