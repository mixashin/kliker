export const LOCK_PRESS_MS = 2000;
export const LOCK_DIGIT_MIN = 2;
export const LOCK_DIGIT_MAX = 9;

const digit = (rand: () => number) =>
  LOCK_DIGIT_MIN + Math.floor(rand() * (LOCK_DIGIT_MAX - LOCK_DIGIT_MIN + 1));

export function makeGate(rand: () => number = Math.random): {
  a: number;
  b: number;
  check(answer: string): boolean;
} {
  const a = digit(rand);
  const b = digit(rand);
  return {
    a,
    b,
    check: (answer) => {
      const s = answer.trim();
      return /^\d+$/.test(s) && parseInt(s, 10) === a * b;
    },
  };
}
