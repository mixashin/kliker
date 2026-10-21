import type { Unit } from "./types";

export const UNIT_WEIGHTS: Array<[Unit, number]> = [
  ["recognize", 16],
  ["counting", 10],
  ["countscene", 12],
  ["math", 14],
  ["whack", 10],
  ["rain", 8],
  ["read", 12],
  ["readdraw", 8],
  ["draw", 6],
  ["drawname", 3],
  ["leftright", 2],
];

function pickWeighted<T>(pairs: Array<[T, number]>, exclude: T, rand: () => number): T {
  const pool = pairs.filter(([t]) => t !== exclude);
  const list = pool.length ? pool : pairs;
  const total = list.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of list) {
    r -= w;
    if (r <= 0) return v;
  }
  return list[list.length - 1][0];
}

export function pickNextUnit(prev: Unit, hasNames: boolean, rand: () => number = Math.random): Unit {
  const base = hasNames ? UNIT_WEIGHTS : UNIT_WEIGHTS.filter(([u]) => u !== "drawname");
  return pickWeighted(base, prev, rand);
}
