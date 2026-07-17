import { RisoConfig } from '../types';

interface ConfigPanelProps {
  config: RisoConfig;
  onChange: (updates: Partial<RisoConfig>) => void;
}

export function ConfigPanel({ config, onChange }: ConfigPanelProps) {
  return (
    <details className="config-panel" open>
      <summary className="config-panel-summary">Configuration</summary>

      <div className="config-body">
        {/* Jitter */}
        <label className="config-item config-item--row">
          <span className="config-label">Jitter</span>
          <input
            type="checkbox"
            checked={config.jitterEnabled}
            onChange={(e) => onChange({ jitterEnabled: e.target.checked })}
          />
        </label>

        {/* Paper grain */}
        <div className="config-item">
          <label className="config-label">
            Paper grain
            <span className="config-value">{config.grainSize.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={config.grainSize}
            onChange={(e) => onChange({ grainSize: parseFloat(e.target.value) })}
          />
        </div>

        {/* Paper color */}
        <div className="config-item">
          <label className="config-label">Paper color</label>
          <div className="config-color-row">
            <input
              type="color"
              value={config.paperColor}
              onChange={(e) => onChange({ paperColor: e.target.value })}
              className="config-color-swatch"
            />
            <input
              type="text"
              value={config.paperColor}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange({ paperColor: v });
              }}
              maxLength={7}
              className="config-hex-input"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Registration marks */}
        <label className="config-item config-item--row">
          <span className="config-label">Reg marks</span>
          <input
            type="checkbox"
            checked={config.showRegMarks}
            onChange={(e) => onChange({ showRegMarks: e.target.checked })}
          />
        </label>
      </div>
    </details>
  );
}
