# Bundled voice

The clips in this folder are the app's default voice: every letter, phrase, word and default friend name. A parent's own recording for the same item takes priority on the device.

Generated on 2026-10-21 with ElevenLabs (model Eleven v4, premade voice "Sarah", Serbian forced, speed 0.9), then lowered 5 % in pitch with ffmpeg. ElevenLabs free-tier output: non-commercial use, attribution to ElevenLabs required. This app is free and non-commercial.

Regenerate after a text change: `python scripts/make-voice.py --voice Sarah` with `ELEVENLABS_API_KEY` in the environment. Already rendered items are reused from `seed/voice-raw/`.
