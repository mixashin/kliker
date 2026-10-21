import { clear, createStore, del, entries, get, set, update } from "idb-keyval";
import { DEFAULT_SETTINGS, type ClipKind, type RoundRow, type Settings } from "../game/types";

const store = createStore("kliker", "kv");

export const MAX_DRAWINGS = 300;

export const clipKey = (kind: ClipKind, key: string): string => `clip:${kind}:${key}`;

export async function loadSettings(): Promise<Settings> {
  const stored = await get<Partial<Settings>>("settings", store);
  return { ...DEFAULT_SETTINGS, ...stored, opening: { ...DEFAULT_SETTINGS.opening, ...stored?.opening } };
}

export const saveSettings = (s: Settings): Promise<void> => set("settings", s, store);

export async function loadRounds(): Promise<RoundRow[]> {
  return (await get<RoundRow[]>("rounds", store)) ?? [];
}

export const appendRound = (r: RoundRow): Promise<void> =>
  update<RoundRow[]>("rounds", (rows) => [...(rows ?? []), r], store);

export const replaceRounds = (rows: RoundRow[]): Promise<void> => set("rounds", rows, store);

export const putClip = (kind: ClipKind, key: string, blob: Blob): Promise<void> =>
  set(clipKey(kind, key), blob, store);

export const getClip = (kind: ClipKind, key: string): Promise<Blob | undefined> =>
  get<Blob>(clipKey(kind, key), store);

export const deleteClip = (kind: ClipKind, key: string): Promise<void> => del(clipKey(kind, key), store);

export async function listClips(): Promise<Array<{ kind: ClipKind; key: string; blob: Blob }>> {
  const out: Array<{ kind: ClipKind; key: string; blob: Blob }> = [];
  for (const [k, blob] of await entries<IDBValidKey, Blob>(store)) {
    if (typeof k !== "string" || !k.startsWith("clip:")) continue;
    const i = k.indexOf(":", 5);
    out.push({ kind: k.slice(5, i) as ClipKind, key: k.slice(i + 1), blob });
  }
  return out;
}

export type Drawing = { id: string; target: string; at: string; blob: Blob };

type DrawingValue = { target: string; at: string; blob: Blob };

export async function listDrawings(): Promise<Drawing[]> {
  const out: Drawing[] = [];
  for (const [k, v] of await entries<IDBValidKey, DrawingValue>(store)) {
    if (typeof k === "string" && k.startsWith("draw:")) out.push({ id: k, ...v });
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export async function putDrawing(
  target: string,
  blob: Blob,
  at: string = new Date().toISOString(),
  max: number = MAX_DRAWINGS,
): Promise<void> {
  await set(`draw:${at}`, { target, at, blob }, store);
  const all = await listDrawings();
  await Promise.all(all.slice(max).map((d) => del(d.id, store)));
}

export const deleteDrawing = (id: string): Promise<void> => del(id, store);

export const clearAll = (): Promise<void> => clear(store);
