import { PreviewPane } from './components/PreviewPane';
import { SettingsPanel } from './components/SettingsPanel';
import './index.css';

export function App() {
  return (
    <div className="app">
      <PreviewPane />
      <SettingsPanel />
    </div>
  );
}
