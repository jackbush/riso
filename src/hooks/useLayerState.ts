import { useState, useRef, useMemo } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { Layer, InkColor } from '../types';
import { INKS } from '../config/inks';

export const MAX_LAYERS = 7;

function randomInk(): InkColor {
  const palette = INKS.filter((ink) => ink.name !== 'White');
  return palette[Math.floor(Math.random() * palette.length)];
}


export interface LayerActions {
  addLayer: () => void;
  addLayerWithImage: (grayscaleData: ImageData) => void;
  removeLayer: (id: string) => void;
  reorderLayers: (activeId: string, overId: string) => void;
  updateLayerName: (id: string, name: string) => void;
  updateLayerColor: (id: string, inkColor: InkColor) => void;
  updateLayerOpacity: (id: string, opacity: number) => void;
  updateLayerScale: (id: string, scale: number) => void;
  updateLayerOffset: (id: string, x: number, y: number) => void;
  setLayerImage: (id: string, grayscaleData: ImageData) => void;
  toggleLayerVisible: (id: string) => void;
}

export function useLayerState(): { layers: Layer[] } & LayerActions {
  const [layers, setLayers] = useState<Layer[]>([]);
  // Use a ref for the counter so it stays accurate inside functional setLayers callbacks
  const layerCountRef = useRef(0);

  // Every action closes only over setLayers (stable) and refs, so the whole
  // object can be memoized once — consumers can safely depend on it.
  const actions = useMemo<LayerActions>(() => {
    function newLayer(grayscaleData: ImageData | null): Layer {
      layerCountRef.current += 1;
      return {
        id: crypto.randomUUID(),
        name: `Layer ${layerCountRef.current}`,
        grayscaleData,
        inkColor: randomInk(),
        opacity: 1,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        visible: true,
      };
    }

    return {
      addLayer() {
        setLayers((prev) => (prev.length >= MAX_LAYERS ? prev : [...prev, newLayer(null)]));
      },

      addLayerWithImage(grayscaleData: ImageData) {
        setLayers((prev) =>
          prev.length >= MAX_LAYERS ? prev : [...prev, newLayer(grayscaleData)],
        );
      },

      removeLayer(id: string) {
        setLayers((prev) => prev.filter((l) => l.id !== id));
      },

      reorderLayers(activeId: string, overId: string) {
        setLayers((prev) => {
          const oldIndex = prev.findIndex((l) => l.id === activeId);
          const newIndex = prev.findIndex((l) => l.id === overId);
          if (oldIndex === -1 || newIndex === -1) return prev;
          return arrayMove(prev, oldIndex, newIndex);
        });
      },

      updateLayerName(id: string, name: string) {
        setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
      },

      updateLayerColor(id: string, inkColor: InkColor) {
        setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, inkColor } : l)));
      },

      updateLayerOpacity(id: string, opacity: number) {
        setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, opacity } : l)));
      },

      updateLayerScale(id: string, scale: number) {
        setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, scale } : l)));
      },

      updateLayerOffset(id: string, x: number, y: number) {
        setLayers((prev) =>
          prev.map((l) => (l.id === id ? { ...l, offsetX: x, offsetY: y } : l)),
        );
      },

      setLayerImage(id: string, grayscaleData: ImageData) {
        setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, grayscaleData } : l)));
      },

      toggleLayerVisible(id: string) {
        setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
      },
    };
  }, []);

  return { layers, ...actions };
}
