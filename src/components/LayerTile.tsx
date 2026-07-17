import { useRef, useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Layer, InkColor } from '../types';
import { ColorPicker } from './ColorPicker';

interface LayerTileProps {
  layer: Layer;
  onRemove: () => void;
  onColorChange: (inkColor: InkColor) => void;
  onOpacityChange: (opacity: number) => void;
  onImageUpload: (imageData: ImageData, grayscaleData: ImageData) => void;
}

export function toGrayscale(imageData: ImageData): ImageData {
  const src = imageData.data;
  const out = new ImageData(imageData.width, imageData.height);
  const dst = out.data;
  for (let i = 0; i < src.length; i += 4) {
    const luma = Math.round(0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]);
    dst[i] = luma;
    dst[i + 1] = luma;
    dst[i + 2] = luma;
    dst[i + 3] = src[i + 3];
  }
  return out;
}

export function LayerTile({
  layer,
  onRemove,
  onColorChange,
  onOpacityChange,
  onImageUpload,
}: LayerTileProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailRef = useRef<HTMLCanvasElement>(null);
  const [showPicker, setShowPicker] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Draw thumbnail when grayscaleData changes
  useEffect(() => {
    const canvas = thumbnailRef.current;
    if (!canvas || !layer.grayscaleData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Scale grayscale data to 40x40 thumbnail
    const tmp = document.createElement('canvas');
    tmp.width = layer.grayscaleData.width;
    tmp.height = layer.grayscaleData.height;
    tmp.getContext('2d')!.putImageData(layer.grayscaleData, 0, 0);
    ctx.clearRect(0, 0, 40, 40);
    ctx.drawImage(tmp, 0, 0, 40, 40);
  }, [layer.grayscaleData]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); return; }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const grayscaleData = toGrayscale(imageData);
      onImageUpload(imageData, grayscaleData);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  return (
    <div className="layer-tile" ref={setNodeRef} style={style}>
      {/* Drag handle */}
      <span
        className="layer-drag-handle"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
      >
        ⠿
      </span>

      {/* Thumbnail */}
      <canvas
        ref={thumbnailRef}
        className="layer-tile-thumbnail"
        width={40}
        height={40}
        onClick={() => fileInputRef.current?.click()}
        title="Click to upload image"
        style={{ cursor: 'pointer' }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Name + opacity */}
      <div className="layer-tile-content">
        <span className="layer-tile-name">{layer.name}</span>
        <input
          className="opacity-slider"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={layer.opacity}
          onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
          title={`Opacity: ${Math.round(layer.opacity * 100)}%`}
        />
      </div>

      {/* Color swatch + picker */}
      <div className="layer-tile-actions" style={{ position: 'relative' }}>
        <div
          className="color-swatch"
          style={{ backgroundColor: layer.inkColor.hex }}
          title={layer.inkColor.name}
          onClick={() => setShowPicker((v) => !v)}
        />
        {showPicker && (
          <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 100 }}>
            <ColorPicker
              onSelect={onColorChange}
              onClose={() => setShowPicker(false)}
            />
          </div>
        )}

        {/* Remove */}
        <button className="layer-remove-btn" onClick={onRemove} title="Remove layer">
          ×
        </button>
      </div>
    </div>
  );
}
