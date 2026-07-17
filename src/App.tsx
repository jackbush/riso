import { useState } from 'react';
import { PreviewPane } from './components/PreviewPane';
import { SettingsPanel } from './components/SettingsPanel';
import { useLayerState } from './hooks/useLayerState';
import { RisoConfig } from './types';
import './index.css';

export function App() {
  const { layers, ...actions } = useLayerState();
  const [config] = useState<RisoConfig>({
    jitterEnabled: false,
    grainSize: 1,
    paperColor: '#FFFDF5',
    showRegMarks: true,
  });

  return (
    <div className="app">
      <PreviewPane layers={layers} config={config} />
      <SettingsPanel layers={layers} actions={actions} />
    </div>
  );
}
