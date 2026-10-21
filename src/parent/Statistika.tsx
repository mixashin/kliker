import { useState } from "react";
import { missed, recent, UNIT_LABELS } from "../game/stats";
import { UNITS } from "../game/types";
import { getRounds } from "../store/session";

type Range = "all" | "7d" | "today";
const RANGES: Array<{ key: Range; label: string }> = [
  { key: "all", label: "Све" },
  { key: "7d", label: "7 дана" },
  { key: "today", label: "Данас" },
];

function sinceOf(range: Range): Date | undefined {
  const now = new Date();
  if (range === "7d") return new Date(now.getTime() - 7 * 86_400_000);
  if (range === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return undefined;
}

const p2 = (n: number): string => String(n).padStart(2, "0");
function stamp(iso: string): string {
  const d = new Date(iso);
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}. ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}
const pct = (x: number): string => `${Math.round(x * 100)}%`;

export default function Statistika() {
  const [range, setRange] = useState<Range>("all");
  const rounds = getRounds();
  const { items, summary } = missed(rounds, sinceOf(range));
  const units = UNITS.filter((u) => summary[u]);
  const since = sinceOf(range)?.getTime();
  const last = recent(rounds.filter((r) => since === undefined || Date.parse(r.t) >= since), 50);

  return (
    <div className="stats">
      <div className="pills">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={r.key === range ? "active" : undefined}
            aria-pressed={r.key === range}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>
      {units.length === 0 ? (
        <p>Још нема одиграних задатака</p>
      ) : (
        <>
          <div className="stat-cards">
            {units.map((u) => {
              const s = summary[u]!;
              return (
                <div className="stat-card" key={u}>
                  <h3>{UNIT_LABELS[u]}</h3>
                  <p className="stat-big">{pct(s.accuracy)}</p>
                  <p>
                    {s.total} / ✓ {s.correct} / ✗ {s.wrong}
                  </p>
                </div>
              );
            })}
          </div>
          {units.map((u) => {
            const rows = items.filter((i) => i.unit === u && i.wrong > 0).slice(0, 10);
            if (rows.length === 0) return null;
            return (
              <section key={u}>
                <h2>{UNIT_LABELS[u]}</h2>
                <table className="missed">
                  <thead>
                    <tr>
                      <th>Задатак</th>
                      <th>Тачно</th>
                      <th>Погрешно</th>
                      <th>Грешке</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((i) => (
                      <tr key={i.prompt}>
                        <td>{i.prompt}</td>
                        <td>{i.correct}</td>
                        <td>{i.wrong}</td>
                        <td>{pct(i.errorRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
          <h2>Последњих 50 одговора</h2>
          <ul className="recent">
            {last.map((r, i) => (
              <li key={i}>
                {stamp(r.t)} {UNIT_LABELS[r.u]} {r.p} {r.c ? "✓" : "✗"}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
