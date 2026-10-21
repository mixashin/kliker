import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { announce, rollLetterGame, rollNumberGame, type Game } from "../game/reaction";
import { getRounds, lastPrompt, setLastPrompt } from "../store/session";
import type { UnitProps } from "../App";

/**
 * Whack-a-mole reaction game. Dad's voice calls a target (number or letter);
 * moles pop out of holes one at a time carrying values; she whacks the ones
 * matching the target. Research notes baked in: >=2s visibility window at this
 * age, NO fail feedback on wrong whacks (mole just retreats), the round always
 * ends in success (it's an energy break, not a test) so onAnswer(true).
 */

const HOLES = 4;            // 2x2: more holes overwhelms at 4-5yo
const HITS_NEEDED = 5;
const UP_MS = 2200;         // mole visibility; research floor is ~2s
const GAP_MS = 380;
const P_TARGET = 0.45;      // chance a pop is the target
const REANNOUNCE_EVERY = 5; // repeat the audio prompt every N pops
const LETTER_SHARE = 0.3;   // numbers dominate per the learning priorities

type Mole = { hole: number; value: string; isTarget: boolean; id: number };

export default function Whack({ onAnswer, setReplayHandler }: UnitProps) {
  const [game] = useState<Game>(() =>
    Math.random() < LETTER_SHARE
      ? rollLetterGame(getRounds(), lastPrompt("whack"))
      : rollNumberGame(),
  );
  const [mole, setMole] = useState<Mole | null>(null);
  const [hits, setHits] = useState(0);
  const hitsRef = useRef(0);
  const doneRef = useRef(false);
  const popSeq = useRef(0);
  const announced = useRef(false);

  // Pop loop: timeout chain with full cleanup so StrictMode/unmount can't
  // leave a stray mole popping into the next unit.
  useEffect(() => {
    setLastPrompt("whack", game.target);
    const replay = () => { announce(game); };
    setReplayHandler(replay);
    if (!announced.current) {
      announced.current = true;
      replay();
    }

    let alive = true;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const t = window.setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms);
      timers.add(t);
    };

    const popOnce = () => {
      if (!alive || doneRef.current) return;
      popSeq.current += 1;
      if (popSeq.current % REANNOUNCE_EVERY === 0) replay();
      const isTarget = Math.random() < P_TARGET;
      const value = isTarget
        ? game.target
        : game.decoys[Math.floor(Math.random() * game.decoys.length)];
      const id = popSeq.current;
      setMole({ hole: Math.floor(Math.random() * HOLES), value, isTarget, id });
      later(() => {
        // Only retract if this exact mole is still up (not already whacked).
        setMole((m) => (m && m.id === id ? null : m));
        later(popOnce, GAP_MS);
      }, UP_MS);
    };
    later(popOnce, 800); // beat after the announce so she hears it first

    return () => { alive = false; timers.forEach(clearTimeout); };
  }, []);

  function whack(m: Mole) {
    if (doneRef.current) return;
    setMole(null); // mole retreats either way; wrong whack gets no buzz
    if (!m.isTarget) return;
    hitsRef.current += 1;
    setHits(hitsRef.current);
    if (hitsRef.current >= HITS_NEEDED) {
      doneRef.current = true;
      onAnswer(true, game.target);
    }
  }

  return (
    <>
      <div className="hint">ШТА ЧУЈЕШ? ЛУПНИ!</div>
      <div className="hits-row" aria-label={`${hits}/${HITS_NEEDED}`}>
        {Array.from({ length: HITS_NEEDED }, (_, i) => (
          <motion.span
            key={i}
            animate={i < hits ? { scale: [1, 1.5, 1] } : {}}
            style={{ opacity: i < hits ? 1 : 0.3 }}
          >⭐</motion.span>
        ))}
      </div>
      <div className="whack-grid">
        {Array.from({ length: HOLES }, (_, h) => (
          <div key={h} className="whack-hole">
            <AnimatePresence>
              {mole && mole.hole === h && (
                <motion.button
                  key={mole.id}
                  className="whack-mole"
                  onPointerDown={() => whack(mole)}
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  exit={{ y: "115%", transition: { duration: 0.18 } }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }}
                >
                  <span className="whack-mole-face">🐹</span>
                  <span className="whack-mole-val">{mole.value}</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </>
  );
}
