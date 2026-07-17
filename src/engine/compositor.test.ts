import { describe, it, expect, beforeAll } from 'vitest';
import { hexToRgb, tintGrayscale } from './compositor';
import { getCompositeDimensions } from './renderer';
import { Layer } from '../types';

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

function makeLayer(overrides: Partial<Layer> = {}): Layer {
  return {
    id: 'test',
    name: 'Test',
    imageData: null,
    grayscaleData: null,
    inkColor: { name: 'Black', hex: '#000000' },
    opacity: 1,
    offsetX: 0,
    offsetY: 0,
    visible: true,
    ...overrides,
  };
}

function makeImageData(w: number, h: number, r: number, g: number, b: number, a = 255): ImageData {
  const img = new ImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = r;
    img.data[i + 1] = g;
    img.data[i + 2] = b;
    img.data[i + 3] = a;
  }
  return img;
}

// ------- hexToRgb -------

describe('hexToRgb', () => {
  it('parses standard hex colors', () => {
    expect(hexToRgb('#FF0000')).toEqual([255, 0, 0]);
    expect(hexToRgb('#00FF00')).toEqual([0, 255, 0]);
    expect(hexToRgb('#0000FF')).toEqual([0, 0, 255]);
  });

  it('handles lowercase', () => {
    expect(hexToRgb('#ff8800')).toEqual([255, 136, 0]);
  });

  it('parses black and white', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgb('#FFFFFF')).toEqual([255, 255, 255]);
  });

  it('works without # prefix', () => {
    expect(hexToRgb('AB12CD')).toEqual([171, 18, 205]);
  });
});

// ------- tintGrayscale -------

describe('tintGrayscale', () => {
  it('black pixel → ink color', () => {
    const gray = makeImageData(1, 1, 0, 0, 0); // black
    const out = tintGrayscale(gray, 255, 0, 0); // red ink
    expect(out.data[0]).toBe(255); // R = ink red
    expect(out.data[1]).toBe(0);
    expect(out.data[2]).toBe(0);
  });

  it('white pixel → white (no ink)', () => {
    const gray = makeImageData(1, 1, 255, 255, 255);
    const out = tintGrayscale(gray, 255, 0, 0);
    expect(out.data[0]).toBe(255);
    expect(out.data[1]).toBe(255);
    expect(out.data[2]).toBe(255);
  });

  it('mid-gray produces proportional tint', () => {
    // gray=128, ink=Blue(0, 120, 191)
    const gray = makeImageData(1, 1, 128, 128, 128);
    const out = tintGrayscale(gray, 0, 120, 191);

    // density = (255-128)/255 ≈ 0.498
    // R = round(255 - 0.498 * 255) = round(255 - 127) = 128
    // G = round(255 - 0.498 * 135) = round(255 - 67.2) = 188
    // B = round(255 - 0.498 * 64)  = round(255 - 31.9) = 223
    const density = (255 - 128) / 255;
    const expectedR = Math.round(255 - density * (255 - 0));
    const expectedG = Math.round(255 - density * (255 - 120));
    const expectedB = Math.round(255 - density * (255 - 191));

    expect(out.data[0]).toBe(expectedR);
    expect(out.data[1]).toBe(expectedG);
    expect(out.data[2]).toBe(expectedB);
  });

  it('preserves alpha channel', () => {
    const gray = makeImageData(1, 1, 128, 128, 128, 100);
    const out = tintGrayscale(gray, 255, 0, 0);
    expect(out.data[3]).toBe(100);
  });

  it('preserves transparent pixels', () => {
    const gray = makeImageData(1, 1, 0, 0, 0, 0);
    const out = tintGrayscale(gray, 255, 0, 0);
    expect(out.data[3]).toBe(0);
  });

  it('handles multiple pixels correctly', () => {
    // 2×1: one black pixel, one white pixel
    const gray = new ImageData(2, 1);
    gray.data.set([0, 0, 0, 255, 255, 255, 255, 255]);

    const out = tintGrayscale(gray, 0, 128, 255); // blue-ish ink

    // First pixel (black → full ink)
    expect(out.data[0]).toBe(0);
    expect(out.data[1]).toBe(128);
    expect(out.data[2]).toBe(255);

    // Second pixel (white → no ink → white)
    expect(out.data[4]).toBe(255);
    expect(out.data[5]).toBe(255);
    expect(out.data[6]).toBe(255);
  });
});

// ------- getCompositeDimensions -------

describe('getCompositeDimensions', () => {
  it('uses largest layer dimensions', () => {
    const layers: Layer[] = [
      makeLayer({ grayscaleData: makeImageData(100, 200, 0, 0, 0) }),
      makeLayer({ grayscaleData: makeImageData(300, 100, 0, 0, 0) }),
    ];
    const dims = getCompositeDimensions(layers);
    expect(dims.width).toBe(300);
    expect(dims.height).toBe(200);
  });

  it('caps at 6400', () => {
    const layers: Layer[] = [
      makeLayer({ grayscaleData: makeImageData(8000, 3000, 0, 0, 0) }),
    ];
    const dims = getCompositeDimensions(layers);
    expect(dims.width).toBe(6400);
    expect(dims.height).toBe(3000);
  });

  it('returns default 800×600 when no images', () => {
    const dims = getCompositeDimensions([]);
    expect(dims.width).toBe(800);
    expect(dims.height).toBe(600);
  });

  it('returns default for layers without images', () => {
    const layers: Layer[] = [makeLayer(), makeLayer()];
    const dims = getCompositeDimensions(layers);
    expect(dims.width).toBe(800);
    expect(dims.height).toBe(600);
  });

  it('ignores layers without grayscaleData', () => {
    const layers: Layer[] = [
      makeLayer(), // no image
      makeLayer({ grayscaleData: makeImageData(400, 300, 0, 0, 0) }),
    ];
    const dims = getCompositeDimensions(layers);
    expect(dims.width).toBe(400);
    expect(dims.height).toBe(300);
  });
});
