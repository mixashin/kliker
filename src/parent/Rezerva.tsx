import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { applyBackup, buildBackup, parseBackup, partsOf, saveFile, type Backup, type Parts } from "../store/backup";
import { getSettings, updateSettings } from "../store/session";

const DAY = 86_400_000;
// 1 takes the singular ("пре 21 дан") except in 11 ("пре 11 дана").
const ago = (n: number) => `пре ${n} ${n % 10 === 1 && n % 100 !== 11 ? "дан" : "дана"}`;

export function lastSaved(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "никад";
  const n = Math.max(0, Math.floor((now - t) / DAY));
  return n === 0 ? "данас" : n === 1 ? "јуче" : ago(n);
}

// label: checkbox text (nominative). acc: object of "заменити" (accusative).
const SECTIONS: Array<{ key: keyof Parts; label: string; acc: string }> = [
  { key: "progress", label: "Напредак и другари", acc: "напредак и другаре" },
  { key: "clips", label: "Глас", acc: "глас" },
  { key: "drawings", label: "Цртежи", acc: "цртеже" },
];

const CONFIRM = "Упиши име детета за потврду";

export default function Rezerva() {
  const [parts, setParts] = useState<Parts>({ progress: true, clips: true, drawings: true });
  const [lastExportAt, setLastExportAt] = useState(() => getSettings().lastExportAt);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Backup | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshPersisted = () =>
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null));
  useEffect(() => {
    void refreshPersisted();
  }, []);

  async function askPersist() {
    try {
      await navigator.storage?.persist?.();
    } catch {
      // the status line below shows the outcome
    }
    await refreshPersisted();
  }

  async function exportBackup() {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const json = JSON.stringify(await buildBackup(parts));
      // sv-SE formats the local date as YYYY-MM-DD.
      const name = `kliker-${new Date().toLocaleDateString("sv-SE")}.json`;
      const saved = await saveFile(new Blob([json], { type: "application/json" }), name);
      // Only a file with the progress counts as a backup of this device.
      if (saved && parts.progress) {
        setLastExportAt((await updateSettings({ lastExportAt: new Date().toISOString() })).lastExportAt);
      }
      setStatus(saved ? "Сачувано" : "Отказано");
    } catch {
      setError("Није сачувано");
    }
    setBusy(false);
  }

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setPending(null);
    setTyped("");
    setError("");
    setStatus("");
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
    } catch (err) {
      setError(err instanceof Error && err.message === "version" ? "Фајл је из друге верзије апликације" : "Ово није Кликер фајл");
    }
  }

  async function importBackup() {
    if (!pending) return;
    setBusy(true);
    setStatus("Враћање у току…");
    try {
      await applyBackup(pending);
      location.reload();
    } catch {
      setStatus("");
      setError("Није враћено");
      setBusy(false);
    }
  }

  const kidName = getSettings().kidName;
  const confirmed = !kidName || typed.trim().toLocaleUpperCase("sr-Cyrl") === kidName.toLocaleUpperCase("sr-Cyrl");

  return (
    <div className="backup">
      <h2>Сачувај све</h2>
      <p>Последњи пут сачувано: {lastSaved(lastExportAt)}</p>
      {SECTIONS.map((s) => (
        <label key={s.key}>
          <input
            type="checkbox"
            checked={parts[s.key]}
            onChange={(e) => setParts({ ...parts, [s.key]: e.target.checked })}
          />
          {` ${s.label}`}
        </label>
      ))}
      <button
        type="button"
        disabled={busy || !SECTIONS.some((s) => parts[s.key])}
        onClick={() => void exportBackup()}
      >
        Сачувај у фајл
      </button>

      <h2>Врати из фајла</h2>
      <input ref={fileRef} type="file" accept=".json,application/json" aria-label="Фајл" hidden onChange={(e) => void pick(e)} />
      <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
        Изабери фајл
      </button>
      {pending && (
        <div className="backup-confirm">
          <p>
            Ово ће заменити на овом уређају:{" "}
            {SECTIONS.filter((s) => partsOf(pending)[s.key]).map((s) => s.acc).join(", ")}.
          </p>
          {kidName && (
            <input aria-label={CONFIRM} placeholder={CONFIRM} value={typed} onChange={(e) => setTyped(e.target.value)} />
          )}
          <button type="button" disabled={busy || !confirmed} onClick={() => void importBackup()}>
            Врати
          </button>
        </div>
      )}
      {status && <p role="status">{status}</p>}
      {error && <p role="alert">{error}</p>}

      <h2>Овај уређај</h2>
      <p>Заштићено од брисања: {persisted === null ? "непознато" : persisted ? "да" : "не"}</p>
      <p>Без заштите, уређај може сам да обрише податке кад му понестане места.</p>
      <button type="button" onClick={() => void askPersist()}>
        Заштити од брисања
      </button>
    </div>
  );
}
