import { useState, useCallback, useEffect } from 'react';
import { PreviewPane } from './components/PreviewPane';
import { SettingsPanel } from './components/SettingsPanel';
import { useLayerState } from './hooks/useLayerState';
import { exportFullRes } from './engine/renderer';
import { loadImageFile } from './engine/imageLoader';
import { RisoConfig } from './types';
import './index.css';

export function App() {
  const { layers, ...actions } = useLayerState();
  const [config, setConfig] = useState<RisoConfig>({
    offsetEnabled: false,
    opacityEnabled: false,
    paperColor: '#FFFDF5',
    safeArea: 0,
  });
  const [isDragOver, setIsDragOver] = useState(false);

  function handleConfigChange(updates: Partial<RisoConfig>) {
    setConfig((prev) => ({ ...prev, ...updates }));
  }

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = e.dataTransfer?.files;
      if (!files) return;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        loadImageFile(file).then(
          (result) => actions.addLayerWithImage(result.imageData, result.grayscaleData),
          (err) => alert(err instanceof Error ? err.message : 'Failed to load image'),
        );
      }
    },
    [actions],
  );

  useEffect(() => {
    function onDragOver(e: DragEvent) {
      e.preventDefault();
      setIsDragOver(true);
    }
    function onDragLeave(e: DragEvent) {
      if (e.relatedTarget === null) setIsDragOver(false);
    }
    function onDrop(e: DragEvent) {
      handleDrop(e);
    }
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleDrop]);

  return (
    <div className="app">
      {isDragOver && <div className="drop-overlay">Drop image to add layer</div>}
      <PreviewPane layers={layers} config={config} />
      <SettingsPanel
        layers={layers}
        actions={actions}
        config={config}
        onConfigChange={handleConfigChange}
        onExport={() => exportFullRes(layers, config)}
      />
    </div>
  );
}
