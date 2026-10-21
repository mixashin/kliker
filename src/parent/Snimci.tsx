import { CYRILLIC } from "../data/letters";
import { PHRASES, phraseText } from "../data/phrases";
import { ALL_WORDS } from "../data/words";
import { getSettings } from "../store/session";
import Recorder from "./Recorder";

export default function Snimci() {
  const kidName = getSettings().kidName;
  return (
    <>
      <h2>Слова</h2>
      <Recorder items={CYRILLIC.map((g) => ({ kind: "letter", key: g, label: g }))} />
      <h2>Реченице</h2>
      {/* Phrase labels are the recording script Dad reads aloud, so they keep their casing. */}
      <Recorder items={PHRASES.map((p) => ({ kind: "phrase", key: p.tag, label: phraseText(p.tag, kidName) }))} />
      <h2>Речи</h2>
      <Recorder items={ALL_WORDS.map((w) => ({ kind: "word", key: w, label: w }))} />
    </>
  );
}
