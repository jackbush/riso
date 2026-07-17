import { describe, it, expect, beforeAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLayerState } from './useLayerState';
import { toGrayscale } from '../components/LayerTile';

// jsdom doesn't provide ImageData — polyfill for tests
beforeAll(() => {
  if (typeof globalThis.ImageData === 'undefined') {
    (globalThis as Record<string, unknown>).ImageData = class ImageData {
      width: number;
      height: number;
      data: Uint8ClampedArray;
      constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
        this.data = new Uint8ClampedArray(w * h * 4);
      }
    };
  }
});

describe('useLayerState', () => {
  it('starts with empty layers', () => {
    const { result } = renderHook(() => useLayerState());
    expect(result.current.layers).toHaveLength(0);
  });

  it('addLayer adds a layer', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => { result.current.addLayer(); });
    expect(result.current.layers).toHaveLength(1);
  });

  it('addLayer assigns a non-White ink color', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => { result.current.addLayer(); });
    expect(result.current.layers[0].inkColor.name).not.toBe('White');
  });

  it('addLayer sets visible=true and opacity=1', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => { result.current.addLayer(); });
    const layer = result.current.layers[0];
    expect(layer.visible).toBe(true);
    expect(layer.opacity).toBe(1);
  });

  it('addLayer enforces 7-layer max', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => {
      for (let i = 0; i < 9; i++) result.current.addLayer();
    });
    expect(result.current.layers).toHaveLength(7);
  });

  it('removeLayer removes the correct layer', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => {
      result.current.addLayer();
      result.current.addLayer();
    });
    const idToRemove = result.current.layers[0].id;
    act(() => { result.current.removeLayer(idToRemove); });
    expect(result.current.layers).toHaveLength(1);
    expect(result.current.layers[0].id).not.toBe(idToRemove);
  });

  it('reorderLayers swaps layer positions', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => {
      result.current.addLayer();
      result.current.addLayer();
    });
    const [first, second] = result.current.layers;
    act(() => { result.current.reorderLayers(first.id, second.id); });
    expect(result.current.layers[0].id).toBe(second.id);
    expect(result.current.layers[1].id).toBe(first.id);
  });

  it('updateLayerColor changes only the targeted layer', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => {
      result.current.addLayer();
      result.current.addLayer();
    });
    const [layer0, layer1] = result.current.layers;
    // Pin layer[1] to a known different color first
    const blueColor = { name: 'Blue', hex: '#0000FF' };
    act(() => { result.current.updateLayerColor(layer1.id, blueColor); });
    // Now set layer[0] to Red
    const redColor = { name: 'Red', hex: '#FF0000' };
    act(() => { result.current.updateLayerColor(layer0.id, redColor); });
    expect(result.current.layers[0].inkColor).toEqual(redColor);
    expect(result.current.layers[1].inkColor).toEqual(blueColor);
  });

  it('updateLayerOpacity sets the correct opacity', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => { result.current.addLayer(); });
    const id = result.current.layers[0].id;
    act(() => { result.current.updateLayerOpacity(id, 0.5); });
    expect(result.current.layers[0].opacity).toBe(0.5);
  });

  it('toggleLayerVisible flips the visible flag', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => { result.current.addLayer(); });
    const id = result.current.layers[0].id;
    expect(result.current.layers[0].visible).toBe(true);
    act(() => { result.current.toggleLayerVisible(id); });
    expect(result.current.layers[0].visible).toBe(false);
  });

  it('each layer gets a unique id', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => {
      result.current.addLayer();
      result.current.addLayer();
      result.current.addLayer();
    });
    const ids = result.current.layers.map((l) => l.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('layer names increment correctly', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => {
      result.current.addLayer();
      result.current.addLayer();
      result.current.addLayer();
    });
    expect(result.current.layers[0].name).toBe('Layer 1');
    expect(result.current.layers[1].name).toBe('Layer 2');
    expect(result.current.layers[2].name).toBe('Layer 3');
  });

  it('updateLayerJitter sets jitter values', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => { result.current.addLayer(); });
    const id = result.current.layers[0].id;
    act(() => { result.current.updateLayerJitter(id, 10, -15); });
    expect(result.current.layers[0].jitterX).toBe(10);
    expect(result.current.layers[0].jitterY).toBe(-15);
  });
});

describe('toGrayscale', () => {
  it('converts RGB pixels to single-channel luma', () => {
    // 2x1 image: one red pixel, one green pixel
    const src = new ImageData(2, 1);
    // Red pixel (255, 0, 0, 255)
    src.data[0] = 255; src.data[1] = 0; src.data[2] = 0; src.data[3] = 255;
    // Green pixel (0, 255, 0, 255)
    src.data[4] = 0; src.data[5] = 255; src.data[6] = 0; src.data[7] = 255;

    const out = toGrayscale(src);

    // Red luma: round(0.299 * 255) = 76
    expect(out.data[0]).toBe(76);
    expect(out.data[1]).toBe(76);
    expect(out.data[2]).toBe(76);
    expect(out.data[3]).toBe(255); // alpha preserved

    // Green luma: round(0.587 * 255) = 150
    expect(out.data[4]).toBe(150);
    expect(out.data[5]).toBe(150);
    expect(out.data[6]).toBe(150);
    expect(out.data[7]).toBe(255);
  });

  it('preserves alpha channel', () => {
    const src = new ImageData(1, 1);
    src.data[0] = 128; src.data[1] = 128; src.data[2] = 128; src.data[3] = 100;
    const out = toGrayscale(src);
    expect(out.data[3]).toBe(100);
  });

  it('R=G=B for every output pixel', () => {
    const src = new ImageData(1, 1);
    src.data[0] = 200; src.data[1] = 100; src.data[2] = 50; src.data[3] = 255;
    const out = toGrayscale(src);
    expect(out.data[0]).toBe(out.data[1]);
    expect(out.data[1]).toBe(out.data[2]);
  });
});
