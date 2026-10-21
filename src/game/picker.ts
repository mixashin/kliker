import { CYRILLIC } from "../data/letters";
import { ALL_WORDS } from "../data/words";
import { pickDistractors } from "../lib/random";
import type { RoundRow } from "./types";

export const WEAK_BOX_THRESHOLD = 3;
export const NEW_ITEM_RATIO = 0.2;
export const DECAY_DAYS = 14;

export type Mastery = { box: number; lastSeenAt: string | null; correct: number; wrong: number };

export function mastery(
  rounds: readonly RoundRow[],
  unit: "recognize" | "read",
  items: readonly string[],
): Map<string, Mastery> {
  const m = new Map<string, Mastery>(
    items.map((i) => [i, { box: 1, lastSeenAt: null, correct: 0, wrong: 0 }]),
  );
  for (const r of rounds) {
    const e = r.u === unit ? m.get(r.p) : undefined;
    if (!e) continue;
    if (r.c) {
      e.box = Math.min(5, e.box + 1);
      e.correct++;
    } else {
      e.box = 1;
      e.wrong++;
    }
    e.lastSeenAt = r.t;
  }
  return m;
}

export function effectiveBox(m: Mastery, now: Date): number {
  if (m.lastSeenAt === null) return m.box;
  const days = Math.max(0, (now.getTime() - Date.parse(m.lastSeenAt)) / 86_400_000);
  return Math.max(1, m.box - Math.floor(days / DECAY_DAYS));
}

export function pickItem(
  items: readonly string[],
  mast: Map<string, Mastery>,
  last: string | null,
  now: Date,
  rand: () => number,
): string {
  const cands = items.filter((i) => i !== last);
  if (cands.length === 0) return items[0];
  const get = (i: string): Mastery => mast.get(i) ?? { box: 1, lastSeenAt: null, correct: 0, wrong: 0 };
  const fresh = cands.filter((i) => get(i).lastSeenAt === null);
  if (fresh.length > 0 && rand() < NEW_ITEM_RATIO) {
    return fresh[Math.min(fresh.length - 1, Math.floor(rand() * fresh.length))];
  }
  const boxOf = (i: string) => effectiveBox(get(i), now);
  const weak = cands.filter((i) => boxOf(i) <= WEAK_BOX_THRESHOLD);
  const pool = weak.length > 0 ? weak : cands;
  const weights = pool.map((i) => Math.max(1, 6 - boxOf(i)));
  let x = rand() * weights.reduce((a, b) => a + b, 0);
  for (let k = 0; k < pool.length; k++) {
    x -= weights[k];
    if (x < 0) return pool[k];
  }
  return pool[pool.length - 1];
}

export function pickLetter(
  rounds: readonly RoundRow[],
  last: string | null,
  now: Date = new Date(),
  rand: () => number = Math.random,
): string {
  return pickItem(CYRILLIC, mastery(rounds, "recognize", CYRILLIC), last, now, rand);
}

export function pickWord(
  rounds: readonly RoundRow[],
  last: string | null,
  now: Date = new Date(),
  rand: () => number = Math.random,
): string {
  return pickItem(ALL_WORDS, mastery(rounds, "read", ALL_WORDS), last, now, rand);
}

export function letterDistractors(target: string, rand: () => number = Math.random): string[] {
  return pickDistractors(target, CYRILLIC, 3, rand);
}

export function wordDistractors(target: string, rand: () => number = Math.random): string[] {
  return pickDistractors(target, ALL_WORDS, 3, rand);
}
