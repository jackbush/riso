import { useRef, useState, useEffect, useCallback } from 'react';
import { Layer, RisoConfig } from '../types';
import { useRenderPipeline, ZoomMode } from '../hooks/useRenderPipeline';
import { getCompositeDimensions } from '../engine/renderer';

interface PreviewPaneProps {
  layers: Layer[];
  config: RisoConfig;
  zoomMode: ZoomMode;
  onZoomModeChange: (mode: ZoomMode) => void;
}

// Pointer movement below this (CSS px) counts as a click, above it as a pan.
const DRAG_THRESHOLD = 4;

const TRANSITION_MS = 250;

interface DragState {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
}

interface PendingTransition {
  target: ZoomMode;
  fromRect: DOMRect;
}

export function PreviewPane({ layers, config, zoomMode, onZoomModeChange }: PreviewPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const transitionRef = useRef<PendingTransition | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const isEmpty = !layers.some((l) => l.grayscaleData);

  const clearOverlay = useCallback(() => {
    overlayRef.current?.remove();
    overlayRef.current = null;
    transitionRef.current = null;
  }, []);

  useEffect(() => clearOverlay, [clearOverlay]);

  useEffect(() => {
    if (isEmpty) setCanvasReady(false);
  }, [isEmpty]);

  // Nothing to inspect at 100% once all layers are gone
  useEffect(() => {
    if (isEmpty && zoomMode === 'full') onZoomModeChange('fit');
  }, [isEmpty, zoomMode, onZoomModeChange]);

  /**
   * Freeze the current view under a full-window snapshot overlay, then flip
   * the mode. The overlay hides the layout shuffle and the (possibly slow)
   * re-composite; handleRendered animates it away once the new frame lands.
   */
  function requestZoom(next: ZoomMode, clickFraction?: { fx: number; fy: number }) {
    if (next === zoomMode) return;

    const canvas = canvasRef.current;
    if (canvas && canvasReady) {
      clearOverlay();
      const fromRect = canvas.getBoundingClientRect();

      const snap = document.createElement('canvas');
      snap.width = canvas.width;
      snap.height = canvas.height;
      snap.getContext('2d')?.drawImage(canvas, 0, 0);
      Object.assign(snap.style, {
        position: 'absolute',
        left: `${fromRect.left}px`,
        top: `${fromRect.top}px`,
        width: `${fromRect.width}px`,
        height: `${fromRect.height}px`,
      });

      const overlay = document.createElement('div');
      overlay.className = 'zoom-transition-overlay';
      overlay.appendChild(snap);
      document.body.appendChild(overlay);
      overlayRef.current = overlay;
      transitionRef.current = { target: next, fromRect };
    }

    if (clickFraction) setCenterFraction(clickFraction.fx, clickFraction.fy);
    onZoomModeChange(next);
  }

  /** First frame of a new mode just presented: animate the frozen snapshot
   *  into the new framing (scale about the anchor point, glide it to its new
   *  position) while fading the overlay out over the crisp render. */
  function handleRendered() {
    setCanvasReady(true);

    const transition = transitionRef.current;
    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    if (!transition || !overlay || !canvas) return;
    transitionRef.current = null;

    const snap = overlay.firstChild as HTMLCanvasElement;
    const { fromRect, target } = transition;
    const newRect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const center = getCenterFraction();

    // Displayed CSS px per full-res image px, before and after. A fit view
    // shows the whole full-res composite (content + safe margins) within its
    // rect; a 100% view is 1 image px per device px. Works identically in
    // both flip directions.
    const fullResW =
      getCompositeDimensions(layers).width + 2 * Math.round(config.safeArea ?? 0);
    const oldScale = target === 'full' ? fromRect.width / fullResW : 1 / dpr;
    const newScale = target === 'full' ? 1 / dpr : newRect.width / fullResW;
    const k = newScale / oldScale;

    // The anchor is the image point the transition pivots on: the clicked /
    // stored center. In a fit view it sits at its fraction of the rect; in a
    // 100% view it sits at the viewport center.
    let oldX: number, oldY: number, newX: number, newY: number;
    if (target === 'full') {
      oldX = fromRect.left + center.fx * fromRect.width;
      oldY = fromRect.top + center.fy * fromRect.height;
      newX = newRect.left + newRect.width / 2;
      newY = newRect.top + newRect.height / 2;
    } else {
      oldX = fromRect.left + fromRect.width / 2;
      oldY = fromRect.top + fromRect.height / 2;
      newX = newRect.left + center.fx * newRect.width;
      newY = newRect.top + center.fy * newRect.height;
    }

    snap.style.transformOrigin = `${oldX - fromRect.left}px ${oldY - fromRect.top}px`;
    snap.getBoundingClientRect(); // flush styles so the transition animates

    overlay.style.transition = `opacity ${TRANSITION_MS}ms ease`;
    snap.style.transition = `transform ${TRANSITION_MS}ms ease`;
    overlay.style.opacity = '0';
    snap.style.transform = `translate(${newX - oldX}px, ${newY - oldY}px) scale(${k})`;

    const doneOverlay = overlay;
    window.setTimeout(() => {
      doneOverlay.remove();
      if (overlayRef.current === doneOverlay) overlayRef.current = null;
    }, TRANSITION_MS + 50);
  }

  const { panBy, setCenterFraction, getCenterFraction } = useRenderPipeline(
    layers,
    config,
    canvasRef,
    containerRef,
    zoomMode,
    handleRendered,
  );

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < DRAG_THRESHOLD) return;
      drag.moved = true;
    }
    if (zoomMode === 'full') {
      // CSS px → image px: at 100%, 1 image px = 1 device px = 1/dpr CSS px.
      // Content follows the pointer, so the viewport center moves opposite.
      const dpr = window.devicePixelRatio || 1;
      panBy(-(e.clientX - drag.lastX) * dpr, -(e.clientY - drag.lastY) * dpr);
    }
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.moved) return;

    // A clean click toggles the zoom mode; from fit, zoom in on the point
    // that was clicked.
    if (zoomMode === 'fit') {
      const rect = e.currentTarget.getBoundingClientRect();
      requestZoom('full', {
        fx: (e.clientX - rect.left) / rect.width,
        fy: (e.clientY - rect.top) / rect.height,
      });
    } else {
      requestZoom('fit');
    }
  }

  return (
    <div className="preview-pane" ref={containerRef}>
      {!canvasReady && (
        <div className="preview-empty">
          <p>Add layers to get started</p>
        </div>
      )}
      <canvas
        className={`preview-canvas${zoomMode === 'full' ? ' preview-canvas--full' : ''}`}
        ref={canvasRef}
        style={{ display: canvasReady ? 'block' : 'none', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      {canvasReady && (
        <div className="zoom-controls">
          <button
            type="button"
            className={`zoom-btn${zoomMode === 'fit' ? ' zoom-btn--active' : ''}`}
            onClick={() => requestZoom('fit')}
          >
            Fit
          </button>
          <button
            type="button"
            className={`zoom-btn${zoomMode === 'full' ? ' zoom-btn--active' : ''}`}
            onClick={() => requestZoom('full')}
          >
            100%
          </button>
        </div>
      )}
    </div>
  );
}
