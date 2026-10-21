import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const nm = "node_modules";
const dest = join("public", "tesseract");
const core = join(nm, "tesseract.js-core");
const worker = join(nm, "tesseract.js", "dist", "worker.min.js");

if (!existsSync(worker) || !existsSync(core)) {
  console.log("copy-tesseract: tesseract.js not installed yet, skipping");
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
const files = [
  worker,
  ...readdirSync(core)
    .filter((f) => f.startsWith("tesseract-core") && f.includes(".wasm"))
    .map((f) => join(core, f)),
];
for (const f of files) copyFileSync(f, join(dest, f.split(/[\\/]/).pop()));
console.log(`copy-tesseract: copied ${files.length} files to ${dest}`);
