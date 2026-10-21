import wordlist from "./wordlist.json";

export type Word = { cyrillic: string; slug: string; gloss: string };

export const WORDS: Word[] = wordlist;
export const ALL_WORDS: string[] = WORDS.map((w) => w.cyrillic);
export const WORD_TO_SLUG: Record<string, string> = Object.fromEntries(
  WORDS.map((w) => [w.cyrillic, w.slug]),
);
