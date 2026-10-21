import { useState, type ReactNode } from "react";
import Crtezi from "./Crtezi";
import Imena from "./Imena";
import LockGate from "./LockGate";
import Novcici from "./Novcici";
import Podesavanja from "./Podesavanja";
import Rezerva from "./Rezerva";
import Snimci from "./Snimci";
import Statistika from "./Statistika";

const TABS = [
  { key: "snimci", label: "Глас" },
  { key: "imena", label: "Другари" },
  { key: "statistika", label: "Напредак" },
  { key: "crtezi", label: "Цртежи" },
  { key: "novcici", label: "Новчићи" },
  { key: "rezerva", label: "Чување" },
  { key: "podesavanja", label: "Подешавања" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const panels: Record<TabKey, ReactNode> = {
  snimci: <Snimci />,
  imena: <Imena />,
  statistika: <Statistika />,
  crtezi: <Crtezi />,
  novcici: <Novcici />,
  rezerva: <Rezerva />,
  podesavanja: <Podesavanja />,
};

export default function Parent({ onExit }: { onExit: () => void }) {
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<TabKey>(TABS[0].key);

  if (!unlocked) {
    return (
      <div className="parent">
        <LockGate onUnlock={() => setUnlocked(true)} onCancel={onExit} />
      </div>
    );
  }
  return (
    <div className="parent">
      <header>
        <h1>За родитеље</h1>
        <button type="button" onClick={onExit}>
          Назад у игру
        </button>
      </header>
      <nav className="parent-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={t.key === tab ? "active" : undefined}
            aria-pressed={t.key === tab}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <section>{panels[tab]}</section>
    </div>
  );
}
