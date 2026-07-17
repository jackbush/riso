import { createNoise2D } from 'simplex-noise';

/**
 * Apply paper grain effect using 2D simplex noise.
 * Simulates subtle paper fiber texture by varying pixel luminance.
 *
 * @param canvas    - Canvas to modify in place
 * @param grainSize - Controls noise frequency. Higher = coarser grain. 0 = no effect.
 */
export function applyGrain(canvas: HTMLCanvasElement, grainSize: number): void {
  if (grainSize <= 0) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const noise2D = createNoise2D();
  const frequency = 1 / (grainSize * 4);
  const strength = 0.08; // 8% luminance variation

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const n = noise2D(x * frequency, y * frequency); // [-1, 1]
      const factor = 1 + n * strength;

      data[i]     = Math.min(255, Math.max(0, Math.round(data[i] * factor)));
      data[i + 1] = Math.min(255, Math.max(0, Math.round(data[i + 1] * factor)));
      data[i + 2] = Math.min(255, Math.max(0, Math.round(data[i + 2] * factor)));
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Draw registration / crop marks on a canvas.
 * Includes corner crop marks and edge midpoint crosshairs.
 */
export function drawRegMarks(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const markLen = 20;
  const offset = 10;
  const crossSize = 6;

  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.5;

  // Corner crop marks (L-shaped)
  // Top-left
  ctx.beginPath();
  ctx.moveTo(offset, offset + markLen);
  ctx.lineTo(offset, offset);
  ctx.lineTo(offset + markLen, offset);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(width - offset - markLen, offset);
  ctx.lineTo(width - offset, offset);
  ctx.lineTo(width - offset, offset + markLen);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(offset, height - offset - markLen);
  ctx.lineTo(offset, height - offset);
  ctx.lineTo(offset + markLen, height - offset);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(width - offset - markLen, height - offset);
  ctx.lineTo(width - offset, height - offset);
  ctx.lineTo(width - offset, height - offset - markLen);
  ctx.stroke();

  // Edge midpoint crosshairs
  const midX = width / 2;
  const midY = height / 2;

  const drawCross = (cx: number, cy: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - crossSize, cy);
    ctx.lineTo(cx + crossSize, cy);
    ctx.moveTo(cx, cy - crossSize);
    ctx.lineTo(cx, cy + crossSize);
    ctx.stroke();

    // Small circle
    ctx.beginPath();
    ctx.arc(cx, cy, crossSize * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  };

  drawCross(midX, offset);           // top center
  drawCross(midX, height - offset);  // bottom center
  drawCross(offset, midY);           // left center
  drawCross(width - offset, midY);   // right center

  ctx.restore();
}
