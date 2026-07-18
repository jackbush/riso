import { toGrayscale } from './grayscale';

const MAX = 6400;

export function loadImageFile(
  file: File,
): Promise<{ imageData: ImageData; grayscaleData: ImageData }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      if (img.width > MAX || img.height > MAX) {
        URL.revokeObjectURL(url);
        reject(
          new Error(
            `Image is too large (${img.width}\u00d7${img.height}px). ` +
              `Maximum allowed size is ${MAX}\u00d7${MAX}px.`,
          ),
        );
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const grayscaleData = toGrayscale(imageData);
      URL.revokeObjectURL(url);
      resolve({ imageData, grayscaleData });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
