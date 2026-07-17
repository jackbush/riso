import { useState, useRef } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { Layer, InkColor } from '../types';
import { INKS } from '../config/inks';

const MAX_LAYERS = 7;
function randomInk(): InkColor {
  const palette = INKS.filter((ink) => ink.name !== 'White');
  return palette[Math.floor(Math.random() * palette.length)];
}


export interface LayerActions {
  addLayer: () => void;
  removeLayer: (id: string) => void;
  reorderLayers: (activeId: string, overId: string) => void;
  updateLayerName: (id: string, name: string) => void;
  updateLayerColor: (id: string, inkColor: InkColor) => void;
  updateLayerOpacity: (id: string, opacity: number) => void;
  updateLayerOffset: (id: string, x: number, y: number) => void;
  setLayerImage: (id: string, imageData: ImageData, grayscaleData: ImageData) => void;
  toggleLayerVisible: (id: string) => void;
}

export function useLayerState(): { layers: Layer[] } & LayerActions {
  const [layers, setLayers] = useState<Layer[]>([]);
  // Use a ref for the counter so it stays accurate inside functional setLayers callbacks
  const layerCountRef = useRef(0);

  function addLayer() {
    setLayers((prev) => {
      if (prev.length >= MAX_LAYERS) return prev;
      layerCountRef.current += 1;
      const n = layerCountRef.current;
      const newLayer: Layer = {
        id: crypto.randomUUID(),
        name: `Layer ${n}`,
        imageData: null,
        grayscaleData: null,
        inkColor: randomInk(),
        opacity: 1,
        offsetX: 0,
        offsetY: 0,
        visible: true,
      };
      return [...prev, newLayer];
    });
  }

  function removeLayer(id: string) {
    setLayers((prev) => prev.filter((l) => l.id !== id));
  }

  function reorderLayers(activeId: string, overId: string) {
    setLayers((prev) => {
      const oldIndex = prev.findIndex((l) => l.id === activeId);
      const newIndex = prev.findIndex((l) => l.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function updateLayerName(id: string, name: string) {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, name } : l))
    );
  }

  function updateLayerColor(id: string, inkColor: InkColor) {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, inkColor } : l))
    );
  }

  function updateLayerOpacity(id: string, opacity: number) {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l))
    );
  }

  function updateLayerOffset(id: string, x: number, y: number) {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, offsetX: x, offsetY: y } : l))
    );
  }

  function setLayerImage(id: string, imageData: ImageData, grayscaleData: ImageData) {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, imageData, grayscaleData } : l))
    );
  }

  function toggleLayerVisible(id: string) {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  }

  return {
    layers,
    addLayer,
    removeLayer,
    reorderLayers,
    updateLayerName,
    updateLayerColor,
    updateLayerOpacity,
    updateLayerOffset,
    setLayerImage,
    toggleLayerVisible,
  };
}
