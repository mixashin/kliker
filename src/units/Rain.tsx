import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { announce, rollLetterGame, rollNumberGame, type Game } from "../game/reaction";
import { getRounds, lastPrompt, setLastPrompt } from "../store/session";
import type { UnitProps } from "../App";

/**
 * Falling-bubbles reaction game (letter/number rain). Bubbles drift down the
 * screen; she pops only the ones matching the called target. Misses dissolve
 * harmlessly and the target keeps respawning, so the round can't be failed:
 * urgency comes from the falling itself, never from a countdown.
 */

const CATCHES_NEEDED = 3;
const SPAWN_MS = 1150;
const P_TARGET = 0.4;
const FORCE_TARGET_EVERY = 4;  // never more than 3 non-targets in a row
const FALL_MIN_S = 4.6;        // slow: generous window per the age research
const FALL_MAX_S = 6.2;
const LETTER_SHARE = 0.3;

type Drop = { id: number; x: number; value: string; isTarget: boolean; dur: number };

export default function Rain({ onAnswer, setReplayHandler }: UnitProps) {
  const [game] = useState<Game>(() =>
    Math.random() < LETTER_SHARE
      ? rollLetterGame(getRounds(), lastPrompt("rain"))
      : rollNumberGame(),
  );
  const [drops, setDrops] = useState<Drop[]>([]);
  const [catches, setCatches] = useState(0);
  const catchesRef = useRef(0);
  const doneRef = useRef(false);
  const seq = useRef(0);
  const sinceTarget = useRef(0);
  const announced = useRef(false);

  useEffect(() => {
    setLastPrompt("rain", game.target);
    const replay = () => { announce(game); };
    setReplayHandler(replay);
    if (!announced.current) {
      announced.current = true;
      replay();
    }

    const spawn = () => {
      if (doneRef.current) return;
      sinceTarget.current += 1;
      const isTarget =
        sinceTarget.current >= FORCE_TARGET_EVERY || Math.random() < P_TARGET;
      if (isTarget) sinceTarget.current = 0;
      seq.current += 1;
      setDrops((ds) => [
        ...ds,
        {
          id: seq.current,
          x: 8 + Math.random() * 72,                 // % of viewport width
          value: isTarget
            ? game.target
            : game.decoys[Math.floor(Math.random() * game.decoys.length)],
          isTarget,
          dur: FALL_MIN_S + Math.random() * (FALL_MAX_S - FALL_MIN_S),
        },
      ]);
    };

    const t0 = window.setTimeout(spawn, 900);   // hear the target first
    const iv = window.setInterval(spawn, SPAWN_MS);
    return () => { clearTimeout(t0); clearInterval(iv); };
  }, []);

  function removeDrop(id: number) {
    setDrops((ds) => ds.filter((d) => d.id !== id));
  }

  function tapDrop(d: Drop) {
    if (doneRef.current) return;
    if (!d.isTarget) return;                     // wrong bubble: nothing happens
    removeDrop(d.id);
    catchesRef.current += 1;
    setCatches(catchesRef.current);
    if (catchesRef.current >= CATCHES_NEEDED) {
      doneRef.current = true;
      onAnswer(true, game.target);
    }
  }

  return (
    <>
      <div className="hint">ШТА ЧУЈЕШ? УХВАТИ!</div>
      <div className="hits-row" aria-label={`${catches}/${CATCHES_NEEDED}`}>
        {Array.from({ length: CATCHES_NEEDED }, (_, i) => (
          <motion.span
            key={i}
            animate={i < catches ? { scale: [1, 1.5, 1] } : {}}
            style={{ opacity: i < catches ? 1 : 0.3 }}
          >⭐</motion.span>
        ))}
      </div>
      <div className="rain-field" aria-hidden={false}>
        <AnimatePresence>
          {drops.map((d) => (
            <motion.button
              key={d.id}
              className="rain-drop"
              style={{ left: `${d.x}%` }}
              initial={{ y: "-18vh", opacity: 0 }}
              animate={{ y: "112vh", opacity: 1 }}
              exit={{ scale: 1.7, opacity: 0, transition: { duration: 0.25 } }}
              transition={{
                y: { duration: d.dur, ease: "linear" },
                opacity: { duration: 0.4 },
              }}
              onAnimationComplete={() => removeDrop(d.id)}
              onPointerDown={() => tapDrop(d)}
              whileTap={{ scale: 0.9 }}
            >
              {d.value}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
