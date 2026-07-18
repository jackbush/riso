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

      {/* Ink blending */}
      <label className="config-item config-item--row">
        <span className="config-label">Ink blending</span>
        <select
          value={config.inkBlendMode}
          onChange={(e) =>
            onChange({ inkBlendMode: e.target.value as RisoConfig['inkBlendMode'] })
          }
        >
          <option value="km">Kubelka-Munk</option>
          <option value="simple">Simple</option>
          <option value="off">Off</option>
        </select>
      </label>
      {config.inkBlendMode === 'km' && (
        <label className="config-item config-item--row">
          <span className="config-label">Order bias</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={config.kubelkaMunkOrderBias}
            onChange={(e) => onChange({ kubelkaMunkOrderBias: parseFloat(e.target.value) })}
          />
        </label>
      )}

      {/* Ink spread */}
      <label className="config-item config-item--row">
        <span className="config-label">Ink spread</span>
        <input
          type="checkbox"
          checked={config.inkSpreadEnabled}
          onChange={(e) => onChange({ inkSpreadEnabled: e.target.checked })}
        />
      </label>
      {config.inkSpreadEnabled && (
        <label className="config-item config-item--row">
          <span className="config-label">Spread amount (px)</span>
          <input
            type="range"
            min={0}
            max={5}
            step={0.5}
            value={config.inkSpreadAmount}
            onChange={(e) => onChange({ inkSpreadAmount: parseFloat(e.target.value) })}
          />
        </label>
      )}

      {/* Halftone */}
      <label className="config-item config-item--row">
        <span className="config-label">Halftone</span>
        <select
          value={config.halftoneMode}
          onChange={(e) =>
            onChange({ halftoneMode: e.target.value as RisoConfig['halftoneMode'] })
          }
        >
          <option value="stochastic">Stochastic</option>
          <option value="am">Dot screen</option>
          <option value="off">Off</option>
        </select>
      </label>
      {config.halftoneMode === 'stochastic' && (
        <label className="config-item config-item--row">
          <span className="config-label">Grain size (px)</span>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={config.halftoneScale}
            onChange={(e) => onChange({ halftoneScale: parseInt(e.target.value, 10) })}
          />
        </label>
      )}
      {config.halftoneMode === 'am' && (
        <>
          <label className="config-item config-item--row">
            <span className="config-label">Dot spacing (px)</span>
            <input
              type="range"
              min={4}
              max={40}
              step={1}
              value={config.halftoneSpacing}
              onChange={(e) => onChange({ halftoneSpacing: parseInt(e.target.value, 10) })}
            />
          </label>
          <label className="config-item config-item--row">
            <span className="config-label">Auto angles</span>
            <input
              type="checkbox"
              checked={config.halftoneAngle === null}
              onChange={(e) => onChange({ halftoneAngle: e.target.checked ? null : 45 })}
            />
          </label>
          {config.halftoneAngle !== null && (
            <label className="config-item config-item--row">
              <span className="config-label">Screen angle (°)</span>
              <input
                type="range"
                min={0}
                max={90}
                step={1}
                value={config.halftoneAngle}
                onChange={(e) => onChange({ halftoneAngle: parseInt(e.target.value, 10) })}
              />
            </label>
          )}
        </>
      )}

      {/* Registration jitter */}
      <label className="config-item config-item--row">
        <span className="config-label">Registration jitter</span>
        <input
          type="checkbox"
          checked={config.registrationJitterEnabled}
          onChange={(e) => onChange({ registrationJitterEnabled: e.target.checked })}
        />
      </label>
      {config.registrationJitterEnabled && (
        <label className="config-item config-item--row">
          <span className="config-label">Jitter amount (px)</span>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={config.registrationJitterAmount}
            onChange={(e) => onChange({ registrationJitterAmount: parseFloat(e.target.value) })}
          />
        </label>
      )}

      {/* Advanced layer options */}
      <label className="config-item config-item--row">
        <span className="config-label">Advanced layer options</span>
        <input
          type="checkbox"
          checked={config.advancedLayerOptionsEnabled}
          onChange={(e) => onChange({ advancedLayerOptionsEnabled: e.target.checked })}
        />
      </label>
    </>
  );
}
