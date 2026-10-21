import { makeGate } from "./lock";

describe("makeGate", () => {
  it("rand 0 gives 2 x 2 and checks the answer", () => {
    const g = makeGate(() => 0);
    expect(g.a).toBe(2);
    expect(g.b).toBe(2);
    expect(g.check("4")).toBe(true);
    expect(g.check(" 4 ")).toBe(true);
    expect(g.check("5")).toBe(false);
    expect(g.check("4a")).toBe(false);
    expect(g.check("")).toBe(false);
  });

  it("random digits stay within 2..9", () => {
    for (let i = 0; i < 100; i++) {
      const g = makeGate();
      expect(g.a).toBeGreaterThanOrEqual(2);
      expect(g.a).toBeLessThanOrEqual(9);
      expect(g.b).toBeGreaterThanOrEqual(2);
      expect(g.b).toBeLessThanOrEqual(9);
    }
  });

  it("rand near 1 gives 9 x 9", () => {
    const g = makeGate(() => 0.999);
    expect(g.a).toBe(9);
    expect(g.b).toBe(9);
  });
});
