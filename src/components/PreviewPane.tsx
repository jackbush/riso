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

  return (
    <div className="preview-pane" ref={containerRef}>
      <canvas className="preview-canvas" ref={canvasRef} />
    </div>
  );
}
