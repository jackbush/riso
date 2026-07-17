import { Layer } from '../types';
import { LayerActions } from '../hooks/useLayerState';
import { LayerList } from './LayerList';

interface SettingsPanelProps {
  layers: Layer[];
  actions: LayerActions;
}

export function SettingsPanel({ layers, actions }: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      <LayerList layers={layers} actions={actions} />
      <div className="config-panel">
        <div className="config-label">Configuration</div>
        <div style={{ fontSize: '0.875rem', color: '#666' }}>
          Settings coming in Phase 4.
        </div>
      </div>
    </div>
  );
}
