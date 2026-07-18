import { useState, useEffect } from 'react';
import { RisoConfig } from '../types';

const PAPER_PRESETS = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Eggshell', hex: '#FFFDF5' },
  { name: 'Natural', hex: '#F2ECD9' },
  { name: 'Stone', hex: '#DDD9CF' },
  { name: 'Newsprint', hex: '#C8C4B4' },
];

interface ConfigPanelProps {
  config: RisoConfig;
  onChange: (updates: Partial<RisoConfig>) => void;
}

export function ConfigPanel({ config, onChange }: ConfigPanelProps) {
  const [hexInput, setHexInput] = useState(config.paperColor);

  useEffect(() => {
    setHexInput(config.paperColor);
  }, [config.paperColor]);

  return (
    <>
      {/* Paper color */}
      <div className="config-item">
        <label className="config-item config-item--row">
          <span className="config-label">Paper color</span>
          <input
            type="text"
            value={hexInput}
            onChange={(e) => {
              const v = e.target.value;
              setHexInput(v);
              if (/^#[0-9A-Fa-f]{6}$/.test(v.trim())) onChange({ paperColor: v.trim() });
            }}
            maxLength={7}
            className="config-inline-input"
            spellCheck={false}
          />
        </label>
        <div className="paper-preset-row">
          {PAPER_PRESETS.map((preset) => (
            <button
              key={preset.hex}
              className={`paper-preset-swatch${config.paperColor.toUpperCase() === preset.hex.toUpperCase() ? ' paper-preset-swatch--active' : ''}`}
              style={{ backgroundColor: preset.hex }}
              title={preset.name}
              onClick={() => onChange({ paperColor: preset.hex })}
            />
          ))}
        </div>
      </div>

      {/* Safe area */}
      <label className="config-item config-item--row">
        <span className="config-label">Safe area (px)</span>
        <input
          type="number"
          min={0}
          max={500}
          step={10}
          value={config.safeArea}
          onChange={(e) => onChange({ safeArea: Math.max(0, parseInt(e.target.value, 10) || 0) })}
          className="config-inline-input"
        />
      </label>

      {/* Layer opacity */}
      <label className="config-item config-item--row">
        <span className="config-label">Layer opacity</span>
        <input
          type="checkbox"
          checked={config.opacityEnabled}
          onChange={(e) => onChange({ opacityEnabled: e.target.checked })}
        />
      </label>

      {/* Layer offset */}
      <label className="config-item config-item--row">
        <span className="config-label">Layer offset</span>
        <input
          type="checkbox"
          checked={config.offsetEnabled}
          onChange={(e) => onChange({ offsetEnabled: e.target.checked })}
        />
      </label>

      {/* Ink transparency */}
      <label className="config-item config-item--row">
        <span className="config-label">Ink transparency</span>
        <input
          type="checkbox"
          checked={config.inkTransparencyEnabled}
          onChange={(e) => onChange({ inkTransparencyEnabled: e.target.checked })}
        />
      </label>
    </>
  );
}
