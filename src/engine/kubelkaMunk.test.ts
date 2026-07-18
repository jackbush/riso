import { describe, it, expect } from 'vitest';
import {
  ksFromReflectance,
  reflectanceFromKS,
  ksFromHex,
  orderWeight,
  kmMixPixels,
  KMLayer,
} from './kubelkaMunk';
import { hexToRgb } from './compositor';

// ------- K/S ↔ reflectance -------

describe('ksFromReflectance / reflectanceFromKS', () => {
  it('are inverses across the reflectance range', () => {
    for (let r = 0.01; r <= 1; r += 0.01) {
      expect(reflectanceFromKS(ksFromReflectance(r))).toBeCloseTo(r, 6);
    }
  });

  it('white has zero K/S', () => {
    expect(ksFromReflectance(1)).toBe(0);
    expect(reflectanceFromKS(0)).toBe(1);
  });

  it('black clamps but round-trips within one 8-bit step', () => {
    const ks = ksFromReflectance(0);
    expect(ks).toBeGreaterThan(50); // strongly absorbing
    expect(reflectanceFromKS(ks) * 255).toBeLessThan(1.5);
  });
});

// ------- ksFromHex -------

describe('ksFromHex', () => {
  it('round-trips an ink hex through K/S and back within tolerance', () => {
    // The plan's acceptance check: a single ink at full density on white
    // paper should reproduce approximately the ink's own hex.
    for (const hex of ['#0078BF', '#FFE800', '#FF48B0', '#000000', '#FFFFFF', '#765BA7']) {
      const [r, g, b] = hexToRgb(hex);
      const ks = ksFromHex(hex);
      expect(reflectanceFromKS(ks[0]) * 255).toBeCloseTo(Math.max(r, 1), 0);
      expect(reflectanceFromKS(ks[1]) * 255).toBeCloseTo(Math.max(g, 1), 0);
      expect(reflectanceFromKS(ks[2]) * 255).toBeCloseTo(Math.max(b, 1), 0);
    }
  });

  it('memoizes per hex', () => {
    expect(ksFromHex('#0078BF')).toBe(ksFromHex('#0078BF'));
  });
});

// ------- orderWeight -------

describe('orderWeight', () => {
  it('is 1 everywhere at zero bias', () => {
    expect(orderWeight(0, 3, 0)).toBe(1);
    expect(orderWeight(2, 3, 0)).toBe(1);
  });

  it('weights bottom layers more, top layer exactly 1', () => {
    expect(orderWeight(0, 3, 0.5)).toBeCloseTo(1.5);
    expect(orderWeight(1, 3, 0.5)).toBeCloseTo(1.25);
    expect(orderWeight(2, 3, 0.5)).toBe(1);
  });

  it('leaves a single layer unweighted', () => {
    expect(orderWeight(0, 1, 0.8)).toBe(1);
  });
});

// ------- kmMixPixels -------

function densityPixels(count: number, gray: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i++) {
    data[i * 4] = gray;
    data[i * 4 + 1] = gray;
    data[i * 4 + 2] = gray;
    data[i * 4 + 3] = 255;
  }
  return data;
}

function mixOne(layers: KMLayer[], paperHex = '#FFFFFF'): [number, number, number] {
  const out = new Uint8ClampedArray(4);
  kmMixPixels(layers, ksFromHex(paperHex), out);
  return [out[0], out[1], out[2]];
}

describe('kmMixPixels', () => {
  it('no ink → paper color survives exactly (white) or within a step (tinted)', () => {
    expect(mixOne([{ data: densityPixels(1, 255), ks: ksFromHex('#0078BF'), weight: 1 }])).toEqual(
      [255, 255, 255],
    );
    const [r, g, b] = mixOne([], '#F2ECD9');
    const [pr, pg, pb] = hexToRgb('#F2ECD9');
    expect(Math.abs(r - pr)).toBeLessThanOrEqual(1);
    expect(Math.abs(g - pg)).toBeLessThanOrEqual(1);
    expect(Math.abs(b - pb)).toBeLessThanOrEqual(1);
  });

  it('single ink at full density on white paper reproduces the ink hex', () => {
    for (const hex of ['#0078BF', '#FFE800', '#FF48B0']) {
      const [r, g, b] = mixOne([{ data: densityPixels(1, 0), ks: ksFromHex(hex), weight: 1 }]);
      const [ir, ig, ib] = hexToRgb(hex);
      expect(Math.abs(r - Math.max(ir, 1))).toBeLessThanOrEqual(1);
      expect(Math.abs(g - Math.max(ig, 1))).toBeLessThanOrEqual(1);
      expect(Math.abs(b - Math.max(ib, 1))).toBeLessThanOrEqual(1);
    }
  });

  it('blue + yellow mixes to green (the key difference from multiply)', () => {
    const [r, g, b] = mixOne([
      { data: densityPixels(1, 0), ks: ksFromHex('#0078BF'), weight: 1 },
      { data: densityPixels(1, 0), ks: ksFromHex('#FFE800'), weight: 1 },
    ]);
    expect(g).toBeGreaterThan(r + 50);
    expect(g).toBeGreaterThan(b + 50);
  });

  it('partial density lightens toward paper', () => {
    const full = mixOne([{ data: densityPixels(1, 0), ks: ksFromHex('#0078BF'), weight: 1 }]);
    const half = mixOne([{ data: densityPixels(1, 128), ks: ksFromHex('#0078BF'), weight: 1 }]);
    expect(half[0]).toBeGreaterThan(full[0]);
    expect(half[1]).toBeGreaterThan(full[1]);
    expect(half[2]).toBeGreaterThan(full[2]);
  });

  it('higher weight darkens the result', () => {
    const plain = mixOne([{ data: densityPixels(1, 128), ks: ksFromHex('#0078BF'), weight: 1 }]);
    const biased = mixOne([{ data: densityPixels(1, 128), ks: ksFromHex('#0078BF'), weight: 1.3 }]);
    expect(biased[0]).toBeLessThanOrEqual(plain[0]);
    expect(biased[1]).toBeLessThan(plain[1]);
    expect(biased[2]).toBeLessThan(plain[2]);
  });

  it('output alpha is opaque', () => {
    const out = new Uint8ClampedArray(8);
    kmMixPixels(
      [{ data: densityPixels(2, 100), ks: ksFromHex('#0078BF'), weight: 1 }],
      ksFromHex('#FFFFFF'),
      out,
    );
    expect(out[3]).toBe(255);
    expect(out[7]).toBe(255);
  });
});
