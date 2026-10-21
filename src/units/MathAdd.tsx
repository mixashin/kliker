import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NUMBER_TAGS } from "../data/numbers";
import { playSequence } from "../lib/clips";
import { pickDistractors, shuffle } from "../lib/random";
import { lastPrompt, setLastPrompt } from "../store/session";
import type { UnitProps } from "../App";

// Occasional sums past 10. Addends always stay <= 9 so the spoken equation
// uses only the 0..9 number clips. Only the answer goes above 10 (and the
// answer is a button, never spoken).
const BIG_SUM_MIN = 10;
const BIG_SUM_MAX = 15;
const BIG_SUM_CHANCE = 0.25;
const POOL = Array.from({ length: BIG_SUM_MAX + 1 }, (_, i) => i);

function rollEquation(): { a: number; b: number; target: number } {
  if (Math.random() < BIG_SUM_CHANCE) {
    // Big round: target 10..15. a >= target-9 keeps b = target-a within 1..9.
    const target = BIG_SUM_MIN + Math.floor(Math.random() * (BIG_SUM_MAX - BIG_SUM_MIN + 1));
    const aMin = target - 9;
    const a = aMin + Math.floor(Math.random() * (9 - aMin + 1));
    return { a, b: target - a, target };
  }
  // A in 1..5, B in 1..min(5, 9-a). Both addends >= 1 so no trivial "X + 0"
  // equations and no empty apple group. Sum capped at 9.
  const a = 1 + Math.floor(Math.random() * 5);
  const maxB = Math.min(5, 9 - a);    // a in 1..5 -> maxB in 4..5, so always >= 1
  const b = 1 + Math.floor(Math.random() * maxB);
  return { a, b, target: a + b };
}

// "a+b" -> a+b. No previous prompt -> -1 (never a real sum).
function lastSum(): number {
  const p = lastPrompt("math");
  return p === null ? -1 : p.split("+").reduce((s, x) => s + Number(x), 0);
}

export default function MathAdd({ onAnswer, setReplayHandler }: UnitProps) {
  const [{ a, b, target, choices }] = useState(() => {
    // Reroll up to 5 times if we would repeat the previous answer.
    const last = lastSum();
    let eq = rollEquation();
    for (let i = 0; i < 5 && eq.target === last; i++) eq = rollEquation();

    // 3 distractors from 0..BIG_SUM_MAX, near (within 2 of target) first,
    // far only when not enough near. Near-preference keeps small-sum rounds
    // from showing absurdly large decoys.
    const distractors = pickDistractors(eq.target, POOL, 3, undefined, (v) => Math.abs(v - eq.target) <= 2);
    return { ...eq, choices: shuffle([eq.target, ...distractors]) };
  });

  const [picked, setPicked] = useState<number | null>(null);
  const busy = useRef(false);
  const announced = useRef(false);

  // Read the equation aloud: "<a> плус <b>". Missing clips are skipped.
  useEffect(() => {
    setLastPrompt("math", `${a}+${b}`);
    const replay = () => {
      playSequence([["phrase", NUMBER_TAGS[a]], ["phrase", "plus"], ["phrase", NUMBER_TAGS[b]]]);
    };
    setReplayHandler(replay);
    if (announced.current) return;  // StrictMode: effect runs twice, only play once
    announced.current = true;
    replay();
  }, [a, b]);

  function choose(n: number) {
    if (busy.current) return;
    busy.current = true;
    setPicked(n);
    onAnswer(n === target, `${a}+${b}`);
  }

  const reveal = picked !== null;
  const ok = picked === target;

  return (
    <>
      <div className="hint">КОЛИКО ЈЕ ЗАЈЕДНО?</div>
      <div className="math-row">
        <div className="math-group">
          {Array.from({ length: a }, (_, i) => (
            <motion.span
              key={i}
              className="math-apple"
              initial={{ scale: 0, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 320, damping: 18 }}
            >🍎</motion.span>
          ))}
        </div>
        <div className="math-op">+</div>
        <div className="math-group">
          {Array.from({ length: b }, (_, i) => (
            <motion.span
              key={i}
              className="math-apple"
              initial={{ scale: 0, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06, type: "spring", stiffness: 320, damping: 18 }}
            >🍎</motion.span>
          ))}
        </div>
        <div className="math-op">=</div>
        <div className="math-q">?</div>
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
