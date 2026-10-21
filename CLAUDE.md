# CLAUDE.md

## What this is

Кликер (repo kliker): client-only offline PWA for a Cyrillic / numbers / drawing game for a small child. No backend. Audio = a parent's recordings in IndexedDB, with the bundled default voice in `public/voice` (generated once by `scripts/make-voice.py`, see `public/voice/ATTRIBUTION.md`) as the fallback per item. No speech synthesis at runtime. All state lives in the browser (IndexedDB). Served at https://kliker.lazarevic.me from GitHub Pages.

Stack: React 18, Vite 5, TypeScript 5, vitest 3, vite-plugin-pwa 0.21, tesseract.js 7.

## Commands

- `npm run dev` : Vite dev server
- `npm test` : vitest run (jsdom, fake-indexeddb)
- `npm run build` : `tsc -b && vite build`
- `npm install` runs `scripts/copy-tesseract.mjs`, which fills `public/tesseract/` (gitignored)

## Global Constraints

- No `fetch`, no network, no speech synthesis anywhere in `src/`. Audio is Blobs from IndexedDB or the precached `public/voice` clips listed in `src/data/voice-manifest.json`.
- Personal data never enters git: `seed/` and `public/tesseract/` are gitignored. The bundle holds code, clipart, backgrounds, icons, tessdata, tesseract runtime, the default voice.
- Child side: uppercase Serbian Cyrillic, ekavian. Parent side: sentence case, plain spoken words, imperative buttons, impersonal sentences, no computer jargon (датотека, извоз, резервна копија).
- Fail-soft audio: `playClip` never rejects and resolves at once when a clip is missing. `unlockAudio` stays on the root `onPointerDown`.
- Constants, named and exported: `BAR_MAX = 10`, `RAINBOWS_PER_COIN = 10`, `DECAY_DAYS = 14`, `MAX_DRAWINGS = 300`, `WEAK_BOX_THRESHOLD = 3`, `NEW_ITEM_RATIO = 0.2`, `LOCK_PRESS_MS = 2000`, lock digits 2 to 9.
- Unit weights verbatim from the old `App.tsx`: letter 16, counting 10, countscene 12, math 14, whack 10, rain 8, read 12, readdraw 8, draw 6, drawname 3, leftright 2. v2 names the letter unit `recognize` everywhere.
- Round row: `{ u: Unit; p: string; c: boolean; t: string }`, `t` ISO 8601 UTC ending in `Z`. Rows are appended in time order, never edited.
- Rewards replay only rows with `t > settings.seededAt`. Total correct, mastery, stats and idle time use all rows.
- Clip keys: `clip:<kind>:<key>`, kind in `letter | phrase | name | word`, key is the Cyrillic glyph, phrase tag, name, or word. Drawing keys: `draw:<ISO time>`.
- Tests: vitest, pure modules first. Tests pass before every commit.
- Commit messages: plain, no co-author or tool attribution trailers in this public repo.
- Old `CLAUDE.md` hard rules carry over: no accounts, no cloud sync, no fail-shaming, no timers, no lowercase, no Latin, no iOS workarounds.

## Pointers

- Spec and plan: private, kept outside this repo.
- Old server app `~/projects/doodee` is reference only. Never run it.
