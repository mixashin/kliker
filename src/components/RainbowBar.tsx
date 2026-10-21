import type { CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BAR_MAX } from "../game/replay";
// motion is used for the streak chip pulse + segment glow.

export const RAINBOW_COLORS = [
  "#ff006e", // pink-red  (segment 1, bottom)
  "#fb5607", // orange
  "#ffbe0b", // yellow
  "#a3ff12", // lime
  "#06d6a0", // green
  "#22d3ee", // cyan
  "#3a86ff", // blue
  "#8338ec", // violet
  "#f472b6", // pink
  "#ffffff", // white     (segment 10, top — "win")
];

type Props = {
  value: number;       // 0..BAR_MAX (App holds BAR_MAX until the spill, then the replayed 0)
  streak: number;      // current run length, uncapped — keeps counting past BAR_MAX
  bestStreak: number;  // all-time best (replayed from the round log)
  coins: number;       // permanent — earned 1 per 10 collected rainbows
};

export function RainbowBar({ value, streak, bestStreak, coins }: Props) {
  return (
    <div className="rbar">
      <div className="rbar-chips">
        <motion.div
          className="rbar-chip coin"
          aria-label="НОВЧИЋИ"
          // Re-keying on `coins` triggers the entrance spring whenever a new
          // coin is awarded, so the chip "pops" on conversion.
          key={`coin-${coins}`}
          initial={{ scale: 0.6, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 18 }}
        >
          <span className="rbar-chip-icon">🪙</span>
          <span className="rbar-chip-value">{coins}</span>
        </motion.div>
        <div className="rbar-chip best" aria-label="НАЈБОЉИ НИЗ">
          <span className="rbar-chip-icon">★</span>
          <span className="rbar-chip-value">{bestStreak}</span>
        </div>
        <motion.div
          className="rbar-chip streak"
          aria-label="НИЗ"
          animate={{ scale: streak > 0 ? 1 : 0.92, opacity: streak > 0 ? 1 : 0.55 }}
          transition={{ type: "spring", stiffness: 360, damping: 22 }}
          key={streak}
        >
          <span className="rbar-chip-icon">🔥</span>
          <span className="rbar-chip-value">{streak}</span>
        </motion.div>
      </div>

      <div className="rbar-track" aria-label={`НАПРЕДАК ${value} ОД ${BAR_MAX}`}>
        {RAINBOW_COLORS.map((color, i) => {
          // Segments fill from the bottom up — index 0 lights first.
          const filled = i < value;
          return (
            <div key={i} className={`rbar-seg ${filled ? "on" : ""}`} style={{ "--seg-color": color } as CSSProperties}>
              <AnimatePresence>
                {filled && (
                  <motion.div
                    key="glow"
                    className="rbar-seg-glow"
                    style={{ background: color }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
