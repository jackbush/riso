import { useRef } from 'react';
import { Layer, RisoConfig } from '../types';
import { useRenderPipeline } from '../hooks/useRenderPipeline';

interface PreviewPaneProps {
  layers: Layer[];
  config: RisoConfig;
}

export function PreviewPane({ layers, config }: PreviewPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useRenderPipeline(layers, config, canvasRef, containerRef);

  const isEmpty = layers.length === 0;

  return (
    <div className="preview-pane" ref={containerRef}>
      {isEmpty && (
        <div className="preview-empty">
          <p>Add a layer and upload an image to get started.</p>
        </div>
      )}
      <canvas
        className="preview-canvas"
        ref={canvasRef}
        style={{ display: isEmpty ? 'none' : 'block' }}
      />
    </div>
  );
}
