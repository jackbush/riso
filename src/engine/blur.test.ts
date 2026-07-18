import { describe, it, expect, beforeAll } from 'vitest';
import { densityBoxBlur } from './blur';

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

function makeGrayscale(w: number, h: number, values: number[], alpha = 255): ImageData {
  const img = new ImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    img.data[i * 4] = values[i];
    img.data[i * 4 + 1] = values[i];
    img.data[i * 4 + 2] = values[i];
    img.data[i * 4 + 3] = alpha;
  }
  return img;
}

describe('densityBoxBlur', () => {
  it('radius 0 is a no-op (returns the same object)', () => {
    const gray = makeGrayscale(2, 2, [0, 255, 0, 255]);
    expect(densityBoxBlur(gray, 0)).toBe(gray);
  });

  it('uniform image stays uniform', () => {
    const gray = makeGrayscale(4, 4, new Array(16).fill(128));
    const out = densityBoxBlur(gray, 2);
    for (let i = 0; i < 16; i++) expect(out.data[i * 4]).toBe(128);
  });

  it('smooths a sharp edge without shifting it out of range', () => {
    // Left half black, right half white
    const values = [
      0, 0, 255, 255,
      0, 0, 255, 255,
      0, 0, 255, 255,
      0, 0, 255, 255,
    ];
    const gray = makeGrayscale(4, 4, values);
    const out = densityBoxBlur(gray, 1);

    // Edge column values should move toward the average, not stay pinned at 0/255
    const midY = 1 * 4;
    expect(out.data[(midY + 1) * 4]).toBeGreaterThan(0);
    expect(out.data[(midY + 1) * 4]).toBeLessThan(255);
    expect(out.data[(midY + 2) * 4]).toBeGreaterThan(0);
    expect(out.data[(midY + 2) * 4]).toBeLessThan(255);

    // Values stay within valid range
    for (let i = 0; i < out.data.length; i += 4) {
      expect(out.data[i]).toBeGreaterThanOrEqual(0);
      expect(out.data[i]).toBeLessThanOrEqual(255);
    }
  });

  it('preserves alpha channel unchanged', () => {
    const gray = makeGrayscale(2, 2, [0, 255, 0, 255], 100);
    const out = densityBoxBlur(gray, 1);
    expect(out.data[3]).toBe(100);
    expect(out.data[7]).toBe(100);
    expect(out.data[11]).toBe(100);
    expect(out.data[15]).toBe(100);
  });

  it('preserves dimensions', () => {
    const gray = makeGrayscale(5, 3, new Array(15).fill(50));
    const out = densityBoxBlur(gray, 2);
    expect(out.width).toBe(5);
    expect(out.height).toBe(3);
  });
});
