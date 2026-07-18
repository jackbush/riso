import { useRef, useState, useEffect } from 'react';
import { Layer, RisoConfig } from '../types';
import { useRenderPipeline } from '../hooks/useRenderPipeline';

interface PreviewPaneProps {
  layers: Layer[];
  config: RisoConfig;
}

export function PreviewPane({ layers, config }: PreviewPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const isEmpty = !layers.some((l) => l.grayscaleData);

  useEffect(() => {
    if (isEmpty) setCanvasReady(false);
  }, [isEmpty]);

  useRenderPipeline(layers, config, canvasRef, containerRef, () => setCanvasReady(true));

  return (
    <div className="preview-pane" ref={containerRef}>
      {!canvasReady && (
        <div className="preview-empty">
          <p>Add layers to get started.</p>
        </div>
      )}
      <canvas
        className="preview-canvas"
        ref={canvasRef}
        style={{ display: canvasReady ? 'block' : 'none' }}
      />
    </div>
  );
}
