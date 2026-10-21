import { beforeEach, describe, expect, it, vi } from "vitest";
import { CYRILLIC } from "../data/letters";
import { NUMBER_TAGS } from "../data/numbers";
import { playClip } from "../lib/clips";
import { announce, rollLetterGame, rollNumberGame } from "./reaction";

vi.mock("../lib/clips", () => ({ playClip: vi.fn(async () => {}) }));

beforeEach(() => vi.mocked(playClip).mockClear());

describe("rollNumberGame", () => {
  it("target 1..15, 5 unique decoys in 1..15 without the target", () => {
    for (let i = 0; i < 200; i++) {
      const g = rollNumberGame();
      const t = Number(g.target);
      expect(g.kind).toBe("num");
      expect(t).toBeGreaterThanOrEqual(1);
      expect(t).toBeLessThanOrEqual(15);
      expect(g.decoys).toHaveLength(5);
      expect(new Set(g.decoys).size).toBe(5);
      expect(g.decoys).not.toContain(g.target);
      for (const d of g.decoys) {
        expect(Number(d)).toBeGreaterThanOrEqual(1);
        expect(Number(d)).toBeLessThanOrEqual(15);
      }
    }
  });

  it("rand controls big or small", () => {
    const big = Number(rollNumberGame(() => 0.1).target);
    expect(big).toBeGreaterThanOrEqual(10);
    expect(big).toBeLessThanOrEqual(15);
    const small = Number(rollNumberGame(() => 0.9).target);
    expect(small).toBeGreaterThanOrEqual(1);
    expect(small).toBeLessThanOrEqual(9);
  });
});

describe("rollLetterGame", () => {
  it("letter target, 3 unique decoys without the target", () => {
    const g = rollLetterGame([], null);
    expect(g.kind).toBe("letter");
    expect(CYRILLIC).toContain(g.target);
    expect(g.decoys).toHaveLength(3);
    expect(new Set(g.decoys).size).toBe(3);
    expect(g.decoys).not.toContain(g.target);
  });
});

describe("announce", () => {
  it("plays the number phrase", async () => {
    await announce({ kind: "num", target: "7", decoys: [] });
    expect(playClip).toHaveBeenCalledWith("phrase", NUMBER_TAGS[7]);
  });
  it("plays the letter clip", async () => {
    await announce({ kind: "letter", target: "Ж", decoys: [] });
    expect(playClip).toHaveBeenCalledWith("letter", "Ж");
  });
});
