import { phraseText } from "./phrases";

test("phraseText substitutes the kid name", () => { expect(phraseText("bravo_ime", "МАЈА")).toBe("Браво, МАЈА!"); });
test("phraseText falls back to Браво! without a name", () => { expect(phraseText("bravo_ime", "")).toBe("Браво!"); });
test("phraseText leaves other tags unchanged", () => { expect(phraseText("tacno", "МАЈА")).toBe("Тачно!"); });
