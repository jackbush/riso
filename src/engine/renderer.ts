import { Layer, RisoConfig } from '../types';
import { composite } from './compositor';

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
  const { width: fullW, height: fullH } = getCompositeDimensions(layers);
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
