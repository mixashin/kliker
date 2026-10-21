import { useEffect, useRef } from "react";
import { LOCK_PRESS_MS } from "./lock";

// Long press only: a tap does nothing, so the child never lands in parent mode.
export default function ParentIcon() {
  const timer = useRef<number | undefined>(undefined);
  const clear = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
  };
  useEffect(() => clear, []);
  return (
    <button
      type="button"
      className="parent-icon"
      aria-label="За родитеље"
      onPointerDown={() => {
        clear();
        timer.current = window.setTimeout(() => {
          timer.current = undefined;
          location.hash = "#/parent";
        }, LOCK_PRESS_MS);
      }}
      onPointerUp={clear}
      onPointerCancel={clear}
      onPointerLeave={clear}
      onContextMenu={(e) => e.preventDefault()}
    >
      ⚙
    </button>
  );
}
