import { pickDistractors, shuffle } from "./random";

test("shuffle keeps every element", () => {
  expect([...shuffle([1, 2, 3, 4], () => 0.5)].sort()).toEqual([1, 2, 3, 4]);
});
test("pickDistractors excludes target and prefers near", () => {
  const pool = Array.from({ length: 16 }, (_, i) => i);
  const r = pickDistractors(5, pool, 3, () => 0.1, (v) => Math.abs(v - 5) <= 2);
  expect(r).toHaveLength(3); expect(r).not.toContain(5); expect(new Set(r).size).toBe(3);
  r.forEach((v) => expect(Math.abs(v - 5)).toBeLessThanOrEqual(2));
});
test("pickDistractors fills from far when near is short", () => {
  expect(pickDistractors(0, [0, 1, 2, 10, 11], 3, () => 0.1, (v) => v <= 2)).toHaveLength(3);
});
