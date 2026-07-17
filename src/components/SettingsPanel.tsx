import { Layer, RisoConfig } from '../types';
import { LayerActions } from '../hooks/useLayerState';
import { LayerList } from './LayerList';
import { ConfigPanel } from './ConfigPanel';

interface SettingsPanelProps {
  layers: Layer[];
  actions: LayerActions;
  config: RisoConfig;
  onConfigChange: (updates: Partial<RisoConfig>) => void;
  onExport: () => void;
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
          <button onClick={onExport} className="export-btn">Download PNG</button>
        </div>
      </details>
    </div>
  );
}
