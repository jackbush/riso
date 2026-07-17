# Risograph Emulator

Simulates risograph printing: upload grayscale images as layers, assign ink colors, and composite them with multiply blending. Exports full-resolution PNG.

## Dev

```
npm install
npm run dev      # localhost:5173
npm run build    # type-check + production build
npm run test     # vitest
```

## Structure

```
src/
├── config/inks.ts          # Official Riso ink palette (~30 colors, accurate hex)
├── engine/
│   ├── grayscale.ts        # toGrayscale() — luminance-weighted RGBA→grey
│   ├── compositor.ts       # hexToRgb, tintGrayscale, composite (multiply blend)
│   └── renderer.ts         # getCompositeDimensions, render, exportFullRes
├── hooks/
│   ├── useLayerState.ts    # Layer CRUD, reorder, color/opacity/jitter
│   └── useRenderPipeline.ts# Debounced preview render + ResizeObserver
├── components/
│   ├── App.tsx             # Root: layers state + config state
│   ├── PreviewPane.tsx     # Canvas preview, wires useRenderPipeline
│   ├── SettingsPanel.tsx   # LayerList + ConfigPanel + Download button
│   ├── LayerList.tsx       # @dnd-kit sortable list
│   ├── LayerTile.tsx       # Thumbnail, opacity slider, color swatch, jitter inputs
│   ├── ColorPicker.tsx     # Ink palette popup (click-outside closes)
│   └── ConfigPanel.tsx     # Jitter toggle, grain slider, paper color, reg marks
└── types.ts                # Layer, InkColor, RisoConfig
```

## Key decisions

| Topic | Choice | Why |
|---|---|---|
| Compositing | Canvas `globalCompositeOperation = 'multiply'` | Standard riso simulation |
| Tinting | Per-pixel lerp: `out = 255 - density*(255 - ink)` where `density = (255-grey)/255` | Black→ink, white→transparent to multiply |
| Layers | Max 7, bottom-to-top draw order, centered within composite canvas | Matches real riso |
| Canvas size | Max of all uploaded image dimensions, capped at 5000×5000 | A3 @ 300dpi |
| Preview | Scaled to fit container via ResizeObserver + 150ms debounce | Too slow at full res |
| Export | Full-res render without reg marks, triggers PNG download | `canvas.toBlob` |
| State | `useLayerState` hook in App, no external store | Manageable surface |
| DnD | `@dnd-kit/core` + `@dnd-kit/sortable` | Lightweight, accessible |

## Compositing pipeline

```
upload → toGrayscale → stored on Layer.grayscaleData
                                        ↓
                          tintGrayscale(grey, inkR, inkG, inkB)
                                        ↓
                    ctx.globalCompositeOperation = 'multiply'
                    ctx.globalAlpha = layer.opacity
                    ctx.drawImage(tinted, centeredX + jitterX, ...)
                                        ↓
```

## CSS classes

`.preview-pane` `.preview-canvas` `.settings-panel` `.layer-list` `.layer-tile` `.layer-tile-thumbnail` `.layer-tile-content` `.layer-tile-actions` `.color-swatch` `.color-picker` `.color-picker-swatch` `.config-panel` `.config-body` `.config-item` `.jitter-inputs` `.export-btn`

All custom properties defined in `:root` in `index.css`.
