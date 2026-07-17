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
      <LayerList layers={layers} actions={actions} jitterEnabled={config.jitterEnabled} />
      <ConfigPanel config={config} onChange={onConfigChange} />
      <button onClick={onExport} className="export-btn">
        Download PNG
      </button>
    </div>
  );
}
