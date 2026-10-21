import { Blob as NodeBlob } from "node:buffer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { DEFAULT_SETTINGS, type RoundRow } from "../game/types";
import { applyBackup, b64ToBlob, blobToB64, buildBackup, parseBackup, partsOf, saveFile } from "./backup";
import {
  clearAll, listClips, listDrawings, loadRounds, loadSettings, putClip, putDrawing, replaceRounds, saveSettings,
} from "./db";

// fake-indexeddb clones with Node structuredClone, which keeps Node Blobs but not jsdom ones,
// so b64ToBlob must build Node Blobs here (real browsers keep both).
vi.stubGlobal("Blob", NodeBlob);

type Picker = { showSaveFilePicker?: unknown };

beforeEach(clearAll);
afterEach(() => {
  delete (window as Picker).showSaveFilePicker;
  vi.restoreAllMocks();
});

const nodeBlob = (bytes: number[], type: string) => new NodeBlob([new Uint8Array(bytes)], { type }) as unknown as Blob;
const row = (p: string, c: boolean): RoundRow => ({ u: "recognize", p, c, t: "2026-10-21T00:00:00.000Z" });
const ALL = { progress: true, clips: true, drawings: true };

test("round-trip restores settings, rounds, clips and drawings", async () => {
  await saveSettings({ ...DEFAULT_SETTINGS, kidName: "МАЈА", names: ["АНА"], lastExportAt: "2026-10-01T00:00:00.000Z" });
  await replaceRounds([row("А", true), row("Б", false)]);
  await putClip("letter", "Б", nodeBlob([1, 2, 3, 255], "audio/webm"));
  await putDrawing("Б", nodeBlob([137, 80, 78, 71], "image/png"), "2026-10-21T00:00:00.000Z");

  const built = await buildBackup(ALL);
  expect(partsOf(built)).toEqual(ALL);
  expect(built.settings?.lastExportAt).toBe(built.exportedAt);
  const text = JSON.stringify(built);
  await clearAll();
  await applyBackup(parseBackup(text));

  const s = await loadSettings();
  expect(s.kidName).toBe("МАЈА");
  expect(s.names).toEqual(["АНА"]);
  expect(s.lastExportAt).toBe(built.exportedAt);
  expect(await loadRounds()).toHaveLength(2);
  const clips = await listClips();
  expect(clips).toHaveLength(1);
  expect(clips[0].blob.type).toBe("audio/webm");
  expect([...new Uint8Array(await clips[0].blob.arrayBuffer())]).toEqual([1, 2, 3, 255]);
  const drawings = await listDrawings();
  expect(drawings).toHaveLength(1);
  expect(drawings[0].at).toBe("2026-10-21T00:00:00.000Z");
  expect(drawings[0].blob.type).toBe("image/png");
});

test("drawings are left out when not requested", async () => {
  await putDrawing("Б", nodeBlob([1], "image/png"), "2026-10-21T00:00:00.000Z");
  expect((await buildBackup({ ...ALL, drawings: false })).drawings).toBeUndefined();
});

test("a clips-only export carries no settings, rounds or drawings", async () => {
  await saveSettings({ ...DEFAULT_SETTINGS, kidName: "МАЈА" });
  await replaceRounds([row("А", true)]);
  await putClip("letter", "Б", nodeBlob([1], "audio/webm"));
  await putDrawing("Б", nodeBlob([1], "image/png"), "2026-10-21T00:00:00.000Z");
  const b = await buildBackup({ progress: false, clips: true, drawings: false });
  expect(partsOf(b)).toEqual({ progress: false, clips: true, drawings: false });
  expect(b.settings).toBeUndefined();
  expect(b.rounds).toBeUndefined();
  expect(b.drawings).toBeUndefined();
  expect(b.clips).toHaveLength(1);
});

test("a clip with an empty type exports application/octet-stream", async () => {
  await putClip("letter", "Б", nodeBlob([1], ""));
  expect((await buildBackup({ ...ALL, drawings: false })).clips?.[0].mime).toBe("application/octet-stream");
});

test("parseBackup accepts a file with only clips", () => {
  const b = parseBackup(JSON.stringify({ version: 1, clips: [{ kind: "letter", key: "А", mime: "audio/webm", b64: "AQ==" }] }));
  expect(partsOf(b)).toEqual({ progress: false, clips: true, drawings: false });
  expect(b.settings).toBeUndefined();
});

test("parseBackup rejects unknown versions and bad shapes", () => {
  const ok = { version: 1, exportedAt: "", settings: {}, rounds: [], clips: [] };
  const bad = (o: object) => () => parseBackup(JSON.stringify({ ...ok, ...o }));
  expect(() => parseBackup('{"version":2}')).toThrow("version");
  expect(() => parseBackup('{"version":1}')).toThrow("shape");
  expect(() => parseBackup('{"version":1,"settings":{}}')).toThrow("shape");
  expect(() => parseBackup('{"version":1,"rounds":[]}')).toThrow("shape");
  expect(() => parseBackup("not json")).toThrow("shape");
  expect(bad({ rounds: [{ u: "recognize", p: "А", c: "yes", t: "" }] })).toThrow("shape");
  expect(bad({ rounds: [{ u: "nope", p: "А", c: true, t: "" }] })).toThrow("shape");
  expect(bad({ rounds: [{ u: "recognize", p: "А", c: true, t: "2026-05-07 18:41:12" }] })).toThrow("shape");
  expect(bad({ clips: [{ kind: "song", key: "А", mime: "", b64: "" }] })).toThrow("shape");
  expect(bad({ drawings: [{ target: "А", at: "" }] })).toThrow("shape");
  expect(bad({ settings: null })).toThrow("shape");
  expect(bad({ settings: { kidName: 5 } })).toThrow("shape");
  expect(bad({ settings: { names: [1] } })).toThrow("shape");
  expect(bad({ settings: { opening: { coins: "3" } } })).toThrow("shape");
});

