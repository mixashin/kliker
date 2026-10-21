import type { RoundRow, Unit } from "./types";

export type MissedItem = {
  unit: Unit;
  prompt: string;
  total: number;
  correct: number;
  wrong: number;
  errorRate: number;
  lastSeenAt: string;
};

export type UnitSummary = { total: number; correct: number; wrong: number; items: number; accuracy: number };

export const UNIT_LABELS: Record<Unit, string> = {
  recognize: "Слова",
  leftright: "Лево / десно",
  counting: "Бројање",
  countscene: "Сцена",
  math: "Сабирање",
  whack: "Кртице",
  rain: "Киша",
  draw: "Цртање слова",
  drawname: "Цртање имена",
  read: "Читање",
  readdraw: "Читај и цртај",
};

export function missed(
  rounds: readonly RoundRow[],
  since?: Date,
): { items: MissedItem[]; summary: Partial<Record<Unit, UnitSummary>> } {
  const min = since?.getTime();
  const map = new Map<string, MissedItem>();
  const summary: Partial<Record<Unit, UnitSummary>> = {};
  for (const r of rounds) {
    if (min !== undefined && Date.parse(r.t) < min) continue;
    const key = `${r.u}\u0000${r.p}`;
    let it = map.get(key);
    const isNew = !it;
    if (!it) {
      it = { unit: r.u, prompt: r.p, total: 0, correct: 0, wrong: 0, errorRate: 0, lastSeenAt: r.t };
      map.set(key, it);
    }
    it.total++;
    if (r.c) it.correct++; else it.wrong++;
    if (r.t > it.lastSeenAt) it.lastSeenAt = r.t;
    const s = (summary[r.u] ??= { total: 0, correct: 0, wrong: 0, items: 0, accuracy: 0 });
    s.total++;
    if (r.c) s.correct++; else s.wrong++;
    if (isNew) s.items++;
  }
  for (const s of Object.values(summary)) s.accuracy = s.correct / s.total;
  const items = [...map.values()];
  for (const it of items) it.errorRate = it.wrong / it.total;
  items.sort((a, b) => b.wrong - a.wrong || b.errorRate - a.errorRate || b.total - a.total);
  return { items, summary };
}

export function recent(rounds: readonly RoundRow[], limit = 50): RoundRow[] {
  return rounds.slice().reverse().slice(0, limit);
}
