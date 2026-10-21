import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playClip } from "../lib/clips";
import { pickDistractors, shuffle } from "../lib/random";
import { lastPrompt, setLastPrompt } from "../store/session";
import type { UnitProps } from "../App";

/**
 * Count-the-scene minigame: a mixed scene of two object kinds. The question
 * asks how many of the TARGET kind there are ("Колико птица?"). Counting one
 * kind while ignoring the other trains selective attention on top of plain
 * counting, a step up from the Counting unit's uniform emoji row.
 *
 * The question is both SHOWN (big pulsing emoji chip in the prompt) and
 * SPOKEN with Dad's recorded `koliko_*` phrase when it exists.
 */

// slug goes into round log prompts (`<slug>:<n>`) so the parent stats page
// shows which kind she was counting. `tag` matches PHRASES in data/phrases.ts.
// `q` is the same question as text.
const KINDS = [
  { emoji: "🐦", slug: "ptica", tag: "koliko_ptica",   q: "КОЛИКО ПТИЦА?" },
  { emoji: "🐶", slug: "kuca",  tag: "koliko_kuca",    q: "КОЛИКО КУЦА?" },
  { emoji: "🐱", slug: "maca",  tag: "koliko_maca",    q: "КОЛИКО МАЦА?" },
  { emoji: "🧒", slug: "dete",  tag: "koliko_dece",    q: "КОЛИКО ДЕЦЕ?" },
  { emoji: "🐠", slug: "riba",  tag: "koliko_riba",    q: "КОЛИКО РИБА?" },
  { emoji: "🦆", slug: "patka", tag: "koliko_pataka",  q: "КОЛИКО ПАТАКА?" },
  { emoji: "🐰", slug: "zeka",  tag: "koliko_zeka",    q: "КОЛИКО ЗЕКА?" },
  { emoji: "🌷", slug: "cvet",  tag: "koliko_cvetova", q: "КОЛИКО ЦВЕТОВА?" },
];

// Targets stay small: scattered objects mixed with decoys are much harder to
// count than a clean row, so 2..7 is the right band at 4-5yo. Big numbers
// (10-15) live in the Counting unit where items sit in an orderly row.
const TARGET_MIN = 2;
const TARGET_MAX = 7;
const DECOY_MIN = 2;
const DECOY_MAX = 6;
const POOL = Array.from({ length: 9 }, (_, i) => i + 1);

type SceneItem = { emoji: string; rot: number; dy: number };

export default function CountScene({ onAnswer, setReplayHandler }: UnitProps) {
  const [{ target, kind, items, choices }] = useState(() => {
    // Prompt is "<slug>:<n>". Anti-repeat on the number only.
    const last = parseInt(lastPrompt("countscene")?.split(":")[1] ?? "0", 10);
    const range = Array.from(
      { length: TARGET_MAX - TARGET_MIN + 1 },
      (_, i) => TARGET_MIN + i,
    ).filter((n) => n !== last);
    const target = range[Math.floor(Math.random() * range.length)];

    const [kind, decoyKind] = shuffle(KINDS).slice(0, 2);
    // Decoy count != target count, so counting the wrong kind can never
    // accidentally produce the right answer.
    let decoys = DECOY_MIN + Math.floor(Math.random() * (DECOY_MAX - DECOY_MIN + 1));
    if (decoys === target) decoys = decoys === DECOY_MAX ? decoys - 1 : decoys + 1;

    const items: SceneItem[] = shuffle([
      ...Array.from({ length: target }, () => kind.emoji),
      ...Array.from({ length: decoys }, () => decoyKind.emoji),
    ]).map((emoji) => ({
      emoji,
      rot: (Math.random() - 0.5) * 24,
      dy: (Math.random() - 0.5) * 14,
    }));

    // 3 distractor numbers near the target (within 2), far fills the gap.
    const distractors = pickDistractors(target, POOL, 3, undefined, (v) => Math.abs(v - target) <= 2);
    return { target, kind, items, choices: shuffle([target, ...distractors]) };
  });

  const [picked, setPicked] = useState<number | null>(null);
  const busy = useRef(false);
  const announced = useRef(false);

  useEffect(() => {
    setLastPrompt("countscene", `${kind.slug}:${target}`);
    const replay = () => { playClip("phrase", kind.tag); };
    setReplayHandler(replay);
    if (announced.current) return; // StrictMode double-run guard
    announced.current = true;
    replay();
  }, []);

  function choose(n: number) {
    if (busy.current) return;
    busy.current = true;
    setPicked(n);
    onAnswer(n === target, `${kind.slug}:${target}`);
  }

  const reveal = picked !== null;
  const ok = picked === target;

  return (
    <>
      <div className="hint">
        КОЛИКО{" "}
        <motion.span
          className="cscene-kind"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          {kind.emoji}
        </motion.span>
        ?
      </div>
      <div className="cscene">
        {items.map((it, i) => (
          <motion.span
            key={i}
            className="cscene-item"
            style={{ rotate: it.rot, y: it.dy }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 320, damping: 18 }}
          >
            {it.emoji}
          </motion.span>
        ))}
      </div>
      <div className="choices">
        {choices.map((n) => {
          const isAnswer = n === target;
          const isPicked = picked === n;
          return (
            <motion.button
              key={n}
              className={`letter-card ${isPicked ? (isAnswer ? "good" : "bad") : ""}`}
              onClick={() => choose(n)}
              whileTap={{ scale: 0.95 }}
              animate={
                reveal && isAnswer
                  ? { opacity: 0, scale: 0.6 }
                  : reveal && !isAnswer
                  ? { opacity: 0.25 }
                  : { opacity: 1 }
              }
              transition={{ duration: 0.3 }}
            >
              {n}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {reveal && (
          <motion.div
            key="reveal"
            className={`reveal-card ${ok ? "" : "bad"}`}
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
