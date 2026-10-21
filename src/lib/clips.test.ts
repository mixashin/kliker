import { Blob as NodeBlob } from "node:buffer";
import { beforeEach, expect, test, vi } from "vitest";
import { clearAll } from "../store/db";
import { play } from "./audio";
import { clipUrl, hasClip, hasOwnClip, loadClipCache, playClip, playSequence, removeClip, saveClip } from "./clips";

vi.mock("./audio", () => ({ play: vi.fn(() => Promise.resolve()), unlockAudio: vi.fn() }));
// One bundled clip; Б stays unbundled so the recording-only tests keep their meaning.
vi.mock("../data/voice-manifest.json", () => ({ default: { "letter:Ш": "voice/letter/sh.mp3" } }));

const blob = () => new NodeBlob(["x"], { type: "audio/webm" }) as unknown as Blob;

beforeEach(async () => {
  vi.mocked(play).mockReset();
  vi.mocked(play).mockImplementation(() => Promise.resolve());
  await clearAll();
  await loadClipCache();
});

test("playClip with empty cache resolves without calling play", async () => {
  await expect(playClip("letter", "Б")).resolves.toBeUndefined();
  expect(play).not.toHaveBeenCalled();
});

test("a bundled clip plays from the app URL when no recording exists", async () => {
  expect(hasClip("letter", "Ш")).toBe(true);
  expect(hasOwnClip("letter", "Ш")).toBe(false);
  expect(clipUrl("letter", "Ш")).toBe("/voice/letter/sh.mp3");
  await playClip("letter", "Ш");
  expect(vi.mocked(play).mock.calls[0][0]).toBe("/voice/letter/sh.mp3");
});

test("a recording overrides the bundled clip; deleting it falls back", async () => {
  await saveClip("letter", "Ш", blob());
  expect(hasOwnClip("letter", "Ш")).toBe(true);
  expect(clipUrl("letter", "Ш")).toMatch(/^blob:/);
  await removeClip("letter", "Ш");
  expect(hasOwnClip("letter", "Ш")).toBe(false);
  expect(hasClip("letter", "Ш")).toBe(true);
  expect(clipUrl("letter", "Ш")).toBe("/voice/letter/sh.mp3");
});

test("saveClip updates the cache without a reload and plays via a blob url", async () => {
  await saveClip("letter", "Б", blob());
  expect(hasClip("letter", "Б")).toBe(true);
  await playClip("letter", "Б");
  expect(play).toHaveBeenCalledTimes(1);
  expect(vi.mocked(play).mock.calls[0][0]).toMatch(/^blob:/);
});

test("saved clip survives a cache reload", async () => {
  await saveClip("letter", "Б", blob());
  await loadClipCache();
  expect(hasClip("letter", "Б")).toBe(true);
});

test("removeClip drops the clip from cache and store", async () => {
  await saveClip("letter", "Б", blob());
  expect(hasClip("letter", "Б")).toBe(true);
  await removeClip("letter", "Б");
  expect(hasClip("letter", "Б")).toBe(false);
  await playClip("letter", "Б");
  expect(play).not.toHaveBeenCalled();
  await loadClipCache();
  expect(hasClip("letter", "Б")).toBe(false);
});

test("playSequence plays clips strictly one after another", async () => {
  await saveClip("letter", "Б", blob());
  await saveClip("phrase", "bravo", blob());
  const events: string[] = [];
  const resolvers: Array<() => void> = [];
  let n = 0;
  vi.mocked(play).mockImplementation((url: string) => {
    const id = ++n;
    events.push(`start${id}:${url}`);
    return new Promise<void>((resolve) => {
      resolvers.push(() => {
        events.push(`end${id}`);
        resolve();
      });
    });
  });

  const done = playSequence([["letter", "Б"], ["phrase", "bravo"]]);
  await Promise.resolve();
  await Promise.resolve();
  expect(play).toHaveBeenCalledTimes(1);

  resolvers[0]();
  await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(2));
  resolvers[1]();
  await done;

  expect(events.map((e) => e.split(":")[0])).toEqual(["start1", "end1", "start2", "end2"]);
});

test("playSequence skips a missing clip", async () => {
  await saveClip("letter", "Б", blob());
  await playSequence([["letter", "Б"], ["phrase", "bravo"]]);
  expect(play).toHaveBeenCalledTimes(1);
});

test("playClip resolves when play rejects", async () => {
  await saveClip("letter", "Б", blob());
  vi.mocked(play).mockImplementation(() => Promise.reject(new Error("boom")));
  await expect(playClip("letter", "Б")).resolves.toBeUndefined();
});

test("clipUrl creates the object url once", async () => {
  await saveClip("letter", "Б", blob());
  const spy = vi.spyOn(URL, "createObjectURL");
  try {
    const a = clipUrl("letter", "Б");
    const b = clipUrl("letter", "Б");
    expect(a).toBe(b);
    expect(spy).toHaveBeenCalledTimes(1);
  } finally {
    spy.mockRestore();
  }
});

test("removeClip revokes the object url", async () => {
  await saveClip("letter", "Б", blob());
  const url = clipUrl("letter", "Б");
  const spy = vi.spyOn(URL, "revokeObjectURL");
  try {
    await removeClip("letter", "Б");
    expect(spy).toHaveBeenCalledWith(url);
  } finally {
    spy.mockRestore();
  }
});

test("playClip resolves when createObjectURL throws", async () => {
  await saveClip("letter", "Б", blob());
  const spy = vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
    throw new Error("nope");
  });
  try {
    await expect(playClip("letter", "Б")).resolves.toBeUndefined();
    expect(play).not.toHaveBeenCalled();
  } finally {
    spy.mockRestore();
  }
});
