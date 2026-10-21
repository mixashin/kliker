import manifest from "../data/voice-manifest.json";
import type { ClipKind } from "../game/types";
import { clipKey, deleteClip, listClips, putClip } from "../store/db";
import { play } from "./audio";

type Entry = { blob: Blob; url: string | null };

const cache = new Map<string, Entry>();

// The bundled default voice (public/voice, precached). A recording for the same item wins.
const BUNDLED: Record<string, string> = manifest;
const bundledUrl = (kind: ClipKind, key: string): string | null => {
  const file = BUNDLED[`${kind}:${key}`];
  return file ? `${import.meta.env.BASE_URL}${file}` : null;
};

const revoke = (e: Entry | undefined): void => {
  if (e?.url) URL.revokeObjectURL(e.url);
};

export async function loadClipCache(): Promise<void> {
  const clips = await listClips();
  for (const e of cache.values()) revoke(e);
  cache.clear();
  for (const c of clips) cache.set(clipKey(c.kind, c.key), { blob: c.blob, url: null });
}

/** A recording made on this device exists (the recorder's view). */
export const hasOwnClip = (kind: ClipKind, key: string): boolean => cache.has(clipKey(kind, key));

/** Something plays for this item: a recording or the bundled voice (the game's view). */
export const hasClip = (kind: ClipKind, key: string): boolean =>
  hasOwnClip(kind, key) || bundledUrl(kind, key) !== null;

export function clipUrl(kind: ClipKind, key: string): string | null {
  const e = cache.get(clipKey(kind, key));
  if (!e) return bundledUrl(kind, key);
  e.url ??= URL.createObjectURL(e.blob);
  return e.url;
}

export async function saveClip(kind: ClipKind, key: string, blob: Blob): Promise<void> {
  await putClip(kind, key, blob);
  revoke(cache.get(clipKey(kind, key)));
  cache.set(clipKey(kind, key), { blob, url: null });
}

export async function removeClip(kind: ClipKind, key: string): Promise<void> {
  await deleteClip(kind, key);
  revoke(cache.get(clipKey(kind, key)));
  cache.delete(clipKey(kind, key));
}

// Fail-soft: a missing or broken clip never blocks the game and never rejects.
export async function playClip(kind: ClipKind, key: string): Promise<void> {
  try {
    const url = clipUrl(kind, key);
    if (url) await play(url);
  } catch {
    /* fail soft */
  }
}

export async function playSequence(items: Array<[ClipKind, string]>): Promise<void> {
  for (const [kind, key] of items) await playClip(kind, key);
}
