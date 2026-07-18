import { mulberry32 } from './prng';

/**
 * Halftone screens for the density pipeline. Both take grayscale density
 * ImageData (R=G=B, black = full ink) and return a binary version: every
 * pixel is either full ink (0) or no ink (255). Alpha is preserved.
 */

export const BLUE_NOISE_SIZE = 64;

// Fixed seed so the grain pattern is identical across preview and export.
const BLUE_NOISE_SEED = 0x9e3779b9;

let cachedBlueNoise: Float32Array | null = null;

/**
 * 64×64 blue-noise threshold matrix in [0, 1), generated once via the
 * void-and-cluster method (Ulichney 1993) on a toroidal domain. Each rank
 * 0..n-1 appears exactly once, so thresholding uniform density d inks a
 * d-fraction of pixels with an even, grain-like distribution.
 */
export function getBlueNoiseThresholds(): Float32Array {
  if (!cachedBlueNoise) {
    cachedBlueNoise = generateBlueNoise(BLUE_NOISE_SIZE, BLUE_NOISE_SEED);
  }
  return cachedBlueNoise;
}

function generateBlueNoise(size: number, seed: number): Float32Array {
  const n = size * size;
  const rng = mulberry32(seed);
  const sigma = 1.9;

  // Gaussian energy contribution table over wrapped (toroidal) offsets.
  const kernel = new Float32Array(n);
  for (let dy = 0; dy < size; dy++) {
    const wy = Math.min(dy, size - dy);
    for (let dx = 0; dx < size; dx++) {
      const wx = Math.min(dx, size - dx);
      kernel[dy * size + dx] = Math.exp(-(wx * wx + wy * wy) / (2 * sigma * sigma));
    }
  }

  const energy = new Float32Array(n);
  const pattern = new Uint8Array(n);

  function addEnergy(idx: number, sign: number) {
    const px = idx % size;
    const py = (idx / size) | 0;
    for (let y = 0; y < size; y++) {
      const rowK = (((y - py) % size + size) % size) * size;
      const rowE = y * size;
      for (let x = 0; x < size; x++) {
        const dx = ((x - px) % size + size) % size;
        energy[rowE + x] += sign * kernel[rowK + dx];
      }
    }
  }

  // Argmax of energy among pattern==value (tightest cluster when value=1).
  function tightestCluster(): number {
    let best = -1;
    let bestE = -Infinity;
    for (let i = 0; i < n; i++) {
      if (pattern[i] === 1 && energy[i] > bestE) {
        bestE = energy[i];
        best = i;
      }
    }
    return best;
  }

  // Argmin of energy among pattern==0 (largest void).
  function largestVoid(): number {
    let best = -1;
    let bestE = Infinity;
    for (let i = 0; i < n; i++) {
      if (pattern[i] === 0 && energy[i] < bestE) {
        bestE = energy[i];
        best = i;
      }
    }
    return best;
  }

  // Initial prototype pattern: ~10% random minority pixels.
  const initialCount = Math.max(1, Math.round(n / 10));
  let placed = 0;
  while (placed < initialCount) {
    const idx = Math.floor(rng() * n);
    if (pattern[idx] === 0) {
      pattern[idx] = 1;
      addEnergy(idx, 1);
      placed++;
    }
  }

  // Relaxation: move minority pixels from tightest cluster to largest void
  // until the pattern is stable.
  for (let iter = 0; iter < n; iter++) {
    const cluster = tightestCluster();
    pattern[cluster] = 0;
    addEnergy(cluster, -1);
    const voidIdx = largestVoid();
    pattern[voidIdx] = 1;
    addEnergy(voidIdx, 1);
    if (voidIdx === cluster) break;
  }

  const ranks = new Int32Array(n);

  // Phase 1: rank the prototype's minority pixels by removing tightest
  // clusters (work on copies so the prototype survives for phase 2).
  const protoPattern = pattern.slice();
  const protoEnergy = energy.slice();
  for (let rank = initialCount - 1; rank >= 0; rank--) {
    const idx = tightestCluster();
    pattern[idx] = 0;
    addEnergy(idx, -1);
    ranks[idx] = rank;
  }

  // Phases 2+3: restore the prototype, then fill largest voids in order.
  // (Beyond 50% coverage this criterion equals removing the tightest cluster
  // of the zero-minority, since zero-energy = const − one-energy on a torus.)
  pattern.set(protoPattern);
  energy.set(protoEnergy);
  for (let rank = initialCount; rank < n; rank++) {
    const idx = largestVoid();
    pattern[idx] = 1;
    addEnergy(idx, 1);
    ranks[idx] = rank;
  }

  const thresholds = new Float32Array(n);
  for (let i = 0; i < n; i++) thresholds[i] = (ranks[i] + 0.5) / n;
  return thresholds;
}

