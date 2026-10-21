import { useState } from "react";
import type { Settings } from "../game/types";
import { getSettings, resetProgress, updateSettings } from "../store/session";

const FIELDS = [
  ["coins", "Новчићи на почетку"],
  ["rainbows", "Дуге на почетку"],
  ["bestStreak", "Најдужи низ на почетку"],
  ["totalCorrect", "Тачних одговора на почетку"],
  ["redeemed", "Уновчено"],
] as const;

const CONFIRM = "Упиши име детета за потврду";

type Nums = Record<(typeof FIELDS)[number][0], string>;

const toNums = (s: Settings): Nums => ({
  coins: String(s.opening.coins),
  rainbows: String(s.opening.rainbows),
  bestStreak: String(s.opening.bestStreak),
  totalCorrect: String(s.opening.totalCorrect),
  redeemed: String(s.redeemed),
});

// Non-negative integer, else the old value.
const num = (v: string, old: number): number => (/^\d{1,9}$/.test(v.trim()) ? Number(v) : old);

const upper = (s: string) => s.trim().toLocaleUpperCase("sr-Cyrl");

export default function Podesavanja() {
  const [saved, setSaved] = useState(getSettings);
  const [name, setName] = useState(saved.kidName);
  const [nums, setNums] = useState(() => toNums(saved));
  const [resetting, setResetting] = useState(false);
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function load(s: Settings) {
    setSaved(s);
    setName(s.kidName);
    setNums(toNums(s));
  }

  async function save() {
    setError("");
    // A confirm opened for the old name must not survive a name change.
    setResetting(false);
    setTyped("");
    try {
      const o = saved.opening;
      load(
        await updateSettings({
          kidName: upper(name),
          opening: {
            coins: num(nums.coins, o.coins),
            rainbows: num(nums.rainbows, o.rainbows),
            bestStreak: num(nums.bestStreak, o.bestStreak),
            totalCorrect: num(nums.totalCorrect, o.totalCorrect),
          },
          redeemed: num(nums.redeemed, saved.redeemed),
        }),
      );
      setStatus("Сачувано");
    } catch {
      setError("Није сачувано");
    }
  }

  async function reset() {
    setError("");
    try {
      await resetProgress();
      setResetting(false);
      setTyped("");
      load(getSettings());
      setStatus("Напредак је обрисан");
    } catch {
      setError("Није обрисано");
    }
  }

  return (
    <div className="settings">
      <label>
        Име детета
        <input aria-label="Име детета" className="kid-name" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {FIELDS.map(([k, label]) => (
        <label key={k}>
          {label}
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={nums[k]}
            onChange={(e) => {
              const v = e.target.value;
              setNums((n) => ({ ...n, [k]: v }));
            }}
          />
        </label>
      ))}
      <button type="button" onClick={() => void save()}>
        Сачувај
      </button>

      <h2>Напредак</h2>
      <button type="button" disabled={!saved.kidName} onClick={() => setResetting(true)}>
        Обриши сав напредак
      </button>
      {resetting && (
        <div className="settings-confirm">
          <input aria-label={CONFIRM} placeholder={CONFIRM} value={typed} onChange={(e) => setTyped(e.target.value)} />
          <button type="button" disabled={!saved.kidName || upper(typed) !== upper(saved.kidName)} onClick={() => void reset()}>
            Да, обриши
          </button>
          <button type="button" onClick={() => setResetting(false)}>
            Одустани
          </button>
        </div>
      )}
      {status && <p role="status">{status}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
