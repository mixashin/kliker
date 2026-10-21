import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WORD_TO_SLUG } from "../data/words";
import { pickWord, wordDistractors } from "../game/picker";
import { shuffle } from "../lib/random";
import { getRounds, lastPrompt, setLastPrompt } from "../store/session";
import type { UnitProps } from "../App";

/**
 * Read minigame (Game 2): kid sees a 3-letter Cyrillic word and 4 picture
 * cards. She reads the word herself, taps the matching picture. No audio:
 * pure reading practice. The chrome's ▶ button is bound to a no-op here
 * so it doesn't carry over the previous unit's handler.
 */
export default function Read({ onAnswer, setReplayHandler }: UnitProps) {
  const [round] = useState(() => {
    const prompt = pickWord(getRounds(), lastPrompt("read"));
    return { prompt, choices: shuffle([...wordDistractors(prompt), prompt]) };
  });
  const [picked, setPicked] = useState<number | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    setLastPrompt("read", round.prompt);
    setReplayHandler(() => {}); // Read is silent on purpose
  }, []);

  function choose(idx: number) {
    if (busy.current) return;
    busy.current = true;
    setPicked(idx);
    const ok = round.choices[idx] === round.prompt;
    // Hold the reveal so she sees which one was right before the round flips.
    setTimeout(() => onAnswer(ok, round.prompt), 650);
  }

  return (
    <>
      <div className="hint">ПРОЧИТАЈ И ПРОНАЂИ</div>

      <motion.div
        className="read-prompt"
        key={round.prompt}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        aria-label={round.prompt}
      >
        {round.prompt}
      </motion.div>

      <div className="read-grid">
        <AnimatePresence>
          {round.choices.map((word, i) => {
            const isAnswer = word === round.prompt;
            const state =
              picked === null
                ? "idle"
                : picked === i
                  ? (isAnswer ? "right" : "wrong")
                  : (isAnswer ? "reveal" : "dim");
            return (
              <motion.button
                key={`${word}-${i}`}
                className={`read-card read-card-${state}`}
                onClick={() => choose(i)}
                disabled={picked !== null}
                aria-label={word}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
              >
                <img
                  src={`${import.meta.env.BASE_URL}clipart/${WORD_TO_SLUG[word]}.svg`}
                  alt={word}
                  draggable={false}
                />
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}
