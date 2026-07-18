import { Layer, RisoConfig } from '../types';
import { LayerActions } from '../hooks/useLayerState';
import { LayerList } from './LayerList';
import { ConfigPanel } from './ConfigPanel';

interface SettingsPanelProps {
  layers: Layer[];
  actions: LayerActions;
  config: RisoConfig;
  onConfigChange: (updates: Partial<RisoConfig>) => void;
}

export function SettingsPanel({ layers, actions, config, onConfigChange }: SettingsPanelProps) {
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
          <LayerList layers={layers} actions={actions} advancedEnabled={config.advancedLayerOptionsEnabled} paperColor={config.paperColor} />
        </div>
      </details>
    </div>
  );
}
