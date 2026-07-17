import { RisoConfig } from '../types';

interface ConfigPanelProps {
  config: RisoConfig;
  onChange: (updates: Partial<RisoConfig>) => void;
}

export function ConfigPanel({ config, onChange }: ConfigPanelProps) {
  return (
    <>
      {/* Jitter */}
      <label className="config-item config-item--row">
        <span className="config-label">Jitter</span>
        <input
          type="checkbox"
          checked={config.jitterEnabled}
          onChange={(e) => onChange({ jitterEnabled: e.target.checked })}
        />
      </label>

      {/* Safe area */}
      <div className="config-item">
        <label className="config-label">Safe area (px)</label>
        <input
          type="number"
          min={0}
          max={500}
          step={10}
          value={config.safeArea}
          onChange={(e) => onChange({ safeArea: Math.max(0, parseInt(e.target.value, 10) || 0) })}
          className="config-hex-input"
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
    </>
  );
}
