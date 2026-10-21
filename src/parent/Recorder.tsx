import { useEffect, useRef, useState } from "react";
import type { ClipKind } from "../game/types";
import { hasClip, hasOwnClip, playClip, removeClip, saveClip } from "../lib/clips";
import { getMicStream, startRecording } from "../lib/record";

type Item = { kind: ClipKind; key: string; label: string };

const NO_MIC = "Нема приступа микрофону";
const SAVE_FAILED = "Снимак није сачуван";
const EMPTY = "Снимак је празан, пробај поново";
const DELETE_FAILED = "Није обрисано";

const idOf = (it: Item) => `${it.kind}:${it.key}`;
const stopTracks = (s: MediaStream) => s.getTracks().forEach((t) => t.stop());

export default function Recorder({ items }: { items: Item[] }) {
  // The pending request is kept, so presses during the mic prompt share one stream.
  const streamP = useRef<Promise<MediaStream> | null>(null);
  const unmounted = useRef(false);
  const active = useRef<{ stop(): Promise<Blob> } | null>(null);
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
      streamP.current?.then(stopTracks, () => {});
      streamP.current = null;
    };
  }, []);

  // The cell being recorded was removed (a name deleted): drop the recording.
  useEffect(() => {
    if (recordingKey && !items.some((it) => idOf(it) === recordingKey)) {
      active.current?.stop().catch(() => {});
      active.current = null;
      setRecordingKey(null);
    }
  }, [items, recordingKey]);

  // A failed request is forgotten so the next press asks again.
  // Ended tracks (mic lost, tab backgrounded) get one new request.
  async function mic(retry = true): Promise<MediaStream> {
    const p = (streamP.current ??= getMicStream());
    const s = await p.catch(() => null);
    if (s?.active) return s;
    if (streamP.current === p) streamP.current = null;
    if (s && retry) return mic(false);
    throw new Error("no mic");
  }

  async function toggle(it: Item) {
    if (recordingKey === idOf(it)) {
      const r = active.current;
      active.current = null;
      setRecordingKey(null);
      try {
        if (r) await saveClip(it.kind, it.key, await r.stop());
        bump();
      } catch (e) {
        setError(e instanceof Error && e.message === "empty" ? EMPTY : SAVE_FAILED);
      }
      return;
    }
    if (active.current) return;
    try {
      const s = await mic();
      if (unmounted.current) return stopTracks(s);
      if (active.current) return; // another cell started while the mic prompt was open
      active.current = startRecording(s);
      setError(null);
      setRecordingKey(idOf(it));
    } catch {
      setError(NO_MIC);
    }
  }

  const remove = (it: Item) => removeClip(it.kind, it.key).then(bump, () => setError(DELETE_FAILED));

  // Counts and styling follow own recordings; Пусти plays what the child hears (bundled voice included).
  const done = items.filter((it) => hasOwnClip(it.kind, it.key)).length;
  return (
    <div className="recorder">
      <p>
        Снимљено {done} од {items.length}
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="rec-grid">
        {items.map((it) => {
          const id = idOf(it);
          const own = hasOwnClip(it.kind, it.key);
          const live = recordingKey === id;
          return (
            <div key={id} className={own ? "rec-cell recorded" : "rec-cell"}>
              <span className="rec-label">{it.label}</span>
              <button
                type="button"
                aria-label={live ? "Стоп" : "Сними"}
                className={live ? "rec-live" : undefined}
                disabled={recordingKey !== null && !live}
                onClick={() => void toggle(it)}
              >
                {live ? "■" : "●"}
              </button>
              <button type="button" aria-label="Пусти" disabled={!hasClip(it.kind, it.key)} onClick={() => void playClip(it.kind, it.key)}>
                ▶
              </button>
              <button type="button" aria-label="Обриши" disabled={!own || live} onClick={() => void remove(it)}>
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
