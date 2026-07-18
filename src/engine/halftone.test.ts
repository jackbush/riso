import { describe, it, expect, beforeAll } from 'vitest';
import {
  BLUE_NOISE_SIZE,
  getBlueNoiseThresholds,
  applyStochasticHalftone,
  applyAMHalftone,
  autoScreenAngle,
  AM_AUTO_ANGLES,
} from './halftone';

// jsdom doesn't provide ImageData — polyfill for tests
beforeAll(() => {
  if (typeof globalThis.ImageData === 'undefined') {
    (globalThis as Record<string, unknown>).ImageData = class ImageData {
      width: number;
      height: number;
      data: Uint8ClampedArray;
      constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
        this.data = new Uint8ClampedArray(w * h * 4);
      }
    };
  }
});

function makeUniform(w: number, h: number, gray: number, alpha = 255): ImageData {
  const img = new ImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = gray;
    img.data[i + 1] = gray;
    img.data[i + 2] = gray;
    img.data[i + 3] = alpha;
  }
  return img;
}

/** Fraction of pixels that are full ink (gray = 0). */
function inkCoverage(img: ImageData): number {
  let ink = 0;
  const count = img.width * img.height;
  for (let i = 0; i < count; i++) {
    if (img.data[i * 4] === 0) ink++;
  }
  return ink / count;
}

function isBinary(img: ImageData): boolean {
  const count = img.width * img.height;
  for (let i = 0; i < count; i++) {
    const v = img.data[i * 4];
    if (v !== 0 && v !== 255) return false;
    if (img.data[i * 4 + 1] !== v || img.data[i * 4 + 2] !== v) return false;
  }
  return true;
}

// ------- blue-noise threshold matrix -------

describe('getBlueNoiseThresholds', () => {
  it('has the expected size and range', () => {
    const noise = getBlueNoiseThresholds();
    expect(noise.length).toBe(BLUE_NOISE_SIZE * BLUE_NOISE_SIZE);
    for (const t of noise) {
      expect(t).toBeGreaterThan(0);
      expect(t).toBeLessThan(1);
    }
  });

  it('is a permutation of evenly spaced thresholds (each rank used once)', () => {
    const noise = getBlueNoiseThresholds();
    const n = noise.length;
    const sorted = Array.from(noise).sort((a, b) => a - b);
    for (let i = 0; i < n; i++) {
      expect(sorted[i]).toBeCloseTo((i + 0.5) / n, 10);
    }
  });

  it('is deterministic (cached instance)', () => {
    expect(getBlueNoiseThresholds()).toBe(getBlueNoiseThresholds());
  });
});

// ------- stochastic halftone -------

describe('applyStochasticHalftone', () => {
  it('produces only binary pixels', () => {
    const img = makeUniform(64, 64, 128);
    expect(isBinary(applyStochasticHalftone(img, 1))).toBe(true);
  });

  it('white input → no ink, black input → all ink', () => {
    expect(inkCoverage(applyStochasticHalftone(makeUniform(64, 64, 255), 1))).toBe(0);
    expect(inkCoverage(applyStochasticHalftone(makeUniform(64, 64, 0), 1))).toBe(1);
  });

  it('mid-gray coverage approximates the input density', () => {
    // gray=128 → density ≈ 0.498; matrix is a full permutation so at scale 1
    // over one full 64×64 tile, coverage is exact to within one rank.
    const out = applyStochasticHalftone(makeUniform(64, 64, 128), 1);
    expect(inkCoverage(out)).toBeCloseTo((255 - 128) / 255, 1);
  });

  it('coverage is monotonic in density', () => {
    const light = inkCoverage(applyStochasticHalftone(makeUniform(64, 64, 192), 1));
    const mid = inkCoverage(applyStochasticHalftone(makeUniform(64, 64, 128), 1));
    const dark = inkCoverage(applyStochasticHalftone(makeUniform(64, 64, 64), 1));
    expect(light).toBeLessThan(mid);
    expect(mid).toBeLessThan(dark);
  });

  it('scale groups pixels into uniform scale×scale cells', () => {
    const out = applyStochasticHalftone(makeUniform(64, 64, 128), 2);
    for (let cy = 0; cy < 32; cy++) {
      for (let cx = 0; cx < 32; cx++) {
        const base = out.data[(cy * 2 * 64 + cx * 2) * 4];
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            expect(out.data[((cy * 2 + dy) * 64 + cx * 2 + dx) * 4]).toBe(base);
          }
        }
      }
    }
  });

  it('is deterministic', () => {
    const a = applyStochasticHalftone(makeUniform(32, 32, 100), 2);
    const b = applyStochasticHalftone(makeUniform(32, 32, 100), 2);
    expect(a.data).toEqual(b.data);
  });

  it('preserves alpha', () => {
    const out = applyStochasticHalftone(makeUniform(8, 8, 128, 77), 1);
    for (let i = 0; i < out.data.length; i += 4) {
      expect(out.data[i + 3]).toBe(77);
    }
  });
});

