import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playClip } from "../lib/clips";
import { lastPrompt, setLastPrompt } from "../store/session";
import type { UnitProps } from "../App";

const SIDES = ["levo", "desno"] as const;
type Side = typeof SIDES[number];

const LABEL: Record<Side, string> = { levo: "ЛЕВО", desno: "ДЕСНО" };

export default function LeftRight({ onAnswer, setReplayHandler }: UnitProps) {
  const [target] = useState<Side>(() => {
    const last = lastPrompt("leftright");
    const pool = SIDES.filter((s) => s !== last);
    return pool[Math.floor(Math.random() * pool.length)];
  });
  const [picked, setPicked] = useState<Side | null>(null);
  const busy = useRef(false);
  const announced = useRef(false);

  useEffect(() => {
    setLastPrompt("leftright", target);
    const replay = () => { playClip("phrase", target); };
    setReplayHandler(replay);
    // Guard: React StrictMode runs effects twice in dev. Without this the
    // prompt audio would play twice on every mount.
    if (announced.current) return;
    announced.current = true;
    replay();
  }, [target]);

  function choose(side: Side) {
    if (busy.current) return;
    busy.current = true;
    setPicked(side);
    onAnswer(side === target, target);
  }

  const reveal = picked !== null;
  const ok = picked === target;

  return (
    <>
      <div className="hint">КУДА?</div>
      <div className="lr-choices">
        {SIDES.map((side) => {
          const isPicked = picked === side;
          const isAnswer = side === target;
          return (
            <motion.button
              key={side}
              className={`lr-card ${isPicked ? (isAnswer ? "good" : "bad") : ""}`}
              aria-label={LABEL[side]}
              onClick={() => choose(side)}
              whileTap={{ scale: 0.95 }}
              animate={
                reveal && !isPicked
                  ? { opacity: 0.25, scale: 1 }
                  : { opacity: 1, scale: 1 }
              }
              transition={{ duration: 0.3 }}
            >
              <Arrow dir={side} />
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
            <Arrow dir={target} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Chevron arrow drawn on a 100x100 viewBox so it is always centered
// independent of font metrics. Color via currentColor.
function Arrow({ dir }: { dir: Side }) {
  const d = dir === "levo"
    ? "M65 18 L30 50 L65 82"
    : "M35 18 L70 50 L35 82";
  return (
    <svg viewBox="0 0 100 100" aria-hidden focusable="false">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={14}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
