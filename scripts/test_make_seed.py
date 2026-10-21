import base64
import importlib.util
import os
import re
import sqlite3
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("make_seed", Path(__file__).with_name("make-seed.py"))
make_seed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(make_seed)

ISO = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")


class SeedTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        d = self.root = Path(self.tmp.name)
        db = sqlite3.connect(d / "state.db")
        db.execute("create table profile(id integer primary key, name text, created_at text, coins integer)")
        db.execute("create table round_log(id integer primary key, profile_id integer, unit text, prompt text, correct integer, created_at text)")
        db.execute("insert into profile values (1,'X','2026-05-07 00:00:00',8)")
        db.execute("insert into round_log values (1,1,'recognize','Б',1,'2026-05-07 18:41:12.258182')")
        db.execute("insert into round_log values (2,1,'draw','А',0,'2026-05-08 09:00:00')")
        db.commit()
        db.close()
        (d / "recordings/letters/_orig").mkdir(parents=True)
        (d / "recordings/names").mkdir(parents=True)
        (d / "recordings/letters/Б.mp3").write_bytes(b"ID3x")
        (d / "recordings/letters/_orig/Б.mp3").write_bytes(b"old")
        (d / "recordings/names/АНА.mp3").write_bytes(b"ID3n")
        (d / "drawings/Б").mkdir(parents=True)
        for n in ("a.png", "b.png"):
            p = d / "drawings/Б" / n
            p.write_bytes(b"\x89PNG")
            os.utime(p, (1_700_000_000, 1_700_000_000))
        self.b = make_seed.build(d, 300)

    def tearDown(self):
        self.tmp.cleanup()

    def test_round_time_is_iso_z(self):
        t = [r["t"] for r in self.b["rounds"]]
        self.assertTrue(all(ISO.match(x) and "T" in x and x.endswith("Z") for x in t))
        self.assertEqual(t, ["2026-05-07T18:41:12.258Z", "2026-05-08T09:00:00.000Z"])
        self.assertEqual([r["c"] for r in self.b["rounds"]], [True, False])

    def test_opening_coins_from_profile(self):
        self.assertEqual(self.b["settings"]["opening"]["coins"], 8)

    def test_clip_b64_round_trips(self):
        clips = self.b["clips"]
        self.assertEqual(len(clips), 2)
        letter = next(c for c in clips if c["kind"] == "letter")
        self.assertEqual(base64.b64decode(letter["b64"]), b"ID3x")
        self.assertEqual(letter["mime"], "audio/mpeg")

    def test_names_from_dir(self):
        self.assertEqual(self.b["settings"]["names"], ["АНА"])

    def test_seeded_at_is_last_round(self):
        self.assertEqual(self.b["settings"]["seededAt"], "2026-05-08T09:00:00.000Z")

    def test_drawing_at_unique(self):
        d = self.b["drawings"]
        self.assertEqual(len(d), 2)
        self.assertEqual(len({x["at"] for x in d}), 2)
        self.assertLess(d[0]["at"], d[1]["at"])


if __name__ == "__main__":
    unittest.main()
