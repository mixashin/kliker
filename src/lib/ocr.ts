// Browser-side OCR for the letter-drawing minigame, via Tesseract.js.
//
// Why client-side: the server-side template comparator turned out to be too
// lenient — distinct Cyrillic letters all look similar after normalization +
// dilation. Tesseract handles the classification and gives us a confidence
// number; we constrain it to single-char mode + a whitelist of the 30
// Cyrillic uppercase glyphs we actually use.
//
// Worker lifecycle: a single tesseract worker is reused across rounds. The
// model file (srp.traineddata, ~10MB) is fetched on first init and cached
// by the browser, so subsequent sessions are instant.
import { createWorker, PSM, type Worker } from "tesseract.js";

const BASE = import.meta.env.BASE_URL;

// Cyrillic uppercase plus Latin lookalikes — Tesseract on the srp model
// often returns Latin chars for visually-identical glyphs (Cyrillic Н ↔
// Latin H, Cyrillic Е ↔ Latin E, etc.). Including them in the whitelist
// lets Tesseract surface those guesses; the SIMILAR map below then maps
// them back to the right Cyrillic target.
const ALLOWED =
  "АБВГДЂЕЖЗИЈКЛЉМНЊОПРСТЋУФХЦЧЏШ" +
  "ABCEHIJKMNOPRSTUVXY";

/** Visually-similar pairs in handwriting. The intent is forgiveness: if
 *  Tesseract reports a letter that *could plausibly look* like the target
 *  when written by a 4-year-old (open-vs-closed loops, similar verticals,
 *  near-rotations), accept it. Includes Latin lookalikes since Tesseract
 *  often hands them back instead of the Cyrillic counterpart. */
const SIMILAR: Record<string, string[]> = {
  "А": ["Д", "A"],
  "Б": ["В", "Е", "Ђ", "Ь", "Ъ", "B"],
  "В": ["Б", "Ь", "B"],            // Cyrillic В ↔ Latin B
  "Г": ["Т", "Л", "Ћ", "Е", "T"],
  "Д": ["А", "Л"],
  "Ђ": ["Ћ", "Б", "Г"],
  "Е": ["Б", "С", "Г", "З", "E"],  // Latin E
  "Ж": ["Х", "К", "X"],
  "З": ["Е", "Э", "Ѕ", "E"],
  "И": ["Н", "Й", "N", "H"],
  "Ј": ["И", "Ћ", "У", "J"],
  "К": ["Х", "Љ", "Ж", "K"],
  "Л": ["П", "Г", "Д", "Н"],
  "Љ": ["Њ", "К", "Л"],
  "М": ["Н", "Ш", "M"],
  "Н": ["И", "П", "М", "Л", "H"],  // Cyrillic Н ↔ Latin H
  "Њ": ["Љ", "Н", "Ь"],
  "О": ["С", "Ц", "Q", "O"],
  "П": ["Л", "Н", "И", "N"],
  "Р": ["В", "Ь", "P"],            // Cyrillic Р ↔ Latin P
  "С": ["О", "Е", "G", "C"],       // Latin C
  "Т": ["Г", "Ћ", "T"],
  "Ћ": ["Ђ", "Г", "Т", "Ј", "T"],
  "У": ["Ј", "У", "Y", "V"],
  "Ф": ["Ѳ"],
  "Х": ["К", "Ж", "X"],
  "Ц": ["О", "Ш", "Щ", "Џ"],
  "Ч": ["Ц", "Ћ", "У"],
  "Џ": ["Ц", "Ш", "Щ"],
  "Ш": ["Щ", "М", "Џ", "M"],
};

function isCloseEnough(target: string, recognized: string): boolean {
  if (!recognized || !target) return false;
  if (recognized === target) return true;
  return (SIMILAR[target] ?? []).includes(recognized);
}

let workerPromise: Promise<Worker> | null = null;

/** Kick off worker init. Call this when the Draw unit mounts so the model
 *  loads in the background while the kid is drawing.
 *
 *  langPath is set to /tessdata so the bundled srp.traineddata.gz under
 *  frontend/public/tessdata/ is used instead of the public CDN. This keeps
 *  the family-local "no cloud" rule intact and means the PWA works offline. */