// ------- AM halftone -------

describe('applyAMHalftone', () => {
  it('produces only binary pixels', () => {
    const img = makeUniform(64, 64, 128);
    expect(isBinary(applyAMHalftone(img, 8, 0))).toBe(true);
  });

  it('white input → no ink, black input → nearly all ink', () => {
    expect(inkCoverage(applyAMHalftone(makeUniform(64, 64, 255), 8, 0))).toBe(0);
    // threshold reaches 1 only at exact cell corners, so full density inks
    // everything except (at most) those isolated points
    expect(inkCoverage(applyAMHalftone(makeUniform(64, 64, 0), 8, 0))).toBeGreaterThan(0.95);
  });

  it('coverage is monotonic in density', () => {
    const light = inkCoverage(applyAMHalftone(makeUniform(64, 64, 192), 8, 0));
    const mid = inkCoverage(applyAMHalftone(makeUniform(64, 64, 128), 8, 0));
    const dark = inkCoverage(applyAMHalftone(makeUniform(64, 64, 64), 8, 0));
    expect(light).toBeLessThan(mid);
    expect(mid).toBeLessThan(dark);
  });

  it('mid-gray forms a periodic dot pattern at the given spacing', () => {
    const spacing = 8;
    const out = applyAMHalftone(makeUniform(64, 64, 128), spacing, 0);
    // At 0°, the pattern repeats every `spacing` px — but only within the
    // region where u*freq stays clear of floating-point boundary flips, so
    // compare a shifted row well inside the image.
    for (let x = 0; x < 64 - spacing; x++) {
      expect(out.data[(16 * 64 + x) * 4]).toBe(out.data[(16 * 64 + x + spacing) * 4]);
    }
  });

  it('screen angle changes the pattern', () => {
    const img = makeUniform(64, 64, 128);
    const a = applyAMHalftone(img, 8, 0);
    const b = applyAMHalftone(img, 8, 45);
    expect(a.data).not.toEqual(b.data);
  });

  it('preserves alpha', () => {
    const out = applyAMHalftone(makeUniform(8, 8, 128, 33), 8, 15);
    for (let i = 0; i < out.data.length; i += 4) {
      expect(out.data[i + 3]).toBe(33);
    }
  });
});

// ------- auto screen angles -------

describe('autoScreenAngle', () => {
  it('staggers angles per layer index and wraps', () => {
    expect(autoScreenAngle(0)).toBe(AM_AUTO_ANGLES[0]);
    expect(autoScreenAngle(1)).toBe(AM_AUTO_ANGLES[1]);
    expect(autoScreenAngle(2)).toBe(AM_AUTO_ANGLES[2]);
    expect(autoScreenAngle(3)).toBe(AM_AUTO_ANGLES[3]);
    expect(autoScreenAngle(4)).toBe(AM_AUTO_ANGLES[0]);
  });
});
