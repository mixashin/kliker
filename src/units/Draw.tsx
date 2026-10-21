import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDrawCanvas } from "../components/useDrawCanvas";
import { pickLetter } from "../game/picker";
import { playClip } from "../lib/clips";
import { preloadOcr, recognizeLetter } from "../lib/ocr";
import { putDrawing } from "../store/db";
import { getRounds, lastPrompt, setLastPrompt } from "../store/session";
import type { UnitProps } from "../App";

// Grading never blocks play: past this the drawing counts as correct, same
// policy as an OCR error. Covers a cold worker (first visit downloads the
// core and the model) and tesseract.js init paths that never settle.
const OCR_MAX_MS = 4000;

/**
 * Drawing minigame: Dad's voice says a letter, the child draws it on the
 * canvas. The bundled OCR grades the drawing. The PNG is kept either way so
 * the parent gallery sees every attempt.
 */
export default function Draw({ onAnswer, setReplayHandler }: UnitProps) {
  // Same Leitner-aware picker as the recognize unit, so weak letters get drawing practice too.
  const [target] = useState(() => pickLetter(getRounds(), lastPrompt("draw")));
  const [showTemplate, setShowTemplate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean } | null>(null);
  const { canvasRef, hasInk, handlers, clear, toBlob } = useDrawCanvas(target);
  const done = useRef(false);
  const announced = useRef(false);

  useEffect(() => {
    setLastPrompt("draw", target);
    preloadOcr().catch(() => {}); // warm the worker while she draws
    const replay = () => { playClip("letter", target); };
    setReplayHandler(replay);
    if (announced.current) return;  // StrictMode: effect runs twice, only play once
    announced.current = true;
    replay();
  }, []);

  async function submit() {
    if (done.current || !hasInk) return;
    done.current = true;
    setBusy(true);
    let ok = true;
    const c = canvasRef.current;
    if (c) {
      ok = await Promise.race([
        recognizeLetter(c, target).then((r) => r.ok, () => true), // an OCR failure never punishes the kid
        new Promise<boolean>((r) => setTimeout(() => r(true), OCR_MAX_MS)),
      ]);
    }
    setFeedback({ ok });
    const blob = await toBlob();
    if (blob) await putDrawing(target, blob).catch(() => {});
    onAnswer(ok, target);
  }

  return (
    <>
      <div className="hint">НАЦРТАЈ СЛОВО</div>

      <div className="draw-stage">
        {showTemplate && (
          <motion.div
            key="tmpl"
            className="draw-template"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {target}
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
          disabled={busy}
          aria-label="ГОТОВО"
          whileTap={{ scale: 0.92 }}
        >
          {busy ? "⏳" : "✓"}
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

      <AnimatePresence>
        {feedback && (
          <motion.div
            key="reveal"
            className={`reveal-card ${feedback.ok ? "" : "bad"}`}
            initial={{ scale: 0.2, opacity: 0, x: "-50%", y: "-50%" }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
          >
            {target}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
