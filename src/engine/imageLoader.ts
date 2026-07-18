import { toGrayscale } from './grayscale';

const MAX = 6400;

/**
 * Load an image file as grayscale density data. Images larger than the
 * 6400px canvas cap are downscaled to fit (like a printer would), never
 * rejected.
 */
export function loadImageFile(file: File): Promise<{ grayscaleData: ImageData }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      const grayscaleData = toGrayscale(ctx.getImageData(0, 0, w, h));
      URL.revokeObjectURL(url);
      resolve({ grayscaleData });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
