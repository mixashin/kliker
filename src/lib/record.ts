import { fixWebmDuration } from "@fix-webm-duration/fix";

export const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"] as const;

const defaultIsSupported = (t: string): boolean =>
  typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t);

export const pickMimeType = (isSupported: (t: string) => boolean = defaultIsSupported): string =>
  MIME_CANDIDATES.find((t) => isSupported(t)) ?? "";

export const getMicStream = (): Promise<MediaStream> =>
  navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: false },
  });

// Chrome writes webm without a duration; without the fix, audio.duration is Infinity.
// No timeslice: one chunk keeps the header intact for the fix.
export function startRecording(stream: MediaStream, mimeType = pickMimeType()): { stop(): Promise<Blob> } {
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    chunks.push(e.data);
  };
  const t0 = performance.now();
  // Settles once, also when the recorder stops by itself (tracks ended, error).
  const result = new Promise<Blob>((resolve) => {
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      const blob = new Blob(chunks, { type: rec.mimeType || mimeType });
      if (!blob.type.includes("webm")) return resolve(blob);
      fixWebmDuration(blob, performance.now() - t0).then(resolve, () => resolve(blob));
    };
    rec.onstop = end;
    rec.onerror = end;
  });
  rec.start();
  return {
    // A recorder error or a take with no data must never be saved as a silent clip.
    stop() {
      if (rec.state !== "inactive") rec.stop();
      return result.then((b) => (b.size ? b : Promise.reject(new Error("empty"))));
    },
  };
}