export function preloadOcr(): Promise<Worker> {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const w = await createWorker("srp", undefined, {
      workerPath: `${BASE}tesseract/worker.min.js`,
      corePath: `${BASE}tesseract`,
      langPath: `${BASE}tessdata`,
    });
    await w.setParameters({
      tessedit_char_whitelist: ALLOWED,
      tessedit_pageseg_mode: PSM.SINGLE_CHAR,
    });
    return w;
  })();
  return workerPromise;
}

/** Convert the live drawing canvas (lavender strokes on transparent) into a
 *  black-on-white canvas with a white border. Tesseract works best with high
 *  contrast, dark text, and a margin around the glyph. */
function preprocess(src: HTMLCanvasElement): HTMLCanvasElement {
  const PAD = 40;
  // Step 1 — render src onto white background at native size.
  const w = src.width, h = src.height;
  const flat = document.createElement("canvas");
  flat.width = w; flat.height = h;
  const fctx = flat.getContext("2d")!;
  fctx.fillStyle = "#ffffff";
  fctx.fillRect(0, 0, w, h);
  fctx.drawImage(src, 0, 0);

  // Step 2 — knock all non-white pixels down to pure black for max contrast.
  const id = fctx.getImageData(0, 0, w, h);
  const px = id.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    if (r < 230 || g < 230 || b < 230) {
      px[i] = 0; px[i + 1] = 0; px[i + 2] = 0;
    } else {
      px[i] = 255; px[i + 1] = 255; px[i + 2] = 255;
    }
    px[i + 3] = 255;
  }
  fctx.putImageData(id, 0, 0);

  // Step 3 — pad with white border.
  const out = document.createElement("canvas");
  out.width = w + PAD * 2;
  out.height = h + PAD * 2;
  const octx = out.getContext("2d")!;
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(flat, PAD, PAD);
  return out;
}

export type LetterOcrResult = {
  ok: boolean;
  reason: string;           // why we said yes/no — useful for tuning
  recognized: string;       // first valid Cyrillic char in output, "" if none
  confidence: number;       // 0..100
  raw: string;              // raw text Tesseract returned
  inkRatio: number;         // 0..1 — fraction of canvas inked
  trace: TraceScore;        // template-trace metrics incl. overdraw
};

// Below this fraction the canvas is considered "blank/scribble" and we don't
// even ask OCR — instant wrong. Tuned so a single short stroke still passes.
const MIN_INK_RATIO = 0.004;

// Trace-zone forgiveness — if most of her ink falls inside the (dilated)
// target glyph's footprint, she clearly meant to write that letter, even if
// Tesseract garbled it. These are intentionally permissive: a wobbly В that
// stays inside the В template should pass.
const TRACE_PRECISION_PASS = 0.55;   // ≥55% of her strokes inside the template region
const TRACE_RECALL_PASS    = 0.15;   // and she covered ≥15% of the template (not just a dot)
// Reject scribbles: if her ink area (after bbox-normalization) is way larger
// than the target template's area, she filled in too much — probably not the
// letter. Real letter attempts have ink area within ~1.7× the template.
const TRACE_OVERDRAW_MAX   = 1.9;

/** Fraction of canvas pixels with non-trivial alpha. Cheap pre-flight check
 *  so we don't trust OCR's "I see nothing" as "kid drew the letter". */
function inkRatio(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = id.data;
  let ink = 0;
  for (let i = 3; i < px.length; i += 4) {
    if (px[i] > 30) ink++;
  }
  return ink / (canvas.width * canvas.height);
}

/** Render the target letter at the same canvas dimensions using the same
 *  font the visible trace template uses, then dilate it via canvas blur to
 *  produce a "where the kid is allowed to draw" mask. */
