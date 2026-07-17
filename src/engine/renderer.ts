import { Layer, RisoConfig } from '../types';
import { composite } from './compositor';
import { applyGrain, drawRegMarks } from './effects';

const MAX_DIMENSION = 5000;
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

/**
 * Compute composite canvas dimensions from the largest layer image.
 * Caps at 5000×5000. Returns 800×600 if no layers have images.
 */
export function getCompositeDimensions(layers: Layer[]): {
  width: number;
  height: number;
} {
  let maxW = 0;
  let maxH = 0;
  for (const layer of layers) {
    if (layer.grayscaleData) {
      maxW = Math.max(maxW, layer.grayscaleData.width);
      maxH = Math.max(maxH, layer.grayscaleData.height);
    }
  }
  return {
    width: Math.min(maxW || DEFAULT_WIDTH, MAX_DIMENSION),
    height: Math.min(maxH || DEFAULT_HEIGHT, MAX_DIMENSION),
  };
}

interface RenderOptions {
  includeRegMarks: boolean;
  scale?: number;
}

/**
 * Full render pipeline: composite layers → apply grain → draw reg marks.
 *
 * @param layers  - Layers to composite
 * @param config  - Riso configuration
 * @param opts    - includeRegMarks: draw crop marks; scale: preview downscale factor (default 1)
 * @returns       - Canvas with the rendered result
 */
export function render(
  layers: Layer[],
  config: RisoConfig,
  opts: RenderOptions,
): HTMLCanvasElement {
  const { width: fullW, height: fullH } = getCompositeDimensions(layers);
  const scale = opts.scale ?? 1;
  const targetW = Math.round(fullW * scale);
  const targetH = Math.round(fullH * scale);

  // 1. Composite layers
  const canvas = composite(layers, config, targetW, targetH, fullW);

  // 2. Paper grain
  if (config.grainSize > 0) {
    applyGrain(canvas, config.grainSize);
  }

  // 3. Registration marks (preview only)
  if (opts.includeRegMarks && config.showRegMarks) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawRegMarks(ctx, targetW, targetH);
    }
  }

  return canvas;
}

/**
 * Render at full resolution and trigger a PNG download.
 */
export function exportFullRes(layers: Layer[], config: RisoConfig): void {
  const canvas = render(layers, config, {
    includeRegMarks: false,
    scale: 1,
  });

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'riso-print.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
