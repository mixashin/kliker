import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NUMBER_TAGS } from "../data/numbers";
import { playClip } from "../lib/clips";
import { pickDistractors, shuffle } from "../lib/random";
import { lastPrompt, setLastPrompt } from "../store/session";
import type { UnitProps } from "../App";

const ITEM_EMOJI = ["🌸", "🐝", "🍓", "⭐️", "🦋", "🍎", "🍒", "🐞"];
const COUNT_MIN = 1;
const COUNT_MAX = 9;
// Occasionally count past 10. Capped at 15: the emoji row wraps to two lines
// and stays countable. Beyond that a 5yo loses track.
const BIG_MIN = 10;
const BIG_MAX = 15;
const BIG_CHANCE = 0.25;
const POOL = Array.from({ length: BIG_MAX - COUNT_MIN + 1 }, (_, i) => COUNT_MIN + i);

export default function Counting({ onAnswer, setReplayHandler }: UnitProps) {
  const [{ target, choices, emoji }] = useState(() => {
    const last = parseInt(lastPrompt("counting") ?? "0", 10);
    const big = Math.random() < BIG_CHANCE;
    const [lo, hi] = big ? [BIG_MIN, BIG_MAX] : [COUNT_MIN, COUNT_MAX];
    const range = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    const pool = range.filter((n) => n !== last);
    const target = pool[Math.floor(Math.random() * pool.length)];
    // 3 distractors near target (within 2) so wrong answers stay challenging.
    // Far values only fill in when there are not enough near candidates.
    const distractors = pickDistractors(target, POOL, 3, undefined, (v) => Math.abs(v - target) <= 2);
    return {
      target,
      choices: shuffle([target, ...distractors]),
      emoji: ITEM_EMOJI[Math.floor(Math.random() * ITEM_EMOJI.length)],
    };
  });
  const [picked, setPicked] = useState<number | null>(null);
  const busy = useRef(false);
  const announced = useRef(false);

  useEffect(() => {
    setLastPrompt("counting", String(target));
    const replay = () => { playClip("phrase", NUMBER_TAGS[target]); };
    setReplayHandler(replay);
    if (announced.current) return;  // StrictMode: effect runs twice, only play once
    announced.current = true;
    replay();
  }, [target]);

  function choose(n: number) {
    if (busy.current) return;
    busy.current = true;
    setPicked(n);
    onAnswer(n === target, String(target));
  }

  const reveal = picked !== null;
  const ok = picked === target;

  return (
    <>
      <div className="hint">КОЛИКО?</div>
      <div className="count-row">
        {Array.from({ length: target }, (_, i) => (
          <motion.span
            key={i}
            className="count-emoji"
            initial={{ scale: 0, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 320, damping: 18 }}
          >
            {emoji}
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
