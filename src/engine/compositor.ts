import { Layer, RisoConfig } from '../types';
import { densityBoxBlur } from './blur';
import { applyAMHalftone, applyStochasticHalftone, autoScreenAngle } from './halftone';
import { KMLayer, kmMixPixels, ksFromHex, orderWeight } from './kubelkaMunk';
import { computeRegistrationJitter } from './prng';

/**
 * Parse a hex color string to [R, G, B] values (0-255).
 */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/**
 * Tint a grayscale ImageData with an ink color.
 *
 * Mapping:
 *   black (0)   → full ink color (max density)
 *   white (255) → white (no ink, transparent to multiply)
 *   grays       → proportional blend
 *
 * Formula per channel: out = 255 - density * (255 - ink)
 * where density = (255 - gray) / 255
 */
export function tintGrayscale(
  grayscale: ImageData,
  inkR: number,
  inkG: number,
  inkB: number,
): ImageData {
  const src = grayscale.data;
  const out = new ImageData(grayscale.width, grayscale.height);
  const dst = out.data;

  // Precompute (255 - ink) to avoid repeated subtraction in the loop
  const diffR = 255 - inkR;
  const diffG = 255 - inkG;
  const diffB = 255 - inkB;

  for (let i = 0; i < src.length; i += 4) {
    const gray = src[i]; // R=G=B for grayscale input
    const density = (255 - gray) / 255;

    dst[i]     = Math.round(255 - density * diffR);
    dst[i + 1] = Math.round(255 - density * diffG);
    dst[i + 2] = Math.round(255 - density * diffB);
    dst[i + 3] = src[i + 3]; // preserve alpha
  }

  return out;
}

/**
 * Tint a grayscale ImageData with an ink color as a density-alpha mask:
 * RGB is the flat ink color, alpha is proportional to density (black → opaque
 * ink, white → fully transparent). Used for the source-over "opaque overprint"
 * component of ink transparency blending, as opposed to `tintGrayscale`'s
 * multiply-ready output (which encodes density via lightness, not alpha).
 */
export function tintGrayscaleAlpha(
  grayscale: ImageData,
  inkR: number,
  inkG: number,
  inkB: number,
): ImageData {
  const src = grayscale.data;
  const out = new ImageData(grayscale.width, grayscale.height);
  const dst = out.data;

  for (let i = 0; i < src.length; i += 4) {
    const gray = src[i];
    const density = (255 - gray) / 255;

    dst[i] = inkR;
    dst[i + 1] = inkG;
    dst[i + 2] = inkB;
    dst[i + 3] = Math.round(density * src[i + 3]);
  }

  return out;
}

// Per-layer cache of spread-blurred density, keyed by blur radius, so the
// debounced re-render triggered by unrelated config changes (or resizing the
// preview) doesn't re-blur a full-resolution image every time.
const spreadCache = new WeakMap<ImageData, Map<number, ImageData>>();

function applySpreadStage(grayscaleData: ImageData, config: RisoConfig): ImageData {
  if (!config.inkSpreadEnabled) return grayscaleData;

  const radius = Math.round(config.inkSpreadAmount);
  if (radius <= 0) return grayscaleData;

  let byRadius = spreadCache.get(grayscaleData);
  if (!byRadius) {
    byRadius = new Map();
    spreadCache.set(grayscaleData, byRadius);
  }

  let blurred = byRadius.get(radius);
  if (!blurred) {
    blurred = densityBoxBlur(grayscaleData, radius);
    byRadius.set(radius, blurred);
  }
  return blurred;
}

// Per-layer cache of halftoned density, keyed by the resolved screen params,
// for the same reason as the spread cache: thresholding a full-resolution
// image on every debounced re-render is wasteful. Keyed off the *input*
// density object, so it chains correctly after the (cached) spread stage.
const halftoneCache = new WeakMap<ImageData, Map<string, ImageData>>();

function applyHalftoneStage(
  density: ImageData,
  config: RisoConfig,
  layerIndex: number,
): ImageData {
  if (config.halftoneMode === 'off') return density;

  let key: string;
  let compute: () => ImageData;
  if (config.halftoneMode === 'stochastic') {
    const scale = config.halftoneScale;
    key = `s:${scale}`;
    compute = () => applyStochasticHalftone(density, scale);
  } else {
    const angle = config.halftoneAngle ?? autoScreenAngle(layerIndex);
    const spacing = config.halftoneSpacing;
    key = `am:${spacing}:${angle}`;
    compute = () => applyAMHalftone(density, spacing, angle);
  }

  let byKey = halftoneCache.get(density);
  if (!byKey) {
    byKey = new Map();
    halftoneCache.set(density, byKey);
  }

  let result = byKey.get(key);
  if (!result) {
    result = compute();
    byKey.set(key, result);
  }
  return result;
}

