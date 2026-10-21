import confetti from "canvas-confetti";

const RAINBOW = [
  "#ff006e", "#fb5607", "#ffbe0b", "#8338ec",
  "#3a86ff", "#06d6a0", "#f72585", "#ffd166",
];

const KID_EMOJI = ["🦄", "🌈", "⭐️", "✨", "🎉", "🎈", "🦋", "💖"];

function emojiConfetti(opts: confetti.Options & { emoji: string }) {
  const { emoji, ...rest } = opts;
  confetti({
    ...rest,
    shapes: ["text" as any],
    // @ts-ignore canvas-confetti supports shapeOptions.text
    shapeOptions: { text: { value: emoji, scalar: 2 } },
  });
}

// ───────────────────────── celebration variants ─────────────────────────

// Per-correct celebrations are intentionally restrained — particle counts ~50%
// of "full" and timings ~50% faster than before, so the rainbow-bar fill +
// XP-Solitaire spill remain the dramatic milestone.

/** 4-stage spectacular: center burst → side cannons → emoji volley */
function bigBlast() {
  confetti({ particleCount: 70, spread: 90, startVelocity: 50, origin: { x: 0.5, y: 0.55 }, colors: RAINBOW, scalar: 1.1, ticks: 90 });
  for (const e of ["🦄", "🌈", "🎉"]) {
    emojiConfetti({ particleCount: 5, spread: 110, startVelocity: 45, origin: { x: 0.5, y: 0.55 }, scalar: 1.8, ticks: 90, gravity: 0.9, emoji: e });
  }
  setTimeout(() => {
    confetti({ particleCount: 40, spread: 60, angle: 60,  origin: { x: 0, y: 0.7 }, colors: RAINBOW, ticks: 90 });
    confetti({ particleCount: 40, spread: 60, angle: 120, origin: { x: 1, y: 0.7 }, colors: RAINBOW, ticks: 90 });
  }, 70);
  setTimeout(() => {
    for (const e of KID_EMOJI.slice(0, 4)) {
      emojiConfetti({ particleCount: 3, spread: 80, startVelocity: 38, origin: { x: Math.random(), y: 0 }, scalar: 1.6, ticks: 100, gravity: 0.85, emoji: e });
    }
  }, 110);
}

/** Fireworks — fewer launches, faster cadence */
function fireworks() {
  const launches = 3;
  for (let i = 0; i < launches; i++) {
    const x = 0.2 + Math.random() * 0.6;
    const y = 0.2 + Math.random() * 0.2;
    const delay = 30 + i * 90;
    setTimeout(() => {
      confetti({ particleCount: 1, startVelocity: 0, origin: { x, y: 0.95 }, colors: ["#ffffff"], ticks: 30, scalar: 0.4 });
      setTimeout(() => {
        confetti({
          particleCount: 45, spread: 360, startVelocity: 38,
          origin: { x, y }, ticks: 80, gravity: 0.95, decay: 0.91, scalar: 1.0,
          colors: [RAINBOW[i % RAINBOW.length], RAINBOW[(i + 3) % RAINBOW.length], "#ffffff"],
        });
        const e = ["💖", "⭐️", "✨"][i % 3];
        emojiConfetti({
          particleCount: 3, spread: 360, startVelocity: 30,
          origin: { x, y }, ticks: 100, gravity: 0.9, scalar: 1.6, emoji: e,
        });
      }, 25);
    }, delay);
  }
}

/** Unicorns — fewer lanes, shorter run */
function unicornRainbow() {
  const lanes = 2;
  for (let lane = 0; lane < lanes; lane++) {
    const rider = ["🦄", "🦋"][lane];
    const y = 0.3 + lane * 0.2;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const startX = dir === 1 ? -0.05 : 1.05;
    const endX   = dir === 1 ? 1.05  : -0.05;
    const dur = 600 + Math.random() * 200;
    const t0 = Date.now() + lane * 75;

    function tick() {
      const t = (Date.now() - t0) / dur;
      if (t > 1) return;
      const x = startX + (endX - startX) * t;
      emojiConfetti({
        particleCount: 1, startVelocity: 0, gravity: 0,
        origin: { x, y }, ticks: 15, scalar: 1.5, emoji: rider,
      });
      confetti({
        particleCount: 3, startVelocity: 6,
        spread: 25, angle: dir === 1 ? 180 : 0,
        origin: { x, y: y + 0.02 },
        colors: RAINBOW, ticks: 50, gravity: 0.3, scalar: 0.8,
      });
      requestAnimationFrame(tick);
    }
    setTimeout(tick, lane * 75);
  }
}

