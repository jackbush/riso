import { Layer, RisoConfig } from '../types';

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

/**
 * Composite all visible layers onto a canvas using multiply blend mode.
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
  const scale = targetW / fullW;
  const safe = Math.round((config.safeArea ?? 0) * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW + 2 * safe;
  canvas.height = targetH + 2 * safe;
  const ctx = canvas.getContext('2d')!;

  // 1. Paper background
  ctx.fillStyle = config.paperColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Composite each visible layer
  for (const layer of layers) {
    if (!layer.visible || !layer.grayscaleData) continue;

    const [inkR, inkG, inkB] = hexToRgb(layer.inkColor.hex);
    const tinted = tintGrayscale(layer.grayscaleData, inkR, inkG, inkB);

    // Put tinted data onto a temp canvas at original dimensions
    const tmp = document.createElement('canvas');
    tmp.width = tinted.width;
    tmp.height = tinted.height;
    const tmpCtx = tmp.getContext('2d');
    if (!tmpCtx) continue;
    tmpCtx.putImageData(tinted, 0, 0);

    // Compute centered position within the content area, offset by safe area
    const drawW = tinted.width * scale;
    const drawH = tinted.height * scale;
    let drawX = safe + (targetW - drawW) / 2;
    let drawY = safe + (targetH - drawH) / 2;

    // Apply offset (scaled)
    if (config.offsetEnabled) {
      drawX += layer.offsetX * scale;
      drawY += layer.offsetY * scale;
    }

    ctx.save();

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
        const alphaTinted = tintGrayscaleAlpha(layer.grayscaleData, inkR, inkG, inkB);
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