/**
 * Density pipeline: grayscale → spread → halftone → (tint happens separately).
 * Each stage is a pure function over density `ImageData` that no-ops when its
 * feature is disabled, so later phases (Kubelka-Munk) slot in as additional
 * stages instead of branching inside `composite()`. `layerIndex` picks the
 * auto screen angle for AM halftone.
 */
function computeDensity(
  grayscaleData: ImageData,
  config: RisoConfig,
  layerIndex: number,
): ImageData {
  let density = grayscaleData;
  density = applySpreadStage(density, config);
  density = applyHalftoneStage(density, config, layerIndex);
  return density;
}

interface LayerPlacement {
  drawX: number;
  drawY: number;
  drawW: number;
  drawH: number;
  rotationDeg: number;
}

/**
 * Where a layer's (density-sized) image lands on the output canvas: centered
 * in the content area, pushed by the safe-area margin, then shifted by the
 * layer offset and registration jitter (all scaled). Shared by the multiply
 * and Kubelka-Munk paths so both apply identical geometry.
 */
function computeLayerPlacement(
  layer: Layer,
  config: RisoConfig,
  srcW: number,
  srcH: number,
  scale: number,
  targetW: number,
  targetH: number,
  safe: number,
): LayerPlacement {
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  let drawX = safe + (targetW - drawW) / 2;
  let drawY = safe + (targetH - drawH) / 2;

  if (config.offsetEnabled) {
    drawX += layer.offsetX * scale;
    drawY += layer.offsetY * scale;
  }

  // Registration jitter (scaled): random per-layer shift, keyed by layer id
  // + seed so it's stable across re-renders and only changes on an explicit
  // re-roll (or a slider change).
  let rotationDeg = 0;
  if (config.registrationJitterEnabled) {
    const jitter = computeRegistrationJitter(
      config.registrationJitterSeed,
      config.registrationJitterAmount,
      layer.id,
    );
    drawX += jitter.dx * scale;
    drawY += jitter.dy * scale;
    rotationDeg = jitter.rotationDeg;
  }

  return { drawX, drawY, drawW, drawH, rotationDeg };
}

function applyPlacementRotation(ctx: CanvasRenderingContext2D, p: LayerPlacement): void {
  if (p.rotationDeg === 0) return;
  const centerX = p.drawX + p.drawW / 2;
  const centerY = p.drawY + p.drawH / 2;
  ctx.translate(centerX, centerY);
  ctx.rotate((p.rotationDeg * Math.PI) / 180);
  ctx.translate(-centerX, -centerY);
}

