/** mulberry32 — small deterministic PRNG, public domain (Tommy Ettinger). */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function random() {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle seeded by `seed` — same seed always yields the same order. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const random = mulberry32(seed);
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
