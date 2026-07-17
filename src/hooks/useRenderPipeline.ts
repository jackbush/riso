import { useEffect, useRef, useCallback } from 'react';
import { Layer, RisoConfig } from '../types';
import { render, getCompositeDimensions } from '../engine/renderer';

const DEBOUNCE_MS = 150;

/**
 * Debounced render pipeline hook.
 * Re-renders the preview canvas whenever layers, config, or the container
 * size changes. Uses refs to avoid stale closures in the ResizeObserver.
 */
export function useRenderPipeline(
  layers: Layer[],
  config: RisoConfig,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  onRender?: () => void,
): void {
  const timerRef = useRef<number | undefined>(undefined);

  // Keep mutable refs so the stable scheduleRender callback always reads
  // the latest layers/config without being recreated on every render.
  const layersRef = useRef(layers);
  const configRef = useRef(config);
  const onRenderRef = useRef(onRender);
  layersRef.current = layers;
  configRef.current = config;
  onRenderRef.current = onRender;

  // scheduleRender is stable (only depends on the canvas/container refs)
  // and reads current data through layersRef / configRef.
  const scheduleRender = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const currentLayers = layersRef.current;
      const currentConfig = configRef.current;

      if (!currentLayers.some((l) => l.grayscaleData)) return;

      const { width: fullW, height: fullH } = getCompositeDimensions(currentLayers);

      // Scale to fit container (with padding so canvas doesn't touch edges)
      const rect = container.getBoundingClientRect();
      const padding = 32;
      const scale = Math.min(
        (rect.width - padding) / fullW,
        (rect.height - padding) / fullH,
        1,
      );

      const result = render(currentLayers, currentConfig, scale);

      canvas.width = result.width;
      canvas.height = result.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(result, 0, 0);
        onRenderRef.current?.();
      }
    }, DEBOUNCE_MS);
  }, [canvasRef, containerRef]);

  // Re-render when layers or config change
  useEffect(() => {
    scheduleRender();
    return () => window.clearTimeout(timerRef.current);
  }, [layers, config, scheduleRender]);

  // Re-render when the container is resized (e.g. window resize)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(scheduleRender);
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef, scheduleRender]);
}
