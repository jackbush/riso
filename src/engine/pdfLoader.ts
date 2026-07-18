import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import { toGrayscale } from './grayscale';

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const MAX_PX = 6400;
const DEFAULT_SCALE = 2;

export interface PageResult {
  grayscaleData: ImageData;
}

export async function loadPdfFile(
  file: File,
  existingLayerCount: number,
  maxLayers: number,
): Promise<PageResult[]> {
  const buffer = await file.arrayBuffer();
  const loadingTask = getDocument({ data: buffer });
  const pdf = await loadingTask.promise;

  const available = maxLayers - existingLayerCount;
  if (pdf.numPages > available) {
    await pdf.cleanup();
    loadingTask.destroy();
    throw new Error(
      `This PDF has ${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'}, ` +
        `but only ${available} layer${available === 1 ? '' : 's'} can be added ` +
        `(${maxLayers} max, ${existingLayerCount} in use).`,
    );
  }

  const results: PageResult[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    let scale = DEFAULT_SCALE;
    const baseViewport = page.getViewport({ scale: 1 });
    const maxDim = Math.max(baseViewport.width, baseViewport.height);
    if (maxDim * scale > MAX_PX) {
      scale = MAX_PX / maxDim;
    }

    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const grayscaleData = toGrayscale(ctx.getImageData(0, 0, canvas.width, canvas.height));
    results.push({ grayscaleData });
    page.cleanup();
  }

  await pdf.cleanup();
  loadingTask.destroy();
  return results;
}
