import { DEFAULT_SETTINGS, UNITS, type ClipKind, type RoundRow, type Settings } from "../game/types";
import {
  deleteClip, deleteDrawing, listClips, listDrawings, loadRounds, loadSettings, putClip, putDrawing, replaceRounds,
  saveSettings,
} from "./db";

export const BACKUP_VERSION = 1;

// Every section is optional: a file carries only the parts chosen at export, and an import
// replaces only the parts the file carries. `settings` and `rounds` travel together as "progress".
export type Backup = {
  version: 1;
  exportedAt: string;
  settings?: Settings;
  rounds?: RoundRow[];
  clips?: Array<{ kind: ClipKind; key: string; mime: string; b64: string }>;
  drawings?: Array<{ target: string; at: string; mime: string; b64: string }>;
};

export type Parts = { progress: boolean; clips: boolean; drawings: boolean };

export const partsOf = (b: Backup): Parts => ({
  progress: b.rounds !== undefined,
  clips: b.clips !== undefined,
  drawings: b.drawings !== undefined,
});

const CLIP_KINDS: ClipKind[] = ["letter", "phrase", "name", "word"];

export async function blobToB64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  // Slices keep fromCharCode under the engine's argument limit on 40 MB inputs.
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function b64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function buildBackup(parts: Parts): Promise<Backup> {
  const exportedAt = new Date().toISOString();
  const b: Backup = { version: BACKUP_VERSION, exportedAt };
  if (parts.progress) {
    // R21: a device restored from this file counts days from this backup.
    b.settings = { ...(await loadSettings()), lastExportAt: exportedAt };
    b.rounds = await loadRounds();
  }
  if (parts.clips) {
    b.clips = [];
    for (const c of await listClips()) {
      b.clips.push({ kind: c.kind, key: c.key, mime: c.blob.type || "application/octet-stream", b64: await blobToB64(c.blob) });
    }
  }
  if (parts.drawings) {
    b.drawings = [];
    for (const d of await listDrawings()) {
      b.drawings.push({ target: d.target, at: d.at, mime: d.blob.type || "image/png", b64: await blobToB64(d.blob) });
    }
  }
  return b;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const strs = (o: Obj, ...keys: string[]) => keys.every((k) => typeof o[k] === "string");
const oneOf = (list: readonly string[], v: unknown) => typeof v === "string" && list.includes(v);
const listOf = (v: unknown, ok: (o: Obj) => boolean) => Array.isArray(v) && v.every((x) => isObj(x) && ok(x));
// Every field present has the default's type (missing fields come from the defaults).
const fits = (def: object, o: Obj) =>
  Object.entries(def).every(
    ([k, v]) => o[k] === undefined || (typeof o[k] === typeof v && Array.isArray(o[k]) === Array.isArray(v)),
  );
const shape = () => new Error("shape");
// Round times sort as strings, so they must all be ISO UTC like toISOString().
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export function parseBackup(text: string): Backup {
  let o: unknown;
  try {
    o = JSON.parse(text);
  } catch {
    throw shape();
  }
  if (!isObj(o)) throw shape();
  if (o.version !== BACKUP_VERSION) throw new Error("version");
  const { settings, rounds, clips, drawings } = o;
  if ((settings === undefined) !== (rounds === undefined)) throw shape();
  if (settings === undefined && clips === undefined && drawings === undefined) throw shape();
  const b: Backup = { version: BACKUP_VERSION, exportedAt: typeof o.exportedAt === "string" ? o.exportedAt : "" };
  if (settings !== undefined) {
    if (!isObj(settings) || !fits(DEFAULT_SETTINGS, settings)) throw shape();
    const opening = settings.opening ?? {};
    if (!isObj(opening) || !fits(DEFAULT_SETTINGS.opening, opening)) throw shape();
    if (Array.isArray(settings.names) && !settings.names.every((n: unknown) => typeof n === "string")) throw shape();
    const roundOk = (r: Obj) =>
      oneOf(UNITS, r.u) && strs(r, "p", "t") && ISO_UTC.test(r.t as string) && typeof r.c === "boolean";
    if (!listOf(rounds, roundOk)) throw shape();
    b.settings = { ...DEFAULT_SETTINGS, ...settings, opening: { ...DEFAULT_SETTINGS.opening, ...opening } } as Settings;
    b.rounds = rounds as RoundRow[];
  }
  if (clips !== undefined) {
    if (!listOf(clips, (c) => oneOf(CLIP_KINDS, c.kind) && strs(c, "key", "mime", "b64"))) throw shape();
    b.clips = clips as Backup["clips"];
  }
  if (drawings !== undefined) {
    if (!listOf(drawings, (d) => strs(d, "target", "at", "mime", "b64"))) throw shape();
    b.drawings = drawings as Backup["drawings"];
  }
  return b;
}

// Replaces, on this device, only the sections the file carries.
export async function applyBackup(b: Backup): Promise<void> {
  // Decode before any write, so a corrupt payload fails while the old data is still there.
  const clips = b.clips?.map((c) => ({ ...c, blob: b64ToBlob(c.b64, c.mime) }));
  // Oldest first, so putDrawing's pruning keeps the newest.
  const drawings = b.drawings
    ?.slice()
    .sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0))
    .map((d) => ({ ...d, blob: b64ToBlob(d.b64, d.mime) }));
  // ponytail: deletes + writes are separate IDB transactions; a quota error midway leaves a partial
  // restore. One readwrite transaction in db.ts if that ever bites.
  if (b.settings && b.rounds) {
    await saveSettings(b.settings);
    await replaceRounds(b.rounds);
  }
  if (clips) {
    for (const c of await listClips()) await deleteClip(c.kind, c.key);
    for (const c of clips) await putClip(c.kind, c.key, c.blob);
  }
  if (drawings) {
    for (const d of await listDrawings()) await deleteDrawing(d.id);
    for (const d of drawings) await putDrawing(d.target, d.blob, d.at);
  }
}

type SaveFilePicker = (opts: {
  suggestedName: string;
  types?: Array<{ description?: string; accept: Record<string, string[]> }>;
}) => Promise<{ createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }> }>;

const domError = (e: unknown, ...names: string[]) => e instanceof DOMException && names.includes(e.name);

export async function saveFile(blob: Blob, name: string): Promise<boolean> {
  const picker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  let h: Awaited<ReturnType<SaveFilePicker>> | null = null;
  if (picker) {
    try {
      h = await picker({ suggestedName: name, types: [{ description: "ДАТОТЕКА", accept: { "application/json": [".json"] } }] });
    } catch (e) {
      if (domError(e, "AbortError")) return false;
      // The picker needs a recent tap and a slow buildBackup can outlive it: use the download link instead.
      if (!domError(e, "SecurityError", "NotAllowedError")) throw e;
    }
  }
  if (h) {
    const w = await h.createWritable();
    await w.write(blob);
    await w.close();
    return true;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  // Revoking right after click can cancel a large download that has not started reading yet.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
