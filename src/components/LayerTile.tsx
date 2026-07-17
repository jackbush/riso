import { useRef, useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Layer, InkColor } from '../types';
import { ColorPicker } from './ColorPicker';
import { toGrayscale } from '../engine/grayscale';

const PREVIEW_SIZE = 72;

interface LayerTileProps {
  layer: Layer;
  offsetEnabled: boolean;
  opacityEnabled: boolean;
  onRemove: () => void;
  onNameChange: (name: string) => void;
  onColorChange: (inkColor: InkColor) => void;
  onOpacityChange: (opacity: number) => void;
  onOffsetChange: (x: number, y: number) => void;
  onImageUpload: (imageData: ImageData, grayscaleData: ImageData) => void;
}

export function LayerTile({
  layer,
  offsetEnabled,
  opacityEnabled,
  onRemove,
  onNameChange,
  onColorChange,
  onOpacityChange,
  onOffsetChange,
  onImageUpload,
}: LayerTileProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailRef = useRef<HTMLCanvasElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(layer.name);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    const canvas = thumbnailRef.current;
    if (!canvas || !layer.grayscaleData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const tmp = document.createElement('canvas');
    tmp.width = layer.grayscaleData.width;
    tmp.height = layer.grayscaleData.height;
    tmp.getContext('2d')!.putImageData(layer.grayscaleData, 0, 0);
    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    ctx.drawImage(tmp, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  }, [layer.grayscaleData]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.select();
  }, [editingName]);

  function commitName() {
    const trimmed = nameDraft.trim();
    if (trimmed) onNameChange(trimmed);
    else setNameDraft(layer.name);
    setEditingName(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 6400;
      if (img.width > MAX || img.height > MAX) {
        alert(
          `Image is too large (${img.width}×${img.height}px). ` +
          `Maximum allowed size is ${MAX}×${MAX}px.`,
        );
        URL.revokeObjectURL(url);
        setIsLoading(false);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); setIsLoading(false); return; }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const grayscaleData = toGrayscale(imageData);
      onImageUpload(imageData, grayscaleData);
      URL.revokeObjectURL(url);
      setIsLoading(false);
    };
    img.onerror = () => { URL.revokeObjectURL(url); setIsLoading(false); };
    img.src = url;
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

      {/* Image preview */}
      <div className="layer-tile-preview-wrap" onClick={() => fileInputRef.current?.click()}>
        {isLoading ? (
          <div className="layer-tile-loading" title="Processing…" />
        ) : (
          <canvas
            ref={thumbnailRef}
            className="layer-tile-preview"
            width={PREVIEW_SIZE}
            height={PREVIEW_SIZE}
            title={layer.grayscaleData ? 'Click to replace image' : 'Click to upload image'}
          />
        )}
      </div>

      {/* Color preview */}
      <div className="layer-tile-color-wrap" style={{ position: 'relative' }}>
        <div
          className="layer-tile-color-preview"
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
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Name + controls + delete */}
      <div className="layer-tile-content">
        <div className="layer-tile-name-row">
          {editingName ? (
            <input
              ref={nameInputRef}
              className="layer-tile-name-input"
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') { setNameDraft(layer.name); setEditingName(false); }
              }}
            />
          ) : (
            <span
              className="layer-tile-name"
              onClick={() => { setNameDraft(layer.name); setEditingName(true); }}
              title="Click to rename"
            >
              {layer.name}
            </span>
          )}
          <button className="layer-remove-btn" onClick={onRemove} title="Remove layer">
            ×
          </button>
        </div>

        {opacityEnabled && (
          <label className="layer-tile-field-row">
            <span className="layer-tile-field-label">Opacity</span>
            <input
              type="number"
              className="layer-tile-field-input"
              min={0}
              max={100}
              value={Math.round(layer.opacity * 100)}
              onChange={(e) => {
                const v = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                onOpacityChange(v / 100);
              }}
            />
          </label>
        )}

        {offsetEnabled && (
          <div className="layer-tile-field-row">
            <span className="layer-tile-field-label">Offset</span>
            <span className="layer-tile-offset-inputs">
              <span className="layer-tile-field-label">X</span>
              <input
                type="number"
                className="layer-tile-field-input"
                min={-100}
                max={100}
                value={layer.offsetX}
                onChange={(e) => onOffsetChange(parseInt(e.target.value, 10) || 0, layer.offsetY)}
              />
              <span className="layer-tile-field-label">Y</span>
              <input
                type="number"
                className="layer-tile-field-input"
                min={-100}
                max={100}
                value={layer.offsetY}
                onChange={(e) => onOffsetChange(layer.offsetX, parseInt(e.target.value, 10) || 0)}
              />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
