/**
 * Convert an RGBA ImageData to grayscale using luminance weights.
 * Output has R=G=B=luma, alpha preserved.
 */
export function toGrayscale(imageData: ImageData): ImageData {
  const src = imageData.data;
  const out = new ImageData(imageData.width, imageData.height);
  const dst = out.data;
  for (let i = 0; i < src.length; i += 4) {
    const luma = Math.round(0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]);
    dst[i] = luma;
    dst[i + 1] = luma;
    dst[i + 2] = luma;
    dst[i + 3] = src[i + 3];
  }
  return out;
}
