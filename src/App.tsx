import { useState } from 'react';
import { PreviewPane } from './components/PreviewPane';
import { SettingsPanel } from './components/SettingsPanel';
import { useLayerState } from './hooks/useLayerState';
import { exportFullRes } from './engine/renderer';
import { RisoConfig } from './types';
import './index.css';

export function App() {
  const { layers, ...actions } = useLayerState();
  const [config, setConfig] = useState<RisoConfig>({
    jitterEnabled: false,
    paperColor: '#FFFDF5',
    safeArea: 0,
  });

  function handleConfigChange(updates: Partial<RisoConfig>) {
    setConfig((prev) => ({ ...prev, ...updates }));
  }

  return (
    <div className="app">
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
