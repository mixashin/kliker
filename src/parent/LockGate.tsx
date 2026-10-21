import { useState } from "react";
import { makeGate } from "./lock";

export default function LockGate({
  onUnlock,
  onCancel,
}: {
  onUnlock: () => void;
  onCancel: () => void;
}) {
  const [gate, setGate] = useState(() => makeGate());
  const [value, setValue] = useState("");

  const submit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (gate.check(value)) {
      onUnlock();
    } else {
      setValue("");
      setGate(makeGate());
    }
  };

  return (
    <form className="lock-gate" onSubmit={submit}>
      <p>{`Колико је ${gate.a} × ${gate.b}?`}</p>
      <input
        inputMode="numeric"
        aria-label="Одговор"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit">Потврди</button>
      <button type="button" onClick={onCancel}>
        Назад
      </button>
    </form>
  );
}
