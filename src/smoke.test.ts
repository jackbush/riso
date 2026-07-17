/**
 * End-to-end smoke tests.
 * These verify that key data flows produce correct state transitions —
 * the same transitions that the render pipeline and UI depend on.
 * Canvas-based rendering is verified visually via `npm run dev`.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLayerState } from './hooks/useLayerState';
import { getCompositeDimensions } from './engine/renderer';
import { tintGrayscale } from './engine/compositor';

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

// ─── 1. Upload image → layer stores imageData + grayscaleData ───────────────

describe('Upload image smoke', () => {
  it('setLayerImage stores both imageData and grayscaleData on the correct layer', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => {
      result.current.addLayer();
      result.current.addLayer();
    });

    const [l0] = result.current.layers;
    const img = new ImageData(200, 150);
    const gray = new ImageData(200, 150);

    act(() => result.current.setLayerImage(l0.id, img, gray));

    expect(result.current.layers[0].imageData).toBe(img);
    expect(result.current.layers[0].grayscaleData).toBe(gray);
    // Second layer unaffected
    expect(result.current.layers[1].imageData).toBeNull();
  });

  it('replacing an image on an existing layer updates data in place', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => result.current.addLayer());

    const id = result.current.layers[0].id;
    const first = new ImageData(100, 100);
    const second = new ImageData(300, 200);

    act(() => result.current.setLayerImage(id, first, new ImageData(100, 100)));
    expect(result.current.layers[0].grayscaleData?.width).toBe(100);

    act(() => result.current.setLayerImage(id, second, new ImageData(300, 200)));
    expect(result.current.layers[0].grayscaleData?.width).toBe(300);
    expect(result.current.layers).toHaveLength(1); // same layer, updated
  });
});

// ─── 2. Change color → inkColor updates ──────────────────────────────────────

describe('Color change smoke', () => {
  it('changing ink color on a layer updates inkColor and leaves others unchanged', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => {
      result.current.addLayer();
      result.current.addLayer();
    });

    const [l0, l1] = result.current.layers;
    const originalL1Color = l1.inkColor;
    const newColor = { name: 'Red', hex: '#FF0000' };

    act(() => result.current.updateLayerColor(l0.id, newColor));

    expect(result.current.layers[0].inkColor).toEqual(newColor);
    expect(result.current.layers[1].inkColor).toEqual(originalL1Color);
  });

  it('tintGrayscale output changes when ink color changes', () => {
    const gray = new ImageData(1, 1);
    gray.data[0] = 0; gray.data[1] = 0; gray.data[2] = 0; gray.data[3] = 255; // black

    const redTint = tintGrayscale(gray, 255, 0, 0);
    const blueTint = tintGrayscale(gray, 0, 0, 255);

    // Same grayscale input, different ink → different output
    expect(redTint.data[0]).toBe(255); // R channel
    expect(redTint.data[2]).toBe(0);   // B channel

    expect(blueTint.data[0]).toBe(0);   // R channel
    expect(blueTint.data[2]).toBe(255); // B channel
  });
});

// ─── 3. Reorder layers → order changes ───────────────────────────────────────

describe('Reorder smoke', () => {
  it('reorderLayers changes the position of layers (affects composite order)', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => {
      result.current.addLayer();
      result.current.addLayer();
      result.current.addLayer();
    });

    const [a, b, c] = result.current.layers;

    // Move first layer to the end
    act(() => result.current.reorderLayers(a.id, c.id));

    const ids = result.current.layers.map((l) => l.id);
    // a should now be after c's original position
    expect(ids.indexOf(a.id)).toBeGreaterThan(ids.indexOf(b.id));
  });
});

// ─── 4. Jitter toggle ────────────────────────────────────────────────────────

describe('Jitter smoke', () => {
  it('jitterX and jitterY are set at creation (non-zero most of the time)', () => {
    // Run multiple times — at least one pair should be non-zero
    const { result } = renderHook(() => useLayerState());
    act(() => {
      for (let i = 0; i < 5; i++) result.current.addLayer();
    });
    const hasJitter = result.current.layers.some(
      (l) => l.jitterX !== 0 || l.jitterY !== 0,
    );
    expect(hasJitter).toBe(true);
  });

  it('updateLayerJitter stores exact values', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => result.current.addLayer());
    const id = result.current.layers[0].id;
    act(() => result.current.updateLayerJitter(id, 42, -17));
    expect(result.current.layers[0].jitterX).toBe(42);
    expect(result.current.layers[0].jitterY).toBe(-17);
  });
});

// ─── 5. getCompositeDimensions grows with uploaded images ────────────────────

describe('getCompositeDimensions smoke', () => {
  it('dimensions grow as images are added to layers', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => result.current.addLayer());

    // No image yet → default
    expect(getCompositeDimensions(result.current.layers)).toEqual({
      width: 800,
      height: 600,
    });

    act(() =>
      result.current.setLayerImage(
        result.current.layers[0].id,
        new ImageData(1200, 900),
        new ImageData(1200, 900),
      ),
    );

    expect(getCompositeDimensions(result.current.layers)).toEqual({
      width: 1200,
      height: 900,
    });
  });

  it('removing all layers resets dimensions to default', () => {
    const { result } = renderHook(() => useLayerState());
    act(() => result.current.addLayer());
    const id = result.current.layers[0].id;
    act(() =>
      result.current.setLayerImage(id, new ImageData(500, 400), new ImageData(500, 400)),
    );
    act(() => result.current.removeLayer(id));

    expect(getCompositeDimensions(result.current.layers)).toEqual({
      width: 800,
      height: 600,
    });
  });
});
