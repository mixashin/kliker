import { replay, type Counters } from "../game/replay";
import { DEFAULT_SETTINGS, type RoundRow, type Settings, type Unit } from "../game/types";
import { hasClip, loadClipCache } from "../lib/clips";
import { appendRound, loadRounds, loadSettings, replaceRounds, saveSettings } from "./db";

let settings: Settings = DEFAULT_SETTINGS;
let rounds: RoundRow[] = [];
let cached: Counters = replay(rounds, settings);
let lastPrompts: Partial<Record<Unit, string>> = {};

const recompute = (): void => {
  cached = replay(rounds, settings);
};

export async function initSession(): Promise<void> {
  settings = await loadSettings();
  rounds = await loadRounds();
  await loadClipCache();
  lastPrompts = {};
  recompute();
}

export const getSettings = (): Settings => settings;

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const next: Settings = {
    ...settings,
    ...patch,
    opening: patch.opening ? { ...settings.opening, ...patch.opening } : settings.opening,
  };
  await saveSettings(next);
  settings = next;
  recompute();
  return settings;
}

export const getRounds = (): readonly RoundRow[] => rounds;

export const counters = (): Counters => cached;

export async function recordRound(
  u: Unit,
  p: string,
  c: boolean,
  t: string = new Date().toISOString(),
): Promise<Counters> {
  const row: RoundRow = { u, p, c, t };
  rounds.push(row);
  recompute();
  await appendRound(row);
  return cached;
}

export const lastPrompt = (u: Unit): string | null => lastPrompts[u] ?? null;

export const setLastPrompt = (u: Unit, p: string): void => {
  lastPrompts[u] = p;
};

export const recordedNames = (): string[] => settings.names.filter((n) => hasClip("name", n));

export const hasRecordedName = (): boolean => recordedNames().length > 0;

export async function redeemCoin(): Promise<Counters> {
  if (cached.coins <= 0) return cached;
  await updateSettings({ redeemed: settings.redeemed + 1 });
  return cached;
}

// Spec C16: fold current counters into the opening balance, then clear the log.
export async function resetProgress(): Promise<void> {
  const c = cached;
  await updateSettings({
    opening: { coins: c.coins, rainbows: c.rainbows, bestStreak: c.bestStreak, totalCorrect: c.totalCorrect },
    redeemed: 0,
    seededAt: new Date().toISOString(),
  });
  rounds = [];
  await replaceRounds([]);
  lastPrompts = {};
  recompute();
}
