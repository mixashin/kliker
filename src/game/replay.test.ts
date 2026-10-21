import { replay } from "./replay";
import { DEFAULT_SETTINGS, type RoundRow, type Unit } from "./types";

const s = { ...DEFAULT_SETTINGS, seededAt: "2026-10-20T00:00:00.000Z" };
const row = (c: boolean, t: string, u: Unit = "recognize"): RoundRow => ({ u, p: "A", c, t });
const stamp = (i: number) => `2026-10-21T00:${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}.000Z`;
const correct = (n: number) => Array.from({ length: n }, (_, i) => row(true, stamp(i)));

test("ten correct fill the bar into one rainbow", () => {
  const c = replay(correct(10), s);
  expect(c).toMatchObject({ rainbows: 1, barFill: 0, streak: 10, bestStreak: 10 });
});

test("a wrong answer resets bar and streak but not bestStreak", () => {
  const c = replay([...correct(3), row(false, stamp(3))], s);
  expect(c).toMatchObject({ barFill: 0, streak: 0, bestStreak: 3 });
});

test("ten rainbows become one coin", () => {
  const c = replay(correct(100), s);
  expect(c).toMatchObject({ rainbows: 0, coins: 1 });
});

test("rows at or before seededAt count only for totalCorrect", () => {
  const rows = Array.from({ length: 10 }, (_, i) => row(true, `2026-10-19T00:00:${String(i).padStart(2, "0")}.000Z`));
  const c = replay(rows, s);
  expect(c).toMatchObject({ rainbows: 0, barFill: 0, streak: 0, coins: 0, totalCorrect: 10, lastAt: rows[9].t });
});

test("opening balances and redeemed apply", () => {
  const c = replay([], { ...s, opening: { coins: 8, rainbows: 7, bestStreak: 42, totalCorrect: 1696 }, redeemed: 2 });
  expect(c).toMatchObject({ coins: 6, rainbows: 7, bestStreak: 42, totalCorrect: 1696, lastAt: null });
});

test("opening rainbows carry into the coin", () => {
  const c = replay(correct(30), { ...s, opening: { ...s.opening, rainbows: 7 } });
  expect(c).toMatchObject({ rainbows: 0, coins: 1 });
});
