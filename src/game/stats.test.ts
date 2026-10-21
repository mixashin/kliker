import { missed, recent, UNIT_LABELS } from "./stats";
import { UNITS, type RoundRow } from "./types";

const row = (p: string, c: boolean, t: string): RoundRow => ({ u: "recognize", p, c, t });

test("missed aggregates per unit and prompt, worst first", () => {
  const rows = [
    row("Б", false, "2026-10-21T10:00:00Z"),
    row("Б", false, "2026-10-21T10:01:00Z"),
    row("Б", true, "2026-10-21T10:02:00Z"),
    row("А", true, "2026-10-21T10:03:00Z"),
    row("А", true, "2026-10-21T10:04:00Z"),
  ];
  const { items, summary } = missed(rows);
  expect(items[0].prompt).toBe("Б");
  expect(items[0].wrong).toBe(2);
  expect(items[0].errorRate).toBeCloseTo(2 / 3);
  expect(items[0].lastSeenAt).toBe("2026-10-21T10:02:00Z");
  expect(items[1].prompt).toBe("А");
  expect(summary.recognize).toEqual({ total: 5, correct: 3, wrong: 2, items: 2, accuracy: 0.6 });
  expect(summary.math).toBeUndefined();
});

test("missed honours since", () => {
  const rows = [
    row("А", false, "2026-01-01T00:00:00Z"),
    row("Б", false, "2026-10-21T00:00:00Z"),
  ];
  const { items, summary } = missed(rows, new Date("2026-06-01T00:00:00Z"));
  expect(items.map((i) => i.prompt)).toEqual(["Б"]);
  expect(summary.recognize?.total).toBe(1);
});

test("recent returns newest first and limits", () => {
  const rows = Array.from({ length: 60 }, (_, i) =>
    row("А", true, new Date(Date.UTC(2026, 9, 21, 0, i)).toISOString()),
  );
  const r = recent(rows, 50);
  expect(r).toHaveLength(50);
  expect(r[0].t).toBe(rows[59].t);
  expect(recent(rows)).toHaveLength(50);
  expect(rows[0].t < rows[59].t).toBe(true);
});

test("UNIT_LABELS covers every unit", () => {
  UNITS.forEach((u) => expect(UNIT_LABELS[u]).toMatch(/^[А-ЯЂЈЉЊЋЏ][а-яђјљњћџ \/]+$/));
});
