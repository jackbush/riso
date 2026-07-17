import { Layer, RisoConfig } from '../types';
import { LayerActions } from '../hooks/useLayerState';
import { getCompositeDimensions } from '../engine/renderer';
import { LayerList } from './LayerList';
import { ConfigPanel } from './ConfigPanel';

interface SettingsPanelProps {
  layers: Layer[];
  actions: LayerActions;
  config: RisoConfig;
  onConfigChange: (updates: Partial<RisoConfig>) => void;
  onExport: () => void;
}

function ExportDimensions({ layers, config }: { layers: Layer[]; config: RisoConfig }) {
  const hasImages = layers.some((l) => l.grayscaleData);
  if (!hasImages) return null;
  const { width, height } = getCompositeDimensions(layers);
  const safe = config.safeArea ?? 0;
  return (
    <p className="export-dimensions">
      {width + safe * 2} × {height + safe * 2} px
    </p>
  );
}

export function SettingsPanel({
  layers,
  actions,
  config,
  onConfigChange,
  onExport,
}: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      <details className="pane" open>
        <summary className="pane-summary">Settings</summary>
        <div className="pane-body">
          <ConfigPanel config={config} onChange={onConfigChange} />
        </div>
      </details>

      <details className="pane" open>
        <summary className="pane-summary">Layers</summary>
        <div className="pane-body">
          <LayerList layers={layers} actions={actions} jitterEnabled={config.jitterEnabled} />
        </div>
      </details>

      <details className="pane" open>
        <summary className="pane-summary">Export</summary>
        <div className="pane-body">
          <ExportDimensions layers={layers} config={config} />
          <button onClick={onExport} className="export-btn" disabled={!layers.some((l) => l.grayscaleData)}>Download PNG</button>
        </div>
      </details>
    </div>
  );
}
