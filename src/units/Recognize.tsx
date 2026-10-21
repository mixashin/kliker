import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { letterDistractors, pickLetter } from "../game/picker";
import { playClip } from "../lib/clips";
import { shuffle } from "../lib/random";
import { getRounds, lastPrompt, setLastPrompt } from "../store/session";
import type { UnitProps } from "../App";

export default function Recognize({ onAnswer, setReplayHandler }: UnitProps) {
  const [round] = useState(() => {
    const prompt = pickLetter(getRounds(), lastPrompt("recognize"));
    return { prompt, choices: shuffle([...letterDistractors(prompt), prompt]) };
  });
  const [feedback, setFeedback] = useState<{ idx: number; ok: boolean } | null>(null);
  const busy = useRef(false);
  const announced = useRef(false);

  useEffect(() => {
    setLastPrompt("recognize", round.prompt);
    const replay = () => { playClip("letter", round.prompt); };
    setReplayHandler(replay);
    if (announced.current) return;  // StrictMode: effect runs twice, only play once
    announced.current = true;
    replay();
  }, []);

  function choose(idx: number) {
    if (busy.current) return;
    busy.current = true;
    const ok = round.choices[idx] === round.prompt;
    setFeedback({ idx, ok });
    onAnswer(ok, round.prompt);
  }

  const reveal = feedback !== null;

  return (
    <>
      <div className="hint">ШТА ЧУЈЕШ?</div>
      <div className="choices">
        {round.choices.map((c, i) => {
          const isPicked = feedback?.idx === i;
          return (
            <motion.button
              key={`${round.prompt}-${i}-${c}`}
              className={`letter-card ${isPicked ? (feedback!.ok ? "good" : "bad") : ""}`}
              onClick={() => choose(i)}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={
                reveal && !isPicked
                  ? { opacity: 0.25, y: 0, scale: 1 }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              transition={{ duration: 0.3 }}
            >
              {c}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {reveal && (
          <motion.div
            key="reveal"
            className={`reveal-card ${feedback!.ok ? "" : "bad"}`}
            initial={{ scale: 0.2, opacity: 0, x: "-50%", y: "-50%" }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
          >
            {round.prompt}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
