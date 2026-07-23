import { describe, it, expect } from 'vitest';
import { mulberry32, hashString, layerSeed, computeRegistrationJitter } from './prng';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('stays within [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashString', () => {
  it('is deterministic', () => {
    expect(hashString('layer-1')).toBe(hashString('layer-1'));
  });

  it('differs for different strings', () => {
    expect(hashString('layer-1')).not.toBe(hashString('layer-2'));
  });
});

describe('layerSeed', () => {
  it('differs per layer id for the same base seed', () => {
    expect(layerSeed(1, 'a')).not.toBe(layerSeed(1, 'b'));
  });

  it('differs per base seed for the same layer id', () => {
    expect(layerSeed(1, 'a')).not.toBe(layerSeed(2, 'a'));
  });
});

describe('computeRegistrationJitter', () => {
  it('returns zero jitter when amount is 0', () => {
    expect(computeRegistrationJitter(1, 0, 'layer-1')).toEqual({
      dx: 0,
      dy: 0,
      rotationDeg: 0,
    });
  });

  it('is deterministic for the same seed/amount/layerId', () => {
    const a = computeRegistrationJitter(5, 2, 'layer-1');
    const b = computeRegistrationJitter(5, 2, 'layer-1');
    expect(a).toEqual(b);
  });

  it('produces different jitter for different layer ids (same seed)', () => {
    const a = computeRegistrationJitter(5, 2, 'layer-1');
    const b = computeRegistrationJitter(5, 2, 'layer-2');
    expect(a).not.toEqual(b);
  });

  it('produces different jitter when re-rolled (different seed)', () => {
    const a = computeRegistrationJitter(5, 2, 'layer-1');
    const b = computeRegistrationJitter(6, 2, 'layer-1');
    expect(a).not.toEqual(b);
  });

  it('keeps dx/dy within [-amount, +amount]', () => {
    for (let seed = 0; seed < 20; seed++) {
      const { dx, dy } = computeRegistrationJitter(seed, 10, `layer-${seed}`);
      expect(Math.abs(dx)).toBeLessThanOrEqual(10);
      expect(Math.abs(dy)).toBeLessThanOrEqual(10);
    }
  });

  it('keeps rotation within [-0.3, +0.3] degrees, scaled by strength', () => {
    // At full strength (slider at max), rotation reaches the full ±0.3° range
    for (let seed = 0; seed < 20; seed++) {
      const { rotationDeg } = computeRegistrationJitter(seed, 50, `layer-${seed}`, 1);
      expect(Math.abs(rotationDeg)).toBeLessThanOrEqual(0.3);
    }
    // At half strength, rotation is scaled down proportionally — regardless
    // of the px amount, which tracks paper size, not the slider
    for (let seed = 0; seed < 20; seed++) {
      const { rotationDeg } = computeRegistrationJitter(seed, 50, `layer-${seed}`, 0.5);
      expect(Math.abs(rotationDeg)).toBeLessThanOrEqual(0.15);
    }
  });
});
