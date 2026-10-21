import { DEFAULT_NAMES } from "../data/names";

export type Unit =
  | "recognize" | "leftright" | "counting" | "countscene" | "math" | "whack"
  | "rain" | "draw" | "drawname" | "read" | "readdraw";

export const UNITS: Unit[] = [
  "recognize", "leftright", "counting", "countscene", "math", "whack",
  "rain", "draw", "drawname", "read", "readdraw",
];

export type RoundRow = { u: Unit; p: string; c: boolean; t: string };

export type ClipKind = "letter" | "phrase" | "name" | "word";

export type Settings = {
  kidName: string;
  names: string[];
  seededAt: string;
  opening: { coins: number; rainbows: number; bestStreak: number; totalCorrect: number };
  redeemed: number;
  lastExportAt: string;
};

export const DEFAULT_SETTINGS: Settings = {
  kidName: "",
  names: [...DEFAULT_NAMES],
  seededAt: "",
  opening: { coins: 0, rainbows: 0, bestStreak: 0, totalCorrect: 0 },
  redeemed: 0,
  lastExportAt: "",
};
