import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Pet buddy — a bear cub in the corner that grows with her lifetime correct
 * answers and munches a berry on every correct round. Engagement-research
 * rules: growth is permanent (never regresses), absence reads as "sleeping"
 * (never sad/hungry guilt), and the pet never blocks or gates gameplay.
 *
 * `bites` = correct answers this session; lifetime base is `totalCorrect`,
 * read once at mount (the prop keeps counting, bites would count twice).
 */

// Lifetime correct → stage 0..3. Tuned against her actual history (~1.4k
// correct answers at introduction, 2026-06) so the bear starts at stage 1
// with two visible growth milestones still ahead of her.
const STAGE_AT = [0, 800, 1800, 3200];
const STAGE_SCALE = [1, 1.18, 1.36, 1.55];
const SLEEP_AFTER_H = 36;

type Props = { totalCorrect: number; idleHours: number; bites: number };

export default function PetBuddy({ totalCorrect, idleHours, bites }: Props) {
  const [base] = useState(totalCorrect);
  const [sleeping, setSleeping] = useState(idleHours > SLEEP_AFTER_H);
  const [munch, setMunch] = useState(0);  // increments retrigger the eat anim

  // Each earned bite wakes the pet and feeds it.
  useEffect(() => {
    if (bites === 0) return;
    setSleeping(false);
    setMunch((n) => n + 1);
  }, [bites]);

  const total = base + bites;
  const stage = STAGE_AT.filter((t) => total >= t).length - 1;
  const scale = STAGE_SCALE[stage];

  return (
    <motion.button
      className="pet"
      aria-label="МЕДА"
      onClick={() => setMunch((n) => n + 1)}  // petting = same happy wiggle
      animate={{ scale }}
      whileTap={{ scale: scale * 0.9 }}
    >
      <motion.span
        key={munch}
        className="pet-body"
        animate={
          munch > 0
            ? { rotate: [0, -10, 10, -6, 0], scale: [1, 1.12, 1] }
            : sleeping
            ? { rotate: [0, 2, 0, -2, 0] }
            : { y: [0, -3, 0] }
        }
        transition={
          munch > 0
            ? { duration: 0.6 }
            : { duration: sleeping ? 4 : 2.4, repeat: Infinity, ease: "easeInOut" }
        }
      >
        🐻
      </motion.span>
      {stage >= 1 && <span className="pet-acc pet-bow">🎀</span>}
      {stage >= 3 && <span className="pet-acc pet-crown">👑</span>}
      {sleeping && <span className="pet-zzz">💤</span>}
      <AnimatePresence>
        {munch > 0 && (
          <motion.span
            key={`yum-${munch}`}
            className="pet-yum"
            initial={{ opacity: 1, y: 6, scale: 0.5 }}
            animate={{ opacity: 0, y: -36, scale: 1.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          >
            🍓
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
