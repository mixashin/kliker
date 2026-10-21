import { describe, it, expect } from "vitest";
import { UNIT_WEIGHTS, pickNextUnit } from "./units";

describe("unit pool", () => {
  it("has 11 entries summing to 101", () => {
    expect(UNIT_WEIGHTS).toHaveLength(11);
    expect(UNIT_WEIGHTS.reduce((s, [, w]) => s + w, 0)).toBe(101);
  });

  it("never returns prev", () => {
    for (let i = 0; i < 300; i++) {
      expect(pickNextUnit("recognize", true)).not.toBe("recognize");
    }
  });

  it("never returns drawname when hasNames is false", () => {
    for (let i = 0; i < 300; i++) {
      expect(pickNextUnit("recognize", false)).not.toBe("drawname");
    }
  });

  it("rand = 0 returns the first weighted entry that is not prev", () => {
    expect(pickNextUnit("recognize", true, () => 0)).toBe("counting");
    expect(pickNextUnit("counting", true, () => 0)).toBe("recognize");
  });
});