function buildTemplateMask(w: number, h: number, target: string, dilation: number): Uint8Array {
  const off = document.createElement("canvas");
  off.width = w; off.height = h;
  const ctx = off.getContext("2d");
  if (!ctx) return new Uint8Array(w * h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#000000";
  // Match the visible .draw-template look: weight 900, system-ui-Cyrillic,
  // ~80% of the smaller canvas dimension so the glyph fills the box.
  const fontSize = Math.floor(Math.min(w, h) * 0.80);
  ctx.font = `900 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(target, w / 2, h / 2);

  // Dilate via canvas blur, then threshold. Cheap and GPU-accelerated.
  let pixels: Uint8ClampedArray;
  if (dilation > 0) {
    const blurred = document.createElement("canvas");
    blurred.width = w; blurred.height = h;
    const bctx = blurred.getContext("2d");
    if (!bctx) return new Uint8Array(w * h);
    bctx.filter = `blur(${dilation}px)`;
    bctx.drawImage(off, 0, 0);
    pixels = bctx.getImageData(0, 0, w, h).data;
  } else {
    pixels = ctx.getImageData(0, 0, w, h).data;
  }
  const out = new Uint8Array(w * h);
  // White bg = 255, glyph = 0; after blur the gradient extends into white.
  // Threshold 220 catches everything within ~`dilation` px of the original.
  for (let i = 0; i < out.length; i++) {
    out[i] = pixels[i * 4] < 220 ? 1 : 0;
  }
  return out;
}

function inkMask(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Uint8Array(canvas.width * canvas.height);
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const out = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0; i < out.length; i++) {
    out[i] = px[i * 4 + 3] > 30 ? 1 : 0;
  }
  return out;
}

type TraceScore = { precision: number; recall: number; f1: number; overdraw: number };

const NORM_SIZE = 200;     // common square size to compare masks at
const NORM_DILATE = 18;    // forgiveness halo around the normalized template

/** Find the bounding box of inked pixels, or null if mask is empty. */
function bbox(mask: Uint8Array, w: number, h: number) {
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (mask[row + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Crop the inked region to a square (centered+padded), then resize to a
 *  fixed standard size. Removes translation and scale differences so that
 *  a small letter in the corner and a big letter centered both compare
 *  to the template the same way. */
function normalizeToSquare(mask: Uint8Array, w: number, h: number, size: number): Uint8Array {
  const b = bbox(mask, w, h);
  if (!b) return new Uint8Array(size * size);

  // Render the mask to an intermediate canvas so we can use drawImage's
  // bilinear scaling instead of writing our own resampler.
  const src = document.createElement("canvas");
  src.width = w; src.height = h;
  const sctx = src.getContext("2d");
  if (!sctx) return new Uint8Array(size * size);
  const idata = sctx.createImageData(w, h);
  for (let i = 0; i < mask.length; i++) {
    const v = mask[i] ? 255 : 0;
    idata.data[i * 4]     = v;
    idata.data[i * 4 + 1] = v;
    idata.data[i * 4 + 2] = v;
    idata.data[i * 4 + 3] = 255;
  }
  sctx.putImageData(idata, 0, 0);

  const side = Math.max(b.w, b.h);
  const dest = document.createElement("canvas");
  dest.width = size; dest.height = size;
  const dctx = dest.getContext("2d");
  if (!dctx) return new Uint8Array(size * size);
  dctx.fillStyle = "#000000";
  dctx.fillRect(0, 0, size, size);
  const scale = size / side;
  const dx = ((side - b.w) / 2) * scale;
  const dy = ((side - b.h) / 2) * scale;
  dctx.drawImage(src,
    b.minX, b.minY, b.w, b.h,
    dx, dy, b.w * scale, b.h * scale);

  const px = dctx.getImageData(0, 0, size, size).data;
  const out = new Uint8Array(size * size);
  for (let i = 0; i < out.length; i++) out[i] = px[i * 4] > 128 ? 1 : 0;
  return out;
}

/** Dilate a binary mask via canvas blur — same trick as buildTemplateMask. */
function dilateInBrowser(mask: Uint8Array, size: number, radius: number): Uint8Array {
  const src = document.createElement("canvas");
  src.width = size; src.height = size;
  const sctx = src.getContext("2d");
  if (!sctx) return mask;
  const idata = sctx.createImageData(size, size);
  for (let i = 0; i < mask.length; i++) {
    const v = mask[i] ? 0 : 255;   // black ink, white bg, like buildTemplateMask
    idata.data[i * 4]     = v;
    idata.data[i * 4 + 1] = v;
    idata.data[i * 4 + 2] = v;
    idata.data[i * 4 + 3] = 255;
  }
  sctx.putImageData(idata, 0, 0);
  const dst = document.createElement("canvas");
  dst.width = size; dst.height = size;
  const dctx = dst.getContext("2d");
  if (!dctx) return mask;
  dctx.filter = `blur(${radius}px)`;
  dctx.drawImage(src, 0, 0);
  const px = dctx.getImageData(0, 0, size, size).data;
  const out = new Uint8Array(size * size);
  for (let i = 0; i < out.length; i++) out[i] = px[i * 4] < 220 ? 1 : 0;
  return out;
}

/** Compare her drawing against the target-letter mask after normalizing
 *  both to a common bbox-fitted square. Translation- and scale-invariant. */
function traceZoneScore(canvas: HTMLCanvasElement, target: string): TraceScore {
  const w = canvas.width, h = canvas.height;
  const userInk  = inkMask(canvas);
  const tplPlain = buildTemplateMask(w, h, target, 0);

  const userNorm = normalizeToSquare(userInk,  w, h, NORM_SIZE);
  const tplNorm  = normalizeToSquare(tplPlain, w, h, NORM_SIZE);
  const tplNormDil = dilateInBrowser(tplNorm, NORM_SIZE, NORM_DILATE);

  let inside = 0, totalInk = 0, tplArea = 0;
  for (let i = 0; i < userNorm.length; i++) {
    if (userNorm[i]) {
      totalInk++;
      if (tplNormDil[i]) inside++;
    }
    if (tplNorm[i]) tplArea++;
  }
  if (totalInk === 0 || tplArea === 0) return { precision: 0, recall: 0, f1: 0, overdraw: 0 };
  const precision = inside / totalInk;
  const recall    = inside / tplArea;   // recall vs. the un-dilated template
  const overdraw  = totalInk / tplArea; // 1.0 = same area as template, >>1 = scribble
  const denom = precision + recall;
  const f1 = denom > 0 ? (2 * precision * recall) / denom : 0;
  return { precision, recall, f1, overdraw };
}

export async function recognizeLetter(
  src: HTMLCanvasElement,
  target: string,
): Promise<LetterOcrResult> {
  const ratio = inkRatio(src);
  // Always compute the trace score — it's our last-resort "she clearly meant
  // this letter" signal even when OCR comes back wrong.
  const trace = traceZoneScore(src, target);

  // Pre-flight: blank or near-blank canvas is just wrong, full stop.
  if (ratio < MIN_INK_RATIO) {
    return {
      ok: false, reason: "blank",
      recognized: "", confidence: 0, raw: "",
      inkRatio: ratio, trace,
    };
  }

  const worker = await preloadOcr();
  const prepped = preprocess(src);
  const ret = await worker.recognize(prepped);
  const raw = (ret.data.text || "").toUpperCase();
  const confidence = ret.data.confidence ?? 0;
  let recognized = "";
  for (const ch of raw) {
    if (ALLOWED.includes(ch)) { recognized = ch; break; }
  }

  // Acceptance ladder, strongest signal first:
  //   1. OCR exact match
  //   2. Target appears anywhere in raw output (multi-char fallback)
  //   3. Recognized letter is in the target's visual-similarity pool
  //   4. Trace-zone match: most of her ink falls inside the dilated target
  //      glyph footprint and she covered enough of it. This catches the
  //      case where she wrote it correctly but Tesseract garbled the
  //      handwriting.
  let ok = false;
  let reason = "";
  if (recognized === target) {
    ok = true; reason = "exact";
  } else if (raw.includes(target)) {
    ok = true; reason = "substring";
  } else if (recognized && isCloseEnough(target, recognized)) {
    ok = true; reason = "visually-similar";
  } else if (
    trace.precision >= TRACE_PRECISION_PASS &&
    trace.recall    >= TRACE_RECALL_PASS &&
    trace.overdraw  <= TRACE_OVERDRAW_MAX
  ) {
    ok = true;
    reason = `traced-shape (P=${trace.precision.toFixed(2)} R=${trace.recall.toFixed(2)} O=${trace.overdraw.toFixed(2)})`;
  } else if (recognized === "") {
    ok = false;
    reason = `unreadable (traceP=${trace.precision.toFixed(2)} R=${trace.recall.toFixed(2)} O=${trace.overdraw.toFixed(2)})`;
  } else {
    ok = false;
    reason = `mismatch saw=${recognized} (traceP=${trace.precision.toFixed(2)} O=${trace.overdraw.toFixed(2)})`;
  }

  return { ok, reason, recognized, confidence, raw: raw.trim(), inkRatio: ratio, trace };
}
