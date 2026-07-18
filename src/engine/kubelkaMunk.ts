import { hexToRgb } from './compositor';

/**
 * Kubelka-Munk spectral mixing, approximated per RGB channel (a 3-channel
 * approximation, not truly spectral — see tasks/todo.md Phase 5).
 *
 * Each ink gets a K/S (absorption/scattering) ratio per channel, derived
 * from its hex color by the standard KM inversion. Overprints accumulate
 * K/S additively (weighted by ink density), and the sum converts back to
 * reflectance. Unlike multiply blending, this makes e.g. blue + yellow
 * produce a convincing green instead of muddy darkness.
 */

// Reflectance floor: KS(0) is infinite, so clamp near 1/255. Round-tripping
// pure black through ksFromReflectance → reflectanceFromKS then stays black
// to within one 8-bit step.
const MIN_REFLECTANCE = 0.004;

/** Standard KM inversion: K/S = (1 - R)² / (2R), with R clamped to (0, 1]. */
export function ksFromReflectance(reflectance: number): number {
  const r = Math.min(1, Math.max(MIN_REFLECTANCE, reflectance));
  return ((1 - r) * (1 - r)) / (2 * r);
}

/** Inverse of ksFromReflectance: R = 1 + K/S − sqrt((K/S)² + 2·K/S). */
export function reflectanceFromKS(ks: number): number {
  return 1 + ks - Math.sqrt(ks * ks + 2 * ks);
}

const ksByHex = new Map<string, readonly [number, number, number]>();

/**
 * Per-channel K/S ratios for a hex color. Derived (and memoized) at use time
 * rather than stored in the ink palette, so user-picked custom colors work.
 */
export function ksFromHex(hex: string): readonly [number, number, number] {
  let ks = ksByHex.get(hex);
  if (!ks) {
    const [r, g, b] = hexToRgb(hex);
    ks = [ksFromReflectance(r / 255), ksFromReflectance(g / 255), ksFromReflectance(b / 255)];
    ksByHex.set(hex, ks);
  }
  return ks;
}

/**
 * Order-dependent weighting: bottom layers soak further into the paper and
 * contribute slightly more K/S. `position` is the layer's index among visible
 * layers (0 = bottom). At bias b the bottom layer is weighted 1 + b and the
 * top layer exactly 1; a single layer is unweighted.
 */
export function orderWeight(position: number, count: number, bias: number): number {
  if (count <= 1 || bias <= 0) return 1;
  return 1 + bias * (1 - position / (count - 1));
}

export interface KMLayer {
  /** RGBA density pixels (grayscale, black = full ink), aligned to the output. */
  data: Uint8ClampedArray;
  /** Per-channel K/S of the layer's ink. */
  ks: readonly [number, number, number];
  /** Order weight (see orderWeight). */
  weight: number;
}

/**
 * Mix a strip of pixels: accumulate density-weighted K/S per channel over the
 * paper's own K/S, then convert back to reflectance. All layer buffers and
 * `out` must cover the same pixels. Writes opaque RGBA into `out`.
 */
export function kmMixPixels(
  layers: KMLayer[],
  paperKS: readonly [number, number, number],
  out: Uint8ClampedArray,
): void {
  const count = out.length / 4;
  for (let p = 0; p < count; p++) {
    const i = p * 4;
    let ksR = paperKS[0];
    let ksG = paperKS[1];
    let ksB = paperKS[2];

    for (const layer of layers) {
      const density = (255 - layer.data[i]) / 255;
      if (density > 0) {
        const dw = density * layer.weight;
        ksR += dw * layer.ks[0];
        ksG += dw * layer.ks[1];
        ksB += dw * layer.ks[2];
      }
    }

    out[i] = Math.round(reflectanceFromKS(ksR) * 255);
    out[i + 1] = Math.round(reflectanceFromKS(ksG) * 255);
    out[i + 2] = Math.round(reflectanceFromKS(ksB) * 255);
    out[i + 3] = 255;
  }
}
