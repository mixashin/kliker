"""Convert the old server app's data folder (~/.doodee) into a Кликер backup JSON."""
import argparse
import base64
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def parse_ts(s):
    for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            pass
    raise ValueError("bad created_at")


def b64(p):
    return base64.b64encode(p.read_bytes()).decode("ascii")


def build(data, n_drawings):
    now = datetime.now(timezone.utc)
    db = sqlite3.connect(data / "state.db")
    rounds = [
        {"u": u, "p": p, "c": bool(c), "t": iso(parse_ts(t))}
        for u, p, c, t in db.execute("SELECT unit, prompt, correct, created_at FROM round_log ORDER BY id")
    ]
    row = db.execute("SELECT coins FROM profile ORDER BY id LIMIT 1").fetchone()
    db.close()

    rec = data / "recordings"
    clips = []
    for kind, folder in (("letter", "letters"), ("phrase", "phrases"), ("name", "names"), ("word", "words")):
        # Top-level files only: _orig and _old_mila subfolders are never entered.
        for p in sorted((rec / folder).glob("*.mp3")):
            clips.append({"kind": kind, "key": p.stem, "mime": "audio/mpeg", "b64": b64(p)})
    names = sorted(p.stem for p in (rec / "names").glob("*.mp3"))

    files = sorted(
        (f for f in (data / "drawings").glob("*/*.png")), key=lambda f: f.stat().st_mtime_ns, reverse=True
    )[:n_drawings]
    drawings, seen = [], set()
    for f in reversed(files):  # oldest first
        ms = f.stat().st_mtime_ns // 1_000_000
        while ms in seen:
            ms += 1
        seen.add(ms)
        at = iso(datetime.fromtimestamp(ms / 1000, timezone.utc))
        drawings.append({"target": f.parent.name, "at": at, "mime": "image/png", "b64": b64(f)})

    exported = iso(now)
    return {
        "version": 1,
        "exportedAt": exported,
        "settings": {
            "kidName": "",
            "names": names,
            "seededAt": rounds[-1]["t"] if rounds else "",
            "opening": {"coins": row[0] if row else 0, "rainbows": 0, "bestStreak": 0, "totalCorrect": 0},
            "redeemed": 0,
            "lastExportAt": exported,
        },
        "rounds": rounds,
        "clips": clips,
        "drawings": drawings,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="~/.doodee")
    ap.add_argument("--out", default="seed/backup.json")
    ap.add_argument("--drawings", type=int, default=300)
    a = ap.parse_args()
    b = build(Path(a.data).expanduser(), a.drawings)
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(b, ensure_ascii=False), encoding="utf-8")
    s = b["settings"]
    print(f"rounds={len(b['rounds'])} clips={len(b['clips'])} drawings={len(b['drawings'])} "
          f"coins={s['opening']['coins']} seededAt={s['seededAt']}")


if __name__ == "__main__":
    main()
