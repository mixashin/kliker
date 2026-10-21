import { readFileSync } from "node:fs";
import { parseBackup } from "../src/store/backup";

const b = parseBackup(readFileSync(process.argv[2], "utf8"));
const d = b.drawings ?? [];
console.log(
  `rounds=${b.rounds?.length} clips=${b.clips?.length} drawings=${d.length} ` +
    `distinctAt=${new Set(d.map((x) => x.at)).size} coins=${b.settings?.opening.coins} seededAt=${b.settings?.seededAt}`,
);
