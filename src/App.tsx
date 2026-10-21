import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Recognize from "./units/Recognize";
import LeftRight from "./units/LeftRight";
import Counting from "./units/Counting";
import CountScene from "./units/CountScene";
import MathAdd from "./units/MathAdd";
import Whack from "./units/Whack";
import Rain from "./units/Rain";
import Draw from "./units/Draw";
import DrawName from "./units/DrawName";
import Read from "./units/Read";
import ReadDraw from "./units/ReadDraw";
import ParentIcon from "./parent/ParentIcon";
import PetBuddy from "./components/PetBuddy";
import { RainbowBar, RAINBOW_COLORS } from "./components/RainbowBar";
import { RainbowCollection } from "./components/RainbowCollection";
import { PHRASES, type Phrase } from "./data/phrases";
import { BAR_MAX } from "./game/replay";
import type { Unit } from "./game/types";
import { pickNextUnit } from "./game/units";
import { unlockAudio } from "./lib/audio";
import { hasClip, playClip } from "./lib/clips";
import { applyPendingUpdate } from "./lib/update";
import { celebrate, sadBeep, rainbowSpill, coinAward } from "./lib/fx";
import { counters, hasRecordedName, recordRound } from "./store/session";

const BG_COUNT = 4;   // /public/bg/bg-1.jpg .. bg-4.jpg

export type UnitProps = {
  /** `prompt` is the unit-specific identifier for what was asked
   *  (letter glyph for recognize, "levo"/"desno", number string, "a+b"
   *  for math). Stored in the round log for stats. */
  onAnswer: (ok: boolean, prompt: string) => void;
  setReplayHandler: (fn: () => void) => void;
};

/** Random recorded phrase of this mood; null when dad recorded none yet. */
function pickPhraseTag(mood: Phrase["mood"]): string | null {
  const pool = PHRASES.filter((p) => p.mood === mood && hasClip("phrase", p.tag));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)].tag : null;
}

const hoursSince = (iso: string | null): number =>
  iso ? (Date.now() - Date.parse(iso)) / 3_600_000 : 0;

