export function SettingsPanel() {
  return (
    <div className="settings-panel">
      <div className="layer-list">
        <div style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
          No layers yet. Add a layer to get started.
        </div>
      </div>
      <div className="config-panel">
        <div className="config-label">Configuration</div>
        <div style={{ fontSize: '0.875rem', color: '#666' }}>
          Settings coming soon...
        </div>
      </div>
    </div>
  );
}