/**
 * Stochastic (FM) halftone: downsample density into scale×scale cells,
 * threshold each cell against the tiled blue-noise matrix, and write the
 * binary result back at full resolution. `scale` is the grain size in
 * full-resolution pixels.
 */
export function applyStochasticHalftone(density: ImageData, scale: number): ImageData {
  const s = Math.max(1, Math.round(scale));
  const { width, height, data } = density;
  const out = new ImageData(width, height);
  const dst = out.data;
  const noise = getBlueNoiseThresholds();
  const cellsX = Math.ceil(width / s);
  const cellsY = Math.ceil(height / s);

  for (let cy = 0; cy < cellsY; cy++) {
    const y0 = cy * s;
    const y1 = Math.min(y0 + s, height);
    const noiseRow = (cy % BLUE_NOISE_SIZE) * BLUE_NOISE_SIZE;
    for (let cx = 0; cx < cellsX; cx++) {
      const x0 = cx * s;
      const x1 = Math.min(x0 + s, width);

      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y++) {
        const row = y * width;
        for (let x = x0; x < x1; x++) {
          sum += 255 - data[(row + x) * 4];
          count++;
        }
      }
      const cellDensity = sum / count / 255;
      const gray = cellDensity > noise[noiseRow + (cx % BLUE_NOISE_SIZE)] ? 0 : 255;

      for (let y = y0; y < y1; y++) {
        const row = y * width;
        for (let x = x0; x < x1; x++) {
          const i = (row + x) * 4;
          dst[i] = gray;
          dst[i + 1] = gray;
          dst[i + 2] = gray;
          dst[i + 3] = data[i + 3];
        }
      }
    }
  }

  return out;
}

/**
 * AM (amplitude modulation) halftone: classic round-dot screen on a grid
 * rotated by `angleDeg`, with dot pitch `spacingPx` (full-resolution pixels).
 * Uses the standard cosine spot function — threshold is 0 at cell centers and
 * 1 at cell corners — so dots grow from points through diamonds to inverse
 * holes across the full density range.
 */
export function applyAMHalftone(
  density: ImageData,
  spacingPx: number,
  angleDeg: number,
): ImageData {
  const { width, height, data } = density;
  const out = new ImageData(width, height);
  const dst = out.data;
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const freq = (2 * Math.PI) / Math.max(1, spacingPx);

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const i = (row + x) * 4;
      const d = (255 - data[i]) / 255;
      const u = x * cos + y * sin;
      const v = -x * sin + y * cos;
      const threshold = 0.5 - 0.25 * (Math.cos(u * freq) + Math.cos(v * freq));
      const gray = d > threshold ? 0 : 255;
      dst[i] = gray;
      dst[i + 1] = gray;
      dst[i + 2] = gray;
      dst[i + 3] = data[i + 3];
    }
  }

  return out;
}

/**
 * Default screen angles per layer index, staggered to avoid moiré between
 * layers (used when `halftoneAngle` is null / "auto").
 */
export const AM_AUTO_ANGLES = [0, 15, 45, 75] as const;

export function autoScreenAngle(layerIndex: number): number {
  return AM_AUTO_ANGLES[layerIndex % AM_AUTO_ANGLES.length];
}
