import { PreviewPane } from './components/PreviewPane';
import { SettingsPanel } from './components/SettingsPanel';
import { useLayerState } from './hooks/useLayerState';
import './index.css';

export function App() {
  const { layers, ...actions } = useLayerState();

  return (
    <div className="app">
      <PreviewPane />
      <SettingsPanel layers={layers} actions={actions} />
    </div>
  );
}
