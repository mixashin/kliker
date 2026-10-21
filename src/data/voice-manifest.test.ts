import { existsSync } from "node:fs";
import { expect, test } from "vitest";
import { CYRILLIC } from "./letters";
import { DEFAULT_NAMES } from "./names";
import { PHRASES } from "./phrases";
import manifest from "./voice-manifest.json";
import { ALL_WORDS } from "./words";

const m: Record<string, string> = manifest;

test("the bundled voice covers every letter, phrase, word and default name", () => {
  const keys = [
    ...CYRILLIC.map((g) => `letter:${g}`),
    ...PHRASES.map((p) => `phrase:${p.tag}`),
    ...ALL_WORDS.map((w) => `word:${w}`),
    ...DEFAULT_NAMES.map((n) => `name:${n}`),
  ];
  expect(keys.filter((k) => !m[k])).toEqual([]);
});

test("every manifest file exists under public/ and paths are ASCII", () => {
  const files = Object.values(m);
  expect(files.filter((f) => !existsSync(`public/${f}`))).toEqual([]);
  expect(files.filter((f) => !/^voice\/(letter|phrase|word|name)\/[a-z0-9_-]+\.mp3$/.test(f))).toEqual([]);
});

test("default names are uppercase Cyrillic and unique", () => {
  for (const n of DEFAULT_NAMES) expect(n).toMatch(/^[А-ИК-ШЂЈЉЊЋЏ]+$/u);
  expect(new Set(DEFAULT_NAMES).size).toBe(DEFAULT_NAMES.length);
});