function imageDataToCanvas(img: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.getContext('2d')!.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Composite all visible layers onto a canvas — multiply blend mode, or
 * Kubelka-Munk mixing when enabled (see kmComposite).
 *
 * @param layers     - Array of layers (composited bottom to top)
 * @param config     - Riso config (paper color, offset toggle)
 * @param targetW    - Output canvas width (may be scaled for preview)
 * @param targetH    - Output canvas height
 * @param fullW      - Full-resolution composite width (for computing scale)
 * @returns          - Canvas element with the composited result
 */
export function composite(
  layers: Layer[],
  config: RisoConfig,
  targetW: number,
  targetH: number,
  fullW: number,
): HTMLCanvasElement {
  if (config.kubelkaMunkEnabled) {
    return kmComposite(layers, config, targetW, targetH, fullW);
  }

  const scale = targetW / fullW;
  const safe = Math.round((config.safeArea ?? 0) * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW + 2 * safe;
  canvas.height = targetH + 2 * safe;
  const ctx = canvas.getContext('2d')!;

  // 1. Paper background
  ctx.fillStyle = config.paperColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Composite each visible layer. The index (position in the full layer
  // list, not just visible ones) keys the auto AM screen angle, so toggling
  // a layer's visibility doesn't reshuffle the other layers' angles.
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const layer = layers[layerIndex];
    if (!layer.visible || !layer.grayscaleData) continue;

    const [inkR, inkG, inkB] = hexToRgb(layer.inkColor.hex);
    const density = computeDensity(layer.grayscaleData, config, layerIndex);
    const tinted = tintGrayscale(density, inkR, inkG, inkB);
    const tmp = imageDataToCanvas(tinted);

    const placement = computeLayerPlacement(
      layer,
      config,
      tinted.width,
      tinted.height,
      scale,
      targetW,
      targetH,
      safe,
    );
    const { drawX, drawY, drawW, drawH } = placement;

    ctx.save();
    applyPlacementRotation(ctx, placement);

    if (config.inkTransparencyEnabled) {
      // Blend between pure multiply (transparent, dye-like inks — shows what's
      // beneath) and source-over occlusion by density (opaque inks — hides it).
      const transparency = layer.inkColor.transparency;

      if (transparency > 0) {
        ctx.globalAlpha = layer.opacity * transparency;
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(tmp, drawX, drawY, drawW, drawH);
      }

      if (transparency < 1) {
        const alphaTinted = tintGrayscaleAlpha(density, inkR, inkG, inkB);
        const tmpAlpha = document.createElement('canvas');
        tmpAlpha.width = alphaTinted.width;
        tmpAlpha.height = alphaTinted.height;
        const tmpAlphaCtx = tmpAlpha.getContext('2d');
        if (tmpAlphaCtx) {
          tmpAlphaCtx.putImageData(alphaTinted, 0, 0);
          ctx.globalAlpha = layer.opacity * (1 - transparency);
          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(tmpAlpha, drawX, drawY, drawW, drawH);
        }
      }
    } else {
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(tmp, drawX, drawY, drawW, drawH);
    }

    ctx.restore();
  }

  return canvas;
}

// Strip height for Kubelka-Munk mixing: bounds JS-heap ImageData copies to
// (layers + 1) × width × 256 RGBA pixels instead of full-frame buffers,
// which at the 6400px export cap would otherwise run to hundreds of MB.
const KM_STRIP_ROWS = 256;

/**
 * Kubelka-Munk compositing path: replaces multiply blending entirely (ink
 * transparency blending is likewise superseded — KM is the blending model).
 *
 * Geometry is not reimplemented in software: each layer's density map is
 * rasterized by Canvas onto a white, output-sized buffer with the exact same
 * placement (resampling, centering, safe area, offsets, jitter + rotation) as
 * the multiply path. Opacity uses globalAlpha, which over a white background
 * scales density exactly: 255 − (a·src + (1−a)·255) = a·(255 − src). The
 * per-pixel KM math then runs on aligned buffers in row strips.
 */
function kmComposite(
  layers: Layer[],
  config: RisoConfig,
  targetW: number,
  targetH: number,
  fullW: number,
): HTMLCanvasElement {
  const scale = targetW / fullW;
  const safe = Math.round((config.safeArea ?? 0) * scale);
  const width = targetW + 2 * safe;
  const height = targetH + 2 * safe;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const visibleIndices: number[] = [];
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].visible && layers[i].grayscaleData) visibleIndices.push(i);
  }

  const rasterized = visibleIndices.map((layerIndex, position) => {
    const layer = layers[layerIndex];
    const density = computeDensity(layer.grayscaleData!, config, layerIndex);
    const tmp = imageDataToCanvas(density);

    const target = document.createElement('canvas');
    target.width = width;
    target.height = height;
    const targetCtx = target.getContext('2d')!;
    targetCtx.fillStyle = '#FFFFFF';
    targetCtx.fillRect(0, 0, width, height);

    const placement = computeLayerPlacement(
      layer,
      config,
      density.width,
      density.height,
      scale,
      targetW,
      targetH,
      safe,
    );
    targetCtx.save();
    applyPlacementRotation(targetCtx, placement);
    targetCtx.globalAlpha = layer.opacity;
    targetCtx.drawImage(tmp, placement.drawX, placement.drawY, placement.drawW, placement.drawH);
    targetCtx.restore();

    return {
      ctx: targetCtx,
      ks: ksFromHex(layer.inkColor.hex),
      weight: orderWeight(position, visibleIndices.length, config.kubelkaMunkOrderBias),
    };
  });

  const paperKS = ksFromHex(config.paperColor);

  for (let y0 = 0; y0 < height; y0 += KM_STRIP_ROWS) {
    const rows = Math.min(KM_STRIP_ROWS, height - y0);
    const strips: KMLayer[] = rasterized.map((r) => ({
      data: r.ctx.getImageData(0, y0, width, rows).data,
      ks: r.ks,
      weight: r.weight,
    }));
    const out = ctx.createImageData(width, rows);
    kmMixPixels(strips, paperKS, out.data);
    ctx.putImageData(out, 0, y0);
  }

  return canvas;
}
