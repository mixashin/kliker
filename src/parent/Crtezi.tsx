import { useEffect, useMemo, useState } from "react";
import { deleteDrawing, listDrawings, type Drawing } from "../store/db";

const p2 = (n: number): string => String(n).padStart(2, "0");
function stamp(iso: string): string {
  const d = new Date(iso);
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}. ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

export default function Crtezi() {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void listDrawings().then((d) => {
      if (!alive) return;
      setDrawings(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // One object URL per drawing, revoked when the drawing leaves the list or on unmount.
  const urls = useMemo(() => new Map(drawings.map((d) => [d.id, URL.createObjectURL(d.blob)])), [drawings]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const counts = new Map<string, number>();
  for (const d of drawings) counts.set(d.target, (counts.get(d.target) ?? 0) + 1);
  const shown = filter === null ? drawings : drawings.filter((d) => d.target === filter);
  const open = drawings.find((d) => d.id === openId) ?? null;

  async function remove(id: string) {
    await deleteDrawing(id);
    setDrawings((ds) => ds.filter((d) => d.id !== id));
    setOpenId(null);
  }

  if (!loading && drawings.length === 0) return <p>Још нема цртежа</p>;
  return (
    <div className="gallery">
      <div className="pills">
        <button type="button" className={filter === null ? "active" : undefined} aria-pressed={filter === null} onClick={() => setFilter(null)}>
          Сви ({drawings.length})
        </button>
        {[...counts].map(([t, n]) => (
          <button key={t} type="button" className={filter === t ? "active" : undefined} aria-pressed={filter === t} onClick={() => setFilter(t)}>
            {t} ({n})
          </button>
        ))}
      </div>
      <div className="gallery-grid">
        {shown.map((d) => (
          <button key={d.id} type="button" className="thumb" onClick={() => setOpenId(d.id)}>
            <img src={urls.get(d.id)} alt={d.target} />
          </button>
        ))}
      </div>
      {open && (
        <div className="lightbox" role="dialog" aria-label="Цртеж">
          <img src={urls.get(open.id)} alt={open.target} />
          <p>
            {open.target} {stamp(open.at)}
          </p>
          <button type="button" onClick={() => void remove(open.id)}>
            Обриши
          </button>{" "}
          <button type="button" onClick={() => setOpenId(null)}>
            Затвори
          </button>
        </div>
      )}
    </div>
  );
}
