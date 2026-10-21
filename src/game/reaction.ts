import { NUMBER_TAGS } from "../data/numbers";
import { playClip } from "../lib/clips";
import { pickDistractors } from "../lib/random";
import { letterDistractors, pickLetter } from "./picker";
import type { RoundRow } from "./types";

export type Game = { kind: "num" | "letter"; target: string; decoys: string[] };

const POOL = Array.from({ length: 15 }, (_, i) => i + 1);

export function rollNumberGame(rand: () => number = Math.random): Game {
  const big = rand() < 0.25;
  const target = big ? 10 + Math.floor(rand() * 6) : 1 + Math.floor(rand() * 9);
  const decoys = pickDistractors(target, POOL, 5, rand, (v) => Math.abs(v - target) <= 2).map(String);
  return { kind: "num", target: String(target), decoys };
}

export function rollLetterGame(
  rounds: readonly RoundRow[],
  last: string | null,
  rand: () => number = Math.random,
): Game {
  const t = pickLetter(rounds, last, undefined, rand);
  return { kind: "letter", target: t, decoys: letterDistractors(t, rand) };
}

export function announce(g: Game): Promise<void> {
  return g.kind === "num"
    ? playClip("phrase", NUMBER_TAGS[parseInt(g.target, 10)])
    : playClip("letter", g.target);
}
