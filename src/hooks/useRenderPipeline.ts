import { useEffect, useRef } from 'react';
import { Layer, RisoConfig } from '../types';
import { render, getCompositeDimensions } from '../engine/renderer';

const DEBOUNCE_MS = 150;

/**
 * Debounced render pipeline hook.
 * Re-renders the preview canvas whenever layers or config change.
 * Scales the output to fit within the container element.
 */
export function useRenderPipeline(
  layers: Layer[],
  config: RisoConfig,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
): void {
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const { width: fullW, height: fullH } = getCompositeDimensions(layers);

      // Compute scale to fit container (with some padding)
      const rect = container.getBoundingClientRect();
      const padding = 32;
      const availW = rect.width - padding;
      const availH = rect.height - padding;
      const scale = Math.min(availW / fullW, availH / fullH, 1);

      const targetW = Math.round(fullW * scale);
      const targetH = Math.round(fullH * scale);

      // Render
      const result = render(layers, config, {
        includeRegMarks: true,
        scale,
      });

      // Update canvas dimensions and draw
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(result, 0, 0);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timerRef.current);
  }, [layers, config, canvasRef, containerRef]);
}
