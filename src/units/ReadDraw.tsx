import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDrawCanvas } from "../components/useDrawCanvas";
import { WORD_TO_SLUG } from "../data/words";
import { pickWord } from "../game/picker";
import { playClip } from "../lib/clips";
import { putDrawing } from "../store/db";
import { getRounds, lastPrompt, setLastPrompt } from "../store/session";
import type { UnitProps } from "../App";

/**
 * Read-then-draw: she reads a word (no audio, that is the work), then draws
 * the thing it names. "ПАС" → draw a dog. There is no grading: an object
 * sketch can't be OCR'd, the drawing IS the proof of comprehension and lands
 * in the parent gallery under the word. On done we speak the word and show
 * the clipart, confirming what it was.
 */
export default function ReadDraw({ onAnswer, setReplayHandler }: UnitProps) {
  const [word] = useState(() => pickWord(getRounds(), lastPrompt("readdraw")));
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { canvasRef, hasInk, handlers, clear, toBlob } = useDrawCanvas(word);
  const done = useRef(false);

  useEffect(() => {
    setLastPrompt("readdraw", word);
    // ▶ stays silent: reading the word herself is the whole point.
    setReplayHandler(() => {});
  }, []);

  async function submit() {
    if (done.current) return;
    done.current = true;
    setBusy(true);
    const blob = await toBlob();
    if (blob) await putDrawing(word, blob).catch(() => {});
    setRevealed(true);
    // Now (and only now) speak the word: confirmation, not a spoiler. Wait
    // for it so the App's praise phrase doesn't talk over it. playClip is
    // fail-soft: it never rejects and resolves at once when the clip is missing.
    await playClip("word", word);
    onAnswer(true, word);
  }

  return (
    <>
      <div className="hint">ПРОЧИТАЈ, ПА НАЦРТАЈ!</div>

      <motion.div
        className="read-prompt"
        key={word}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        aria-label={word}
      >
        {word}
      </motion.div>

      <div className="draw-stage">
        <canvas ref={canvasRef} className="draw-canvas" {...(busy ? {} : handlers)} />
      </div>

      <div className="draw-controls">
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

      <AnimatePresence>
        {revealed && (
          <motion.div
            key="reveal"
            className="reveal-card readdraw-reveal"
            initial={{ scale: 0.2, opacity: 0, x: "-50%", y: "-50%" }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
          >
            <img
              className="reveal-img"
              src={`${import.meta.env.BASE_URL}clipart/${WORD_TO_SLUG[word]}.svg`}
              alt={word}
              draggable={false}
            />
            <div className="readdraw-word">{word}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