export default function App() {
  const [started, setStarted] = useState(false);
  const startingRef = useRef(false);
  const [unit, setUnit] = useState<Unit>("recognize");
  const [roundId, setRoundId] = useState(0);
  const [bgIdx, setBgIdx] = useState(() => Math.floor(Math.random() * BG_COUNT));

  // Bar, streak, rainbows and coins are derived from the round log; the
  // shell only keeps the latest snapshot and diffs it to fire milestones.
  const [c, setC] = useState(() => counters());
  const prev = useRef(c);
  // The replay wraps the bar to 0 on the 10th correct answer. Until the
  // spill runs, show the bar full and the sticker count from before.
  const [heldRainbows, setHeldRainbows] = useState<number | null>(null);

  // Correct answers this session — feeds the pet buddy (one berry per bite).
  const [petBites, setPetBites] = useState(0);

  const replayRef = useRef<() => void>(() => {});

  // Units answer from timers (Read waits 650 ms): drop answers that land
  // after the shell unmounted (route switch to the parent page). Every shell
  // timer goes through `later`, so unmount cancels it.
  const alive = useRef(true);
  const timers = useRef(new Set<number>());
  useEffect(() => {
    alive.current = true;
    const ids = timers.current;
    return () => {
      alive.current = false;
      for (const id of ids) clearTimeout(id);
      ids.clear();
    };
  }, []);

  function later(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      if (alive.current) fn();
    }, ms);
    timers.current.add(id);
  }

  async function start() {
    if (started || startingRef.current) return;
    // An update reloads the page on its own: stay on the start screen, never mount a round.
    if (applyPendingUpdate()) return;
    startingRef.current = true;
    unlockAudio();
    // Hero button stays visible while the intro line plays so it doesn't
    // overlap with the first round's letter audio.
    await playClip("phrase", "sta_cujes");
    later(() => setStarted(true), 250);   // small breath
  }

  async function handleAnswer(ok: boolean, prompt: string) {
    if (!alive.current) return;
    // Start the write first so a throwing effect cannot drop the round, but
    // give feedback and schedule the advance before awaiting it: a slow or
    // failed store write never delays or strands the round.
    const write = recordRound(unit, prompt, ok).catch(() => counters());

    // Hold the reveal for a beat, then advance.
    later(() => {
      setUnit((u) => pickNextUnit(u, hasRecordedName()));
      setRoundId((r) => r + 1);
    }, 1100);

    if (ok) {
      setPetBites((b) => b + 1);
      celebrate();
    } else {
      sadBeep();
    }
    const tag = pickPhraseTag(ok ? "praise" : "encourage");
    if (tag) playClip("phrase", tag);

    const next = await write;
    if (!alive.current) return;

    const before = prev.current;
    prev.current = next;
    setC(next);
    // Spill a beat after the per-answer celebration, then the coin once the
    // spill settles, so the two celebrations don't visually collide.
    if (next.rainbows > before.rainbows || next.coins > before.coins) {
      setHeldRainbows(before.rainbows);
      later(() => {
        rainbowSpill(RAINBOW_COLORS);
        setBgIdx((i) => (i + 1) % BG_COUNT);   // rotate scene on each milestone
        setHeldRainbows(null);
      }, 250);
    }
    if (next.coins > before.coins) later(coinAward, 2050);
  }

  function setReplayHandler(fn: () => void) {
    replayRef.current = fn;
  }

  // Track fullscreen state so the toggle label flips correctly even if the
  // user exits via Esc (which doesn't go through our handler).
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  // Subtle mouse parallax — writes CSS vars consumed by .bg-parallax.
  // Throttled to once per animation frame so a busy mousemove can't flood
  // style writes (was making the page unresponsive on some devices).
  useEffect(() => {
    let pending = false;
    let lastX = 0, lastY = 0;
    function move(e: PointerEvent) {
      lastX = (e.clientX / window.innerWidth  - 0.5) * 2;
      lastY = (e.clientY / window.innerHeight - 0.5) * 2;
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--bg-mx", String(lastX));
        document.documentElement.style.setProperty("--bg-my", String(lastY));
        pending = false;
      });
    }
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  // Background scene layers — only the current image is mounted (crossfade
  // via AnimatePresence). Keeps GPU/memory load low — was contributing to
  // page unresponsiveness when all 4 huge filtered layers stayed live.
  const bgStage = (
    <>
      <div className="bg-stage" aria-hidden>
        <div className="bg-parallax">
          <AnimatePresence mode="sync">
            <motion.div
              key={bgIdx}
              className="bg-img active"
              style={{ backgroundImage: `url(${import.meta.env.BASE_URL}bg/bg-${bgIdx + 1}.jpg)` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
            />
          </AnimatePresence>
        </div>
      </div>
      <div className="bg-overlay" aria-hidden />
    </>
  );

  const fsButton = (
    <button
      className="fs-btn"
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? "ИЗАЂИ ИЗ ЦЕЛОГ ЕКРАНА" : "ЦЕО ЕКРАН"}
    >⛶</button>
  );

  // ───── Onboarding (hero play button) ─────
  if (!started) {
    return (
      <>
        {bgStage}
        <div className="app" onPointerDown={unlockAudio}>
          <motion.button
            layoutId="play-btn"
            className="prompt-btn hero"
            onClick={start}
            aria-label="ПОЧНИ"
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
          >▶</motion.button>
          {fsButton}
        <ParentIcon />
        </div>
      </>
    );
  }

  // ───── Game chrome + active unit ─────
  const unitProps: UnitProps = { onAnswer: handleAnswer, setReplayHandler };

  return (
    <>
      {bgStage}
      <div className="app" onPointerDown={unlockAudio}>
        <motion.button
          layoutId="play-btn"
          className="prompt-btn"
          onClick={() => replayRef.current()}
          aria-label="ПОСЛУШАЈ ПОНОВО"
          transition={{ type: "spring", stiffness: 240, damping: 24 }}
        >▶</motion.button>
        {fsButton}
        <ParentIcon />

        <RainbowBar
          value={heldRainbows === null ? c.barFill : BAR_MAX}
          streak={c.streak}
          bestStreak={c.bestStreak}
          coins={c.coins}
        />
        <RainbowCollection count={heldRainbows ?? c.rainbows} />
        <PetBuddy totalCorrect={c.totalCorrect} idleHours={hoursSince(c.lastAt)} bites={petBites} />

        <AnimatePresence mode="wait">
          {unit === "recognize"  && <Recognize  key={`rec-${roundId}`}    {...unitProps} />}
          {unit === "leftright"  && <LeftRight  key={`lr-${roundId}`}     {...unitProps} />}
          {unit === "counting"   && <Counting   key={`cnt-${roundId}`}    {...unitProps} />}
          {unit === "countscene" && <CountScene key={`csc-${roundId}`}    {...unitProps} />}
          {unit === "math"       && <MathAdd    key={`math-${roundId}`}   {...unitProps} />}
          {unit === "whack"      && <Whack      key={`whk-${roundId}`}    {...unitProps} />}
          {unit === "rain"       && <Rain       key={`rain-${roundId}`}   {...unitProps} />}
          {unit === "draw"       && <Draw       key={`draw-${roundId}`}   {...unitProps} />}
          {unit === "drawname"   && <DrawName   key={`dnam-${roundId}`}   {...unitProps} />}
          {unit === "read"       && <Read       key={`read-${roundId}`}   {...unitProps} />}
          {unit === "readdraw"   && <ReadDraw   key={`rdrw-${roundId}`}   {...unitProps} />}
        </AnimatePresence>
      </div>
    </>
  );
}
