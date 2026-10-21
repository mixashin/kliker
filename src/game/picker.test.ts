import { CYRILLIC } from "../data/letters";
import { ALL_WORDS } from "../data/words";
import type { RoundRow } from "./types";
import {
  effectiveBox,
  letterDistractors,
  mastery,
  pickItem,
  pickLetter,
  pickWord,
  wordDistractors,
  type Mastery,
} from "./picker";

const now = new Date("2026-10-21T00:00:00Z");
const today = "2026-10-21T00:00:00Z";
const row = (p: string, c: boolean, t: string, u: RoundRow["u"] = "recognize"): RoundRow => ({ u, p, c, t });

test("mastery replays boxes per unit", () => {
  const rounds: RoundRow[] = [
    row("Б", true, "2026-10-01T00:00:00Z"),
    row("Б", true, "2026-10-02T00:00:00Z"),
    row("Б", true, "2026-10-03T00:00:00Z"),
    row("Б", true, "2026-10-04T00:00:00Z", "read"),
  ];
  const m1 = mastery(rounds, "recognize", CYRILLIC);
  expect(m1.get("Б")).toEqual({ box: 4, lastSeenAt: "2026-10-03T00:00:00Z", correct: 3, wrong: 0 });
  expect(m1.get("Ж")).toEqual({ box: 1, lastSeenAt: null, correct: 0, wrong: 0 });
  rounds.push(row("Б", false, "2026-10-05T00:00:00Z"));
  expect(mastery(rounds, "recognize", CYRILLIC).get("Б")).toEqual({
    box: 1, lastSeenAt: "2026-10-05T00:00:00Z", correct: 3, wrong: 1,
  });
  expect(mastery(rounds, "read", ["Б"]).get("Б")?.correct).toBe(1);
});

test("effectiveBox decays one box per 14 days", () => {
  expect(effectiveBox({ box: 5, lastSeenAt: "2026-09-21T00:00:00Z", correct: 0, wrong: 0 }, now)).toBe(3);
  expect(effectiveBox({ box: 5, lastSeenAt: "2026-05-01T00:00:00Z", correct: 0, wrong: 0 }, now)).toBe(1);
  expect(effectiveBox({ box: 2, lastSeenAt: null, correct: 0, wrong: 0 }, now)).toBe(2);
});

test("pickItem never repeats the last item", () => {
  const mast = mastery([], "recognize", ["А", "Б"]);
  for (let i = 0; i < 50; i++) expect(pickItem(["А", "Б"], mast, "А", now, Math.random)).toBe("Б");
});

test("pickItem prefers weak items", () => {
  const mast = new Map<string, Mastery>([
    ["А", { box: 1, lastSeenAt: today, correct: 0, wrong: 1 }],
    ["Б", { box: 5, lastSeenAt: today, correct: 5, wrong: 0 }],
  ]);
  for (let i = 0; i < 20; i++) expect(pickItem(["А", "Б"], mast, null, now, () => 0.9)).toBe("А");
});

test("pickItem draws a fresh item at NEW_ITEM_RATIO", () => {
  const mast = new Map<string, Mastery>([
    ["А", { box: 1, lastSeenAt: today, correct: 0, wrong: 1 }],
    ["Б", { box: 1, lastSeenAt: null, correct: 0, wrong: 0 }],
  ]);
  expect(pickItem(["А", "Б"], mast, null, now, () => 0.1)).toBe("Б");
  expect(pickItem(["А", "Б"], mast, null, now, () => 0.3)).toBe("А");
});

test("letterDistractors gives 3 unique letters without the target", () => {
  const d = letterDistractors("А");
  expect(d).toHaveLength(3);
  expect(new Set(d).size).toBe(3);
  expect(d).not.toContain("А");
  expect(d.every((x) => CYRILLIC.includes(x))).toBe(true);
});

test("pickLetter, pickWord and wordDistractors work on the real pools", () => {
  expect(CYRILLIC).toContain(pickLetter([], "А", now, () => 0.5));
  expect(pickLetter([], "А", now, () => 0.5)).not.toBe("А");
  expect(ALL_WORDS).toContain(pickWord([], null, now, () => 0.5));
  const d = wordDistractors(ALL_WORDS[0]);
  expect(d).toHaveLength(3);
  expect(d).not.toContain(ALL_WORDS[0]);
});
