import { useState, type FormEvent } from "react";
import { removeClip } from "../lib/clips";
import { getSettings, updateSettings } from "../store/session";
import Recorder from "./Recorder";

// Serbian Cyrillic letters only (no Й, Щ, Я...), words joined by one space or hyphen.
const CYRILLIC_NAME = /^[А-ИК-ШЂЈЉЊЋЏ]+(?:[ -][А-ИК-ШЂЈЉЊЋЏ]+)*$/u;

export default function Imena() {
  const [names, setNames] = useState<string[]>(() => getSettings().names);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function save(next: string[]) {
    try {
      setNames((await updateSettings({ names: next })).names);
      return true;
    } catch {
      setError("Није сачувано");
      return false;
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    const name = draft.trim().toLocaleUpperCase("sr-Cyrl");
    if (!name) return;
    const current = getSettings().names;
    if (current.includes(name) || !CYRILLIC_NAME.test(name)) return setError("Упиши ново име ћирилицом");
    setError(null);
    if (await save([...current, name])) setDraft("");
  }

  async function remove(name: string) {
    if (!(await save(getSettings().names.filter((n) => n !== name)))) return;
    try {
      await removeClip("name", name);
    } catch {
      setError("Није обрисано");
    }
  }

  return (
    <>
      <p>Имена другара која дете чује у игри. Додај име, па га сними.</p>
      <form className="names-form" onSubmit={(e) => void add(e)}>
        <input aria-label="Име" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button type="submit">Додај</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <ul className="names-list">
        {names.map((n) => (
          <li key={n}>
            {n}{" "}
            <button type="button" onClick={() => void remove(n)}>
              Обриши
            </button>
          </li>
        ))}
      </ul>
      <Recorder items={names.map((n) => ({ kind: "name", key: n, label: n }))} />
    </>
  );
}
