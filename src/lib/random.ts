export function shuffle<T>(arr: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickDistractors<T>(
  target: T,
  pool: readonly T[],
  n: number,
  rand: () => number = Math.random,
  near: (v: T) => boolean = () => true,
): T[] {
  const cands = [...new Set(pool)].filter((v) => v !== target);
  const close = shuffle(cands.filter(near), rand);
  const far = shuffle(cands.filter((v) => !near(v)), rand);
  return [...close, ...far].slice(0, n);
}
