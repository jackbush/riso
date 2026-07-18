/**
 * Fast separable box blur, applied 3 times in sequence, to approximate a
 * Gaussian blur on grayscale density data (R=G=B=luma). Alpha is preserved
 * unchanged. Edge pixels are clamped rather than darkened.
 */
export function densityBoxBlur(density: ImageData, radiusPx: number): ImageData {
  const radius = Math.round(radiusPx);
  if (radius <= 0) return density;

  const { width, height, data } = density;
  const count = width * height;

  let luma: Float32Array<ArrayBufferLike> = new Float32Array(count);
  for (let i = 0; i < count; i++) luma[i] = data[i * 4];

  for (let pass = 0; pass < 3; pass++) {
    luma = boxBlurHorizontal(luma, width, height, radius);
    luma = boxBlurVertical(luma, width, height, radius);
  }

  const out = new ImageData(width, height);
  const dst = out.data;
  for (let i = 0; i < count; i++) {
    const v = Math.round(luma[i]);
    dst[i * 4] = v;
    dst[i * 4 + 1] = v;
    dst[i * 4 + 2] = v;
    dst[i * 4 + 3] = data[i * 4 + 3];
  }
  return out;
}

function clampIndex(i: number, max: number): number {
  return i < 0 ? 0 : i > max ? max : i;
}

function boxBlurHorizontal(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(src.length);
  const windowSize = 2 * r + 1;

  for (let y = 0; y < h; y++) {
    const rowStart = y * w;
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += src[rowStart + clampIndex(x, w - 1)];
    out[rowStart] = sum / windowSize;

    for (let x = 1; x < w; x++) {
      const addI = clampIndex(x + r, w - 1);
      const subI = clampIndex(x - r - 1, w - 1);
      sum += src[rowStart + addI] - src[rowStart + subI];
      out[rowStart + x] = sum / windowSize;
    }
  }
  return out;
}

function boxBlurVertical(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(src.length);
  const windowSize = 2 * r + 1;

  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += src[clampIndex(y, h - 1) * w + x];
    out[x] = sum / windowSize;

    for (let y = 1; y < h; y++) {
      const addI = clampIndex(y + r, h - 1);
      const subI = clampIndex(y - r - 1, h - 1);
      sum += src[addI * w + x] - src[subI * w + x];
      out[y * w + x] = sum / windowSize;
    }
  }
  return out;
}
