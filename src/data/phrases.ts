export type Phrase = {
  tag: string;
  text: string;
  mood: "praise" | "encourage" | "prompt" | "direction" | "math" | "number";
};

export const PHRASES: Phrase[] = [
  // Praise
  { tag: "bravo", text: "Браво!", mood: "praise" },
  { tag: "bravo_ime", text: "Браво, {име}!", mood: "praise" },
  { tag: "tacno", text: "Тачно!", mood: "praise" },
  { tag: "odlicno", text: "Одлично!", mood: "praise" },
  { tag: "super", text: "Супер!", mood: "praise" },
  { tag: "svaka_cast", text: "Свака част!", mood: "praise" },
  // Praise stays neutral: no gender, no "Dad", so a pack fits any family.
  { tag: "sjajno", text: "Сјајно!", mood: "praise" },
  { tag: "tako_je", text: "Тако је!", mood: "praise" },

  // Encourage
  { tag: "probaj_jos_jednom", text: "Пробај још једном.", mood: "encourage" },
  { tag: "skoro", text: "Скоро!", mood: "encourage" },
  { tag: "hajde_jos_malo", text: "Хајде, још мало.", mood: "encourage" },
  { tag: "ne_brini", text: "Не брини, успећеш.", mood: "encourage" },

  // Prompts
  { tag: "sta_cujes", text: "Шта чујеш?", mood: "prompt" },
  { tag: "dodirni_slovo", text: "Додирни слово.", mood: "prompt" },
  { tag: "koliko", text: "Колико?", mood: "prompt" },

  // Count-the-scene questions
  { tag: "koliko_ptica", text: "Колико птица?", mood: "prompt" },
  { tag: "koliko_kuca", text: "Колико куца?", mood: "prompt" },
  { tag: "koliko_maca", text: "Колико маца?", mood: "prompt" },
  { tag: "koliko_dece", text: "Колико деце?", mood: "prompt" },
  { tag: "koliko_riba", text: "Колико риба?", mood: "prompt" },
  { tag: "koliko_pataka", text: "Колико патака?", mood: "prompt" },
  { tag: "koliko_zeka", text: "Колико зека?", mood: "prompt" },
  { tag: "koliko_cvetova", text: "Колико цветова?", mood: "prompt" },

  // Directions
  { tag: "levo", text: "Лево", mood: "direction" },
  { tag: "desno", text: "Десно", mood: "direction" },

  // Math operators
  { tag: "plus", text: "Плус", mood: "math" },

  // Numbers 0-15 (same order as NUMBER_TAGS)
  { tag: "nula", text: "Нула", mood: "number" },
  { tag: "jedan", text: "Један", mood: "number" },
  { tag: "dva", text: "Два", mood: "number" },
  { tag: "tri", text: "Три", mood: "number" },
  { tag: "cetiri", text: "Четири", mood: "number" },
  { tag: "pet", text: "Пет", mood: "number" },
  { tag: "sest", text: "Шест", mood: "number" },
  { tag: "sedam", text: "Седам", mood: "number" },
  { tag: "osam", text: "Осам", mood: "number" },
  { tag: "devet", text: "Девет", mood: "number" },
  { tag: "deset", text: "Десет", mood: "number" },
  { tag: "jedanaest", text: "Једанаест", mood: "number" },
  { tag: "dvanaest", text: "Дванаест", mood: "number" },
  { tag: "trinaest", text: "Тринаест", mood: "number" },
  { tag: "cetrnaest", text: "Четрнаест", mood: "number" },
  { tag: "petnaest", text: "Петнаест", mood: "number" },
];

export function phraseText(tag: string, kidName: string): string {
  const p = PHRASES.find((x) => x.tag === tag);
  if (!p) return tag;
  if (tag === "bravo_ime" && !kidName) return "Браво!";
  return p.text.replace("{име}", kidName);
}
