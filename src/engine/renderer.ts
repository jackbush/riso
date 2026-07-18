import { Layer, RisoConfig } from '../types';
import { composite } from './compositor';

const MAX_DIMENSION = 6400;
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

/**
 * Compute composite canvas dimensions from the layer images: the largest
 * layer's per-axis extents, or the smallest's (an intersection crop — layers
 * are centered, so larger images crop equally on all sides).
 * Caps at 6400 per axis. Returns 800×600 if no layers have images.
 */
export function getCompositeDimensions(
  layers: Layer[],
  paperSize: 'largest' | 'smallest' = 'largest',
): {
  width: number;
  height: number;
} {
  let w = 0;
  let h = 0;
  const pick = paperSize === 'smallest' ? Math.min : Math.max;
  for (const layer of layers) {
    if (layer.grayscaleData) {
      w = w ? pick(w, layer.grayscaleData.width) : layer.grayscaleData.width;
      h = h ? pick(h, layer.grayscaleData.height) : layer.grayscaleData.height;
    }
  }
  return {
    width: Math.min(w || DEFAULT_WIDTH, MAX_DIMENSION),
    height: Math.min(h || DEFAULT_HEIGHT, MAX_DIMENSION),
  };
}

/**
 * Full render pipeline: composite layers.
 *
 * @param layers  - Layers to composite
 * @param config  - Riso configuration
 * @param scale   - Preview downscale factor (default 1)
 * @returns       - Canvas with the rendered result
 */
export function render(
  layers: Layer[],
  config: RisoConfig,
  scale = 1,
): HTMLCanvasElement {
  const { width: fullW, height: fullH } = getCompositeDimensions(layers, config.paperSize);
  const targetW = Math.round(fullW * scale);
  const targetH = Math.round(fullH * scale);

  return composite(layers, config, targetW, targetH, fullW);
}

/**
 * Render at full resolution and trigger a PNG download.
 */
export function exportFullRes(layers: Layer[], config: RisoConfig): void {
  const canvas = render(layers, config, 1);

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
