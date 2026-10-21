import type { RoundRow, Settings } from "./types";

export const BAR_MAX = 10;
export const RAINBOWS_PER_COIN = 10;

export type Counters = {
  barFill: number;
  streak: number;
  rainbows: number;
  coins: number;
  bestStreak: number;
  totalCorrect: number;
  lastAt: string | null;
};

export function replay(rounds: readonly RoundRow[], settings: Settings): Counters {
  const { opening, seededAt, redeemed } = settings;
  let barFill = 0;
  let streak = 0;
  let earned = 0;
  let bestStreak = opening.bestStreak;
  let correctRows = 0;

  for (const r of rounds) {
    if (r.c) correctRows++;
    if (r.t <= seededAt) continue;
    if (r.c) {
      streak++;
      bestStreak = Math.max(bestStreak, streak);
      if (++barFill >= BAR_MAX) {
        earned++;
        barFill = 0;
      }
    } else {
      barFill = 0;
      streak = 0;
    }
  }

  const totalRainbows = opening.rainbows + earned;
  return {
    barFill,
    streak,
    rainbows: totalRainbows % RAINBOWS_PER_COIN,
    coins: opening.coins + Math.floor(totalRainbows / RAINBOWS_PER_COIN) - redeemed,
    bestStreak,
    totalCorrect: opening.totalCorrect + correctRows,
    lastAt: rounds.length ? rounds[rounds.length - 1].t : null,
  };
}