/** Hearts + stars rain — shorter, lighter */
function heartShower() {
  const emoji = ["💖", "⭐️", "✨", "🌟"];
  let bursts = 0;
  const id = setInterval(() => {
    if (bursts++ > 4) { clearInterval(id); return; }
    for (let i = 0; i < 2; i++) {
      emojiConfetti({
        particleCount: 2, startVelocity: 18, spread: 60,
        origin: { x: Math.random(), y: -0.05 },
        gravity: 0.85, ticks: 100, scalar: 1.8,
        emoji: emoji[Math.floor(Math.random() * emoji.length)],
      });
    }
  }, 50);
}

/** Disco — fewer beats, faster */
function disco() {
  let n = 0;
  const id = setInterval(() => {
    if (n++ > 6) { clearInterval(id); return; }
    const x = 0.2 + Math.random() * 0.6;
    const y = 0.25 + Math.random() * 0.4;
    confetti({
      particleCount: 20, spread: 360, startVelocity: 28,
      origin: { x, y },
      colors: [RAINBOW[n % RAINBOW.length], RAINBOW[(n + 2) % RAINBOW.length]],
      ticks: 50, scalar: 0.85, decay: 0.9,
    });
    if (n % 2 === 0) {
      emojiConfetti({
        particleCount: 2, spread: 360, startVelocity: 22,
        origin: { x, y }, ticks: 70, gravity: 0.7, scalar: 1.4,
        emoji: ["🎉", "💫", "🌈"][n % 3],
      });
    }
  }, 35);
}

/** Volcano — fewer emoji, faster cascade */
function emojiVolcano() {
  confetti({
    particleCount: 35, spread: 70, startVelocity: 75, angle: 90,
    origin: { x: 0.5, y: 1.0 }, colors: RAINBOW, scalar: 1.0, ticks: 90, gravity: 1.1,
  });
  const emoji = ["🦄", "🌈", "🎉", "💖"];
  for (let i = 0; i < emoji.length; i++) {
    setTimeout(() => {
      emojiConfetti({
        particleCount: 4, spread: 50,
        startVelocity: 75 + Math.random() * 15, angle: 90,
        origin: { x: 0.5, y: 1.05 },
        ticks: 110, gravity: 1.1, scalar: 2.2, emoji: emoji[i],
      });
    }, i * 35);
  }
}

const VARIANTS: Record<string, () => void> = {
  bigBlast, fireworks, unicornRainbow, heartShower, disco, emojiVolcano,
};
const VARIANT_NAMES = Object.keys(VARIANTS);
let _last = -1;

/** Pick a random celebration, never repeat the same one twice in a row. */
export function celebrate() {
  let i = Math.floor(Math.random() * VARIANT_NAMES.length);
  if (i === _last) i = (i + 1) % VARIANT_NAMES.length;
  _last = i;
  const name = VARIANT_NAMES[i];
  VARIANTS[name]();
}

/**
 * Windows-XP-Solitaire "you won" spill, dialed up with full fanfare.
 *  - Arpeggio + shimmer + boom + whoosh (WebAudio synth, no asset deps).
 *  - Multi-pass leftward streams from every bar segment.
 *  - Bouncing emoji shrapnel cascading down behind the streams.
 *  - Center grand-finale burst with trophies + unicorns.
 *  - Fireworks coda from the corners.
 */
