/**
 * Deterministic 32-bit PRNG (mulberry32). Returns a function producing
 * floats in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** djb2 string hash, for deriving a stable per-layer seed from a layer id. */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

/**
 * Combine a base seed with a layer id into a per-layer seed. Keyed by id
 * (not array index) so reordering layers doesn't reshuffle their jitter.
 */
export function layerSeed(baseSeed: number, layerId: string): number {
  return (baseSeed ^ hashString(layerId)) >>> 0;
}

export interface RegistrationJitter {
  dx: number;
  dy: number;
  rotationDeg: number;
}

/**
 * Per-layer registration jitter: random X/Y shift in [-amount, +amount] px,
 * and random rotation in [-0.3, +0.3] degrees, scaled proportionally to
 * amount (rotation reaches its full ±0.3° range only at the slider max of 10px).
 */
export function computeRegistrationJitter(
  seed: number,
  amount: number,
  layerId: string,
): RegistrationJitter {
  if (amount <= 0) return { dx: 0, dy: 0, rotationDeg: 0 };

  const rng = mulberry32(layerSeed(seed, layerId));
  const dx = (rng() * 2 - 1) * amount;
  const dy = (rng() * 2 - 1) * amount;
  const rotationRange = (amount / 10) * 0.3;
  const rotationDeg = (rng() * 2 - 1) * rotationRange;

  return { dx, dy, rotationDeg };
}
