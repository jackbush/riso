import { useEffect, useRef } from 'react';
import { INKS } from '../config/inks';
import { InkColor } from '../types';

interface ColorPickerProps {
  onSelect: (ink: InkColor) => void;
  onClose: () => void;
}

export function ColorPicker({ onSelect, onClose }: ColorPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  return (
    <div className="color-picker" ref={ref}>
      {INKS.map((ink) => (
        <div
          key={ink.name}
          className="color-picker-swatch"
          style={{ backgroundColor: ink.hex }}
          title={ink.name}
          onClick={() => {
            onSelect(ink);
            onClose();
          }}
        />
      ))}
    </div>
  );
}
