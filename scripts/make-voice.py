"""Build the bundled default voice: public/voice/<kind>/<slug>.mp3 + src/data/voice-manifest.json.

Usage: python -X utf8 scripts/make-voice.py --voice Sarah [--speed 0.9] [--pitch 0.95]
Needs ELEVENLABS_API_KEY in the environment (never printed) and ffmpeg on PATH.
Items come from src/data: letters, phrases (tags), wordlist, default names. Raw renders are
cached in seed/voice-raw/<kind>/<key>.mp3, so a rerun only renders new or changed items.
"""
import argparse
import json
import os
import pathlib
import re
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
EL = "https://api.elevenlabs.io/v1"
MODEL_PREF = ["eleven_v4", "eleven_v4_turbo", "eleven_v3"]
# Unspoken context so a 3-letter Cyrillic word is not read as Russian.
SR_CONTEXT = "Ово је српски језик, екавица. Следи кратка реч за дете."
LATIN = dict(zip(
    "АБВГДЂЕЖЗИЈКЛЉМНЊОПРСТЋУФХЦЧЏШ",
    ["a", "b", "v", "g", "d", "dj", "e", "zh", "z", "i", "j", "k", "l", "lj", "m", "n", "nj", "o", "p", "r", "s",
     "t", "tj", "u", "f", "h", "c", "ch", "dzh", "sh"],
))


def slug(key: str) -> str:
    return "".join(LATIN.get(ch, ch.lower() if ch.isascii() else "_") for ch in key)


def items() -> list[tuple[str, str, str]]:
    """(kind, key, text to speak) for every clip the app can play."""
    out: list[tuple[str, str, str]] = []
    src = (ROOT / "src/data/letters.ts").read_text(encoding="utf8")
    out += [("letter", g, f"{g}.") for g in re.search(r'Array\.from\("([^"]+)"\)', src).group(1)]
    src = (ROOT / "src/data/phrases.ts").read_text(encoding="utf8")
    # The default voice has no kid name, so the name phrase says the plain praise.
    out += [("phrase", tag, text.replace(", {име}", "")) for tag, text in re.findall(r'tag: "([^"]+)", text: "([^"]+)"', src)]
    for w in json.loads((ROOT / "src/data/wordlist.json").read_text(encoding="utf8")):
        out.append(("word", w["cyrillic"], w["cyrillic"].capitalize() + "."))
    src = (ROOT / "src/data/names.ts").read_text(encoding="utf8")
    out += [("name", n, n.capitalize() + ".") for n in re.findall(r'"([А-ЯЂЈЉЊЋЏ]+)"', src)]
    return out


def http(url: str, headers: dict, body: dict | None = None) -> bytes:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", **headers})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} from {url.split('?')[0]}: {e.read()[:300]!r}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", required=True, help="ElevenLabs voice name, prefix match")
    ap.add_argument("--speed", type=float, default=0.9)
    ap.add_argument("--pitch", type=float, default=0.95)
    a = ap.parse_args()
    key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not key:
        sys.exit("ELEVENLABS_API_KEY is empty")
    h = {"xi-api-key": key}
    raw_dir, pub, manifest_path = ROOT / "seed/voice-raw", ROOT / "public/voice", ROOT / "src/data/voice-manifest.json"

    todo = items()
    slugs = {}
    for kind, k, _ in todo:
        s = f"{kind}/{slug(k)}"
        if s in slugs:
            sys.exit(f"slug collision: {k} and {slugs[s]} both map to {s}")
        slugs[s] = k

    missing = [(kind, k, t) for kind, k, t in todo if not (raw_dir / kind / f"{k}.mp3").exists()]
    if missing:
        models = {m["model_id"] for m in json.loads(http(f"{EL}/models", h))}
        model = next(m for m in MODEL_PREF if m in models)
        voices = json.loads(http(f"{EL}/voices", h))["voices"]
        voice = next(v for v in voices if v["name"].lower().startswith(a.voice.lower()))
        print(f"rendering {len(missing)} items with {model} / {voice['name']}")
        url = f"{EL}/text-to-speech/{voice['voice_id']}?output_format=mp3_44100_128"
        for kind, k, text in missing:
            body = {
                "text": text,
                "model_id": model,
                "language_code": "sr",
                "previous_text": SR_CONTEXT,
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "speed": a.speed},
            }
            p = raw_dir / kind / f"{k}.mp3"
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(http(url, h, body))
        print(f"rendered chars: {sum(len(t) for _, _, t in missing)}")

    filt = f"asetrate=44100*{a.pitch},aresample=44100,atempo={1 / a.pitch:.5f}"
    manifest = {}
    for kind, k, _ in todo:
        rel = f"voice/{kind}/{slug(k)}.mp3"
        dst = ROOT / "public" / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw_dir / kind / f"{k}.mp3"), "-af", filt, str(dst)], check=True)
        manifest[f"{kind}:{k}"] = rel
    manifest_path.write_text(json.dumps(dict(sorted(manifest.items())), ensure_ascii=False, indent=0) + "\n", encoding="utf8")
    total = sum((ROOT / "public" / f).stat().st_size for f in manifest.values())
    print(f"manifest: {len(manifest)} clips, {total // 1024} KB in public/voice")


if __name__ == "__main__":
    main()
