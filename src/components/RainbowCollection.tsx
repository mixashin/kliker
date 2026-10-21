import { motion, AnimatePresence } from "framer-motion";

const ARCS = [
  { r: 42, color: "#ff006e" }, // outermost = pink/red
  { r: 36, color: "#fb5607" }, // orange
  { r: 30, color: "#ffbe0b" }, // yellow
  { r: 24, color: "#06d6a0" }, // green
  { r: 18, color: "#3a86ff" }, // blue
  { r: 12, color: "#8338ec" }, // violet
];

function RainbowSticker({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 60" width={size} height={size * 0.6} aria-hidden>
      {ARCS.map(({ r, color }, i) => (
        <path
          key={i}
          d={`M${50 - r} 55 A${r} ${r} 0 0 1 ${50 + r} 55`}
          stroke={color}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
        />
      ))}
      {/* tiny clouds at the ends for cuteness */}
      <ellipse cx="10" cy="55" rx="8" ry="5" fill="#ffffff" opacity="0.95" />
      <ellipse cx="90" cy="55" rx="8" ry="5" fill="#ffffff" opacity="0.95" />
    </svg>
  );
}

type Props = { count: number };

export function RainbowCollection({ count }: Props) {
  // Render `count` stickers; AnimatePresence handles the entry animation
  // for the newest one each time `count` increments.
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <div className="rcoll" aria-label={`ДУГЕ: ${count}`}>
      <AnimatePresence initial={false}>
        {items.map((i) => (
          <motion.div
            key={i}
            className="rcoll-sticker"
            initial={{ scale: 0, rotate: -45, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
          >
            <RainbowSticker />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
