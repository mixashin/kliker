// Mobile autoplay block: must unlock with first user gesture.

let unlocked = false;
let ctx: AudioContext | null = null;

export function unlockAudio() {
  if (unlocked) return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    ctx = new Ctx();
    // play silent buffer
    const b = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.connect(ctx.destination);
    src.start();
    unlocked = true;
  } catch {
    /* ignore */
  }
}

// Watchdog: Android pauses an element on audio-focus loss and never fires
// `ended`, so every play settles after `maxMs` at the latest.
export async function play(url: string, maxMs = 15_000): Promise<void> {
  return new Promise((resolve) => {
    const a = new Audio(url);
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      clearTimeout(watchdog);
      try {
        a.pause();
        a.removeAttribute("src");
        a.load(); // forces decoder release
      } catch {
        /* ignore */
      }
      resolve();
    };
    const watchdog = setTimeout(cleanup, maxMs);
    a.onended = cleanup;
    a.onerror = cleanup; // fail soft: a clip may be missing or undecodable
    a.play().catch(cleanup);
  });
}