test("parseBackup fills settings fields missing from older files", () => {
  const b = parseBackup(JSON.stringify({ version: 1, settings: { kidName: "МАЈА", opening: { coins: 3 } }, rounds: [], clips: [] }));
  expect(b.settings).toEqual({ ...DEFAULT_SETTINGS, kidName: "МАЈА", opening: { ...DEFAULT_SETTINGS.opening, coins: 3 } });
});

test("applying a clips-only file replaces clips and keeps the rest", async () => {
  await saveSettings({ ...DEFAULT_SETTINGS, kidName: "МАЈА" });
  await replaceRounds([row("А", true)]);
  await putClip("letter", "А", nodeBlob([1], "audio/webm"));
  await putClip("name", "АНА", nodeBlob([2], "audio/webm"));
  await putDrawing("Б", nodeBlob([3], "image/png"), "2026-10-21T00:00:00.000Z");

  await applyBackup(parseBackup(JSON.stringify({ version: 1, clips: [{ kind: "letter", key: "Б", mime: "audio/webm", b64: "BA==" }] })));

  expect((await loadSettings()).kidName).toBe("МАЈА");
  expect(await loadRounds()).toHaveLength(1);
  expect(await listDrawings()).toHaveLength(1);
  const clips = await listClips();
  expect(clips.map((c) => `${c.kind}:${c.key}`)).toEqual(["letter:Б"]);
});

test("applying a progress-only file keeps clips and drawings", async () => {
  await putClip("letter", "А", nodeBlob([1], "audio/webm"));
  await putDrawing("Б", nodeBlob([3], "image/png"), "2026-10-21T00:00:00.000Z");
  await applyBackup(parseBackup(JSON.stringify({ version: 1, settings: { kidName: "МАЈА" }, rounds: [row("А", true)] })));
  expect((await loadSettings()).kidName).toBe("МАЈА");
  expect(await loadRounds()).toHaveLength(1);
  expect(await listClips()).toHaveLength(1);
  expect(await listDrawings()).toHaveLength(1);
});

test("a bad clip payload leaves existing data untouched", async () => {
  await saveSettings({ ...DEFAULT_SETTINGS, kidName: "МАЈА" });
  const b = parseBackup(
    JSON.stringify({ version: 1, settings: {}, rounds: [], clips: [{ kind: "letter", key: "А", mime: "", b64: "!!" }] }),
  );
  await expect(applyBackup(b)).rejects.toThrow();
  expect((await loadSettings()).kidName).toBe("МАЈА");
});

test("saveFile: cancel resolves false, a write error rejects", async () => {
  const w = window as Picker;
  w.showSaveFilePicker = vi.fn().mockRejectedValue(new DOMException("x", "AbortError"));
  await expect(saveFile(nodeBlob([1], "application/json"), "a.json")).resolves.toBe(false);
  const write = vi.fn().mockRejectedValue(new Error("disk"));
  w.showSaveFilePicker = vi.fn(async () => ({ createWritable: async () => ({ write, close: async () => {} }) }));
  await expect(saveFile(nodeBlob([1], "application/json"), "a.json")).rejects.toThrow("disk");
});

test("saveFile falls back to a download link when the picker lost the tap", async () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  for (const name of ["SecurityError", "NotAllowedError"]) {
    (window as Picker).showSaveFilePicker = vi.fn().mockRejectedValue(new DOMException("x", name));
    await expect(saveFile(nodeBlob([1], "application/json"), "a.json")).resolves.toBe(true);
  }
  expect(click).toHaveBeenCalledTimes(2);
});

test("saveFile writes through the picker", async () => {
  const write = vi.fn(async () => {});
  const close = vi.fn(async () => {});
  const picker = vi.fn(async () => ({ createWritable: async () => ({ write, close }) }));
  (window as Picker).showSaveFilePicker = picker;
  const blob = nodeBlob([1], "application/json");
  await expect(saveFile(blob, "a.json")).resolves.toBe(true);
  expect(picker).toHaveBeenCalledWith(expect.objectContaining({ suggestedName: "a.json" }));
  expect(write).toHaveBeenCalledWith(blob);
  expect(close).toHaveBeenCalledTimes(1);
});

test("saveFile falls back to a download link", async () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  await expect(saveFile(nodeBlob([1], "application/json"), "a.json")).resolves.toBe(true);
  expect(click).toHaveBeenCalledTimes(1);
});

test("blobToB64 and b64ToBlob round-trip 100 000 random bytes", async () => {
  const bytes = Uint8Array.from({ length: 100_000 }, () => Math.floor(Math.random() * 256));
  const back = b64ToBlob(await blobToB64(nodeBlob([...bytes], "")), "application/octet-stream");
  expect(back.type).toBe("application/octet-stream");
  expect(new Uint8Array(await back.arrayBuffer())).toEqual(bytes);
});
