import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useDrawCanvas } from "../components/useDrawCanvas";
import { playClip } from "../lib/clips";
import { putDrawing } from "../store/db";
import { lastPrompt, recordedNames, setLastPrompt } from "../store/session";
import type { UnitProps } from "../App";

/**
 * Friend / family name drawing unit. Same canvas + faint-template + checkmark
 * pattern as Draw, but the prompt is a multi-letter name. Only names with a
 * recorded clip are in the pool. Names are not graded.
 */
export default function DrawName({ onAnswer, setReplayHandler }: UnitProps) {
  // Pick from the recorded pool, avoiding the immediate previous name.
  const [name] = useState<string | null>(() => {
    const pool = recordedNames();
    const fresh = pool.filter((n) => n !== lastPrompt("drawname"));
    const from = fresh.length ? fresh : pool;
    return from.length ? from[Math.floor(Math.random() * from.length)] : null;
  });
  const [showTemplate, setShowTemplate] = useState(false);
  const [busy, setBusy] = useState(false);
  const { canvasRef, hasInk, handlers, clear, toBlob } = useDrawCanvas(name);
  const done = useRef(false);
  const announced = useRef(false);

  useEffect(() => {
    if (!name) {
      // Safety net: App mounts DrawName only when a name is recorded.
      if (done.current) return;
      done.current = true;
      onAnswer(true, "(no-names)");
      return;
    }
    setLastPrompt("drawname", name);
    const replay = () => { playClip("name", name); };
    setReplayHandler(replay);
    if (announced.current) return;  // StrictMode: effect runs twice, only play once
    announced.current = true;
    replay();
  }, []);

  async function submit() {
    if (done.current || !name || !hasInk) return;
    done.current = true;
    setBusy(true);
    const blob = await toBlob();
    if (blob) await putDrawing(name, blob).catch(() => {});
    onAnswer(true, name);
  }

  if (!name) return null;

  return (
    <>
      <div className="hint">НАПИШИ ИМЕ</div>

      <div className="draw-stage draw-stage-wide">
        {showTemplate && (
          <motion.div
            key="tmpl"
            className="draw-template draw-template-name"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {name}
          </motion.div>
        )}
        <canvas ref={canvasRef} className="draw-canvas" {...(busy ? {} : handlers)} />
      </div>

      <div className="draw-controls">
        <motion.button
          className="draw-side-btn"
          onClick={() => setShowTemplate((v) => !v)}
          aria-label={showTemplate ? "САКРИЈ ПРИМЕР" : "ПОКАЖИ ПРИМЕР"}
          whileTap={{ scale: 0.92 }}
        >
          {showTemplate ? "🙈" : "👁"}
        </motion.button>

        <motion.button
          className="draw-done-btn"
          onClick={submit}
          disabled={busy || !hasInk}
          aria-label="ГОТОВО"
          whileTap={{ scale: 0.92 }}
        >
          ✓
        </motion.button>

        <motion.button
          className="draw-side-btn"
          onClick={clear}
          disabled={!hasInk || busy}
          aria-label="ОБРИШИ"
          whileTap={{ scale: 0.92 }}
        >
          🧽
        </motion.button>
      </div>
    </>
  );
}