export function rainbowSpill(colors: string[]) {
  winFanfare();

  const segments = colors.length;

  // Pass 1 + 2 — each segment fires twice, second wave with emoji shrapnel
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < segments; i++) {
      const yFrac = 0.05 + (i / (segments - 1)) * 0.9;
      const delay = pass * 250 + i * 60;
      setTimeout(() => {
        // Cards/confetti stream
        confetti({
          particleCount: 26,
          startVelocity: 75,
          angle: 175,
          spread: 40,
          origin: { x: 1.0, y: yFrac },
          colors: [colors[i]],
          gravity: 1.4,
          decay: 0.94,
          scalar: 1.5,
          ticks: 320,
          drift: -0.6,
        });
        // Emoji shrapnel on second pass
        if (pass === 1) {
          const e = ["🌈", "⭐️", "💖", "✨", "🎉", "🦄"][i % 6];
          emojiConfetti({
            particleCount: 4,
            startVelocity: 65,
            angle: 175,
            spread: 30,
            origin: { x: 1.0, y: yFrac },
            ticks: 320,
            gravity: 1.2,
            scalar: 2.2,
            drift: -0.5,
            emoji: e,
          });
        }
      }, delay);
    }
  }

  // Center grand finale — huge multi-burst
  setTimeout(() => {
    // Big rainbow ring
    confetti({
      particleCount: 200,
      spread: 360,
      startVelocity: 50,
      origin: { x: 0.5, y: 0.5 },
      colors, ticks: 240, scalar: 1.3,
    });
    // Trophy + mascots erupting from center
    for (const e of ["🏆", "🌈", "🦄", "✨", "🎉", "💖", "⭐️", "🎆"]) {
      emojiConfetti({
        particleCount: 8, spread: 360, startVelocity: 40,
        origin: { x: 0.5, y: 0.5 }, ticks: 280, gravity: 0.85, scalar: 2.4,
        emoji: e,
      });
    }
  }, segments * 60 + 350);

  // Fireworks coda from the bottom corners
  setTimeout(() => {
    confetti({ particleCount: 80, spread: 90, angle: 60,  startVelocity: 60, origin: { x: 0, y: 1 }, colors, ticks: 280, scalar: 1.2 });
    confetti({ particleCount: 80, spread: 90, angle: 120, startVelocity: 60, origin: { x: 1, y: 1 }, colors, ticks: 280, scalar: 1.2 });
    emojiConfetti({ particleCount: 6, spread: 90, angle: 60,  startVelocity: 55, origin: { x: 0, y: 1 }, ticks: 300, gravity: 0.9, scalar: 2.4, emoji: "🎆" });
    emojiConfetti({ particleCount: 6, spread: 90, angle: 120, startVelocity: 55, origin: { x: 1, y: 1 }, ticks: 300, gravity: 0.9, scalar: 2.4, emoji: "🎆" });
  }, segments * 60 + 700);

  // Final shimmer rain from the top
  setTimeout(() => {
    for (let i = 0; i < 8; i++) {
      emojiConfetti({
        particleCount: 4, spread: 70, startVelocity: 16,
        origin: { x: Math.random(), y: -0.05 },
        ticks: 280, gravity: 0.85, scalar: 2,
        emoji: ["✨", "💖", "⭐️"][i % 3],
      });
    }
  }, segments * 60 + 1100);
}

// ───────────────────────── audio (WebAudio synth) ─────────────────────────

let _ctx: AudioContext | null = null;
function ctx() {
  _ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
  return _ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", peak = 0.18) {
  try {
    const c = ctx();
    const t = c.currentTime + start;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch { /* fail-soft */ }
}

function sweep(fStart: number, fEnd: number, start: number, dur: number, type: OscillatorType = "sawtooth", peak = 0.14) {
  try {
    const c = ctx();
    const t = c.currentTime + start;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fStart, t);
    osc.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch { /* fail-soft */ }
}

function noiseBurst(start: number, dur: number, hpfHz = 800, peak = 0.2) {
  try {
    const c = ctx();
    const t = c.currentTime + start;
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = hpfHz;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(c.destination);
    src.onended = () => { src.disconnect(); filter.disconnect(); gain.disconnect(); };
    src.start(t);
    src.stop(t + dur + 0.02);
  } catch {}
}

/** Quick, gentle "uh-oh" descending tone — never shaming, just informational. */
export function sadBeep() {
  sweep(380, 220, 0, 0.3, "sine", 0.18);
}

/** Coin award — fires when 10 rainbows convert to 1 permanent coin.
 *  Categorically bigger than rainbowSpill: golden palette only, longer
 *  fanfare with a triumphant high cap, and a center coin burst. */
const GOLD = [
  "#fff7c2", // pale gold
  "#ffd166", // soft gold
  "#fbbf24", // amber
  "#f59e0b", // deep amber
  "#fde68a", // sand
  "#facc15", // yellow gold
];
export function coinAward() {
  // Sound — extended fanfare with a final brass crown.
  winFanfare();
  const C6 = 1046.5, E6 = 1318.5, G6 = 1568, C7 = 2093;
  tone(C6, 1.30, 0.18, "triangle", 0.22);
  tone(E6, 1.40, 0.18, "triangle", 0.22);
  tone(G6, 1.50, 0.20, "triangle", 0.24);
  tone(C7, 1.65, 0.45, "triangle", 0.28);
  // Money jingle — fast metallic shimmer
  for (let i = 0; i < 12; i++) {
    tone(2400 + Math.random() * 2200, 0.80 + i * 0.04, 0.10, "sine", 0.07);
  }

  // Visuals — gold burst from center, then cascading gold rain, then a
  // ring of "🪙" emoji erupting outward.
  confetti({
    particleCount: 220,
    spread: 360,
    startVelocity: 55,
    origin: { x: 0.5, y: 0.5 },
    colors: GOLD,
    ticks: 320,
    scalar: 1.4,
  });
  setTimeout(() => {
    confetti({
      particleCount: 90,
      spread: 70,
      angle: 90,
      startVelocity: 60,
      origin: { x: 0.5, y: 1.0 },
      colors: GOLD,
      ticks: 280,
      gravity: 1.0,
      scalar: 1.2,
    });
  }, 120);
  setTimeout(() => {
    emojiConfetti({
      particleCount: 16,
      spread: 360,
      startVelocity: 38,
      origin: { x: 0.5, y: 0.5 },
      ticks: 280,
      gravity: 0.8,
      scalar: 2.6,
      emoji: "🪙",
    });
    emojiConfetti({
      particleCount: 8,
      spread: 360,
      startVelocity: 32,
      origin: { x: 0.5, y: 0.5 },
      ticks: 280,
      gravity: 0.85,
      scalar: 2.4,
      emoji: "✨",
    });
  }, 250);
  // Top-down gold shimmer rain coda
  setTimeout(() => {
    for (let i = 0; i < 10; i++) {
      emojiConfetti({
        particleCount: 4,
        spread: 70,
        startVelocity: 16,
        origin: { x: Math.random(), y: -0.05 },
        ticks: 260,
        gravity: 0.9,
        scalar: 1.9,
        emoji: ["✨", "🌟", "🪙"][i % 3],
      });
    }
  }, 700);
}

/**
 * Big celebratory fanfare for full-bar spill:
 *   ascending C-major arpeggio → shimmer → low boom → upward whoosh.
 * All synthesized via WebAudio so it's fully offline + free.
 */
export function winFanfare() {
  const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G6 = 1568;
  // Brassy arpeggio
  tone(C5, 0.00, 0.18, "triangle", 0.22);
  tone(E5, 0.10, 0.18, "triangle", 0.22);
  tone(G5, 0.20, 0.18, "triangle", 0.22);
  tone(C6, 0.30, 0.32, "triangle", 0.26);
  // Sustained chord pad
  tone(C5, 0.32, 0.6, "sine", 0.10);
  tone(E5, 0.32, 0.6, "sine", 0.10);
  tone(G5, 0.32, 0.6, "sine", 0.10);
  // Sparkle shimmer
  for (let i = 0; i < 6; i++) tone(2000 + Math.random() * 2000, 0.45 + i * 0.07, 0.12, "sine", 0.07);
  // Crash / cymbal
  noiseBurst(0.30, 0.5, 4000, 0.18);
  // Low boom impact
  sweep(140, 60, 0.30, 0.45, "sine", 0.25);
  // Final upward whoosh
  sweep(300, 1800, 0.75, 0.35, "sawtooth", 0.10);
  // Crowning high notes
  tone(E6, 1.05, 0.22, "triangle", 0.22);
  tone(G6, 1.15, 0.32, "triangle", 0.24);
}
