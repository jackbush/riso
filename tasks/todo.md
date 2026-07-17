# Risograph Emulator — Build Plan

## Architecture Overview

```
src/
├── config/
│   └── inks.ts                 # Riso ink color definitions (name, RGB hex)
├── components/
│   ├── App.tsx                 # Root layout: preview (left) + settings (right)
│   ├── PreviewPane.tsx         # Scaled canvas preview of composite
│   ├── SettingsPanel.tsx       # Right panel: layer list + config
│   ├── LayerList.tsx           # Draggable layer list + "add layer" button
│   ├── LayerTile.tsx           # Single layer row: thumbnail, color swatch, opacity, jitter
│   ├── ColorPicker.tsx         # Palette popup for choosing riso ink color
│   └── ConfigPanel.tsx         # Settings: jitter toggle, grain slider, paper color, reg marks
├── engine/
│   ├── compositor.ts           # Multiply-blend compositing logic
│   ├── effects.ts              # Perlin noise grain, paper texture, registration marks
│   └── renderer.ts             # Orchestrates render pipeline (preview + full-res export)
├── hooks/
│   ├── useLayerState.ts        # Layer CRUD, reorder, color/opacity/jitter state
│   └── useRenderPipeline.ts    # Debounced real-time preview rendering
├── types.ts                    # Shared types (Layer, InkColor, Config)
├── main.tsx
└── index.css                   # CSS structure with well-named classes
```

## Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Framework | React 19 + TypeScript + Vite | Fast dev, good component model for UI |
| Canvas | HTML Canvas 2D API | Sufficient for multiply blend, no WebGL needed |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable | Lightweight, accessible, React-native |
| Noise | Custom Perlin noise (simplex-noise pkg) | Paper grain + texture effects |
| Testing | Vitest + React Testing Library | Vite-native, fast |
| State | React useState/useReducer (no Redux) | Manageable state surface |
| Preview | Scaled to viewport, full-res on download | 5000x5000 too heavy for real-time |
| Compositing | Multiply blend mode (Canvas globalCompositeOperation) | Standard riso simulation |
| Max layers | 7 | Matches real riso capability |
| Max resolution | 5000x5000px (A3 @ 300dpi) | Per spec |

---

## Phase 1: Scaffold & Foundation

### 1.1 — Init Vite + React + TypeScript project
- `npm create vite@latest . -- --template react-ts`
- Install deps: `@dnd-kit/core`, `@dnd-kit/sortable`, `simplex-noise`, `vitest`, `@testing-library/react`, `jsdom`
- Configure Vitest in `vite.config.ts`
- **Model: Haiku 4.5 | Effort: Low** — boilerplate scaffolding

### 1.2 — Define types and ink config
- Create `src/types.ts` with `Layer`, `InkColor`, `RisoConfig` types
- Create `src/config/inks.ts` with full official Riso ink palette (~30 colors) with standard names and best RGB hex equivalents
- **Model: Sonnet 4.6 | Effort: Medium** — needs accurate color research

### 1.3 — CSS structure and layout shell
- Create `src/index.css` with CSS custom properties, layout grid (preview left, settings right)
- Use semantic class names: `.preview-pane`, `.settings-panel`, `.layer-list`, `.layer-tile`, `.color-swatch`, `.config-panel`
- Desktop-first responsive layout
- Minimal styling — structure only, user will style manually
- **Model: Sonnet 4.6 | Effort: Low** — layout scaffolding

### 1.4 — App shell component
- `App.tsx`: two-column layout rendering `PreviewPane` and `SettingsPanel`
- Lift shared state here (layers, config) via `useLayerState` and config state
- **Model: Sonnet 4.6 | Effort: Low**

---

## Phase 2: Layer Management UI

### 2.1 — useLayerState hook
- State: `Layer[]` with id, name, imageData (original upload), grayscale ImageData, inkColor, opacity (0-1), jitterX, jitterY, visible
- Actions: addLayer, removeLayer, reorderLayers, updateLayerColor, updateLayerOpacity, updateLayerJitter, setLayerImage
- On addLayer: assign random color from ink palette, random jitter values (used when jitter enabled)
- Enforce 7-layer max
- **Model: Sonnet 4.6 | Effort: Medium**

### 2.2 — LayerList + LayerTile components
- `LayerList`: renders layers using `@dnd-kit/sortable`, "Add Layer" button floats at bottom
- `LayerTile`: shows grayscale thumbnail on left, ink color swatch on right, opacity slider, layer name
- Click swatch → opens `ColorPicker`
- Upload triggers file input, converts to grayscale, stores on layer
- **Model: Sonnet 4.6 | Effort: Medium**

### 2.3 — ColorPicker component
- Palette grid of all inks from `config/inks.ts`
- Each swatch shows color + name on hover
- Click selects, closes picker
- **Model: Haiku 4.5 | Effort: Low**

### 2.4 — Drag-and-drop layer reordering
- Wire `@dnd-kit/sortable` into `LayerList`
- Reorder updates layer state (affects composite render order)
- **Model: Haiku 4.5 | Effort: Low**

### 2.5 — Tests: layer management
- Test addLayer respects 7-layer max
- Test reorder updates array correctly
- Test color assignment on creation
- Test grayscale conversion produces single-channel output
- **Model: Haiku 4.5 | Effort: Low**

---

## Phase 3: Render Engine

### 3.1 — Grayscale conversion utility
- Convert uploaded image to grayscale on an offscreen canvas
- Store as ImageData on the layer
- **Model: Sonnet 4.6 | Effort: Low**

### 3.2 — Compositor (multiply blend)
- Create offscreen canvas at composite size (largest uploaded image dimensions, max 5000x5000)
- Start with paper base color (configurable hex)
- For each layer (bottom to top):
  - Create temp canvas with layer image
  - Tint grayscale image with layer's ink color (map white→transparent, black→ink color, grays→proportional)
  - Apply layer opacity
  - Apply jitter offset (if jitter enabled in config): translate by layer's jitterX/jitterY
  - Composite onto main canvas using `multiply` blend mode
- **Model: Opus 4.6 | Effort: High** — core algorithm, needs to be correct

### 3.3 — Effects: paper grain + texture
- Generate Perlin noise texture at canvas size
- Apply as subtle luminance variation (simulates paper fiber)
- Grain size controlled by slider (scales noise frequency)
- Paper base color applied as background before compositing
- **Model: Opus 4.6 | Effort: High** — visual quality matters

### 3.4 — Effects: registration marks
- Draw standard registration/crop marks at corners and edge midpoints
- Toggle via config setting (default: on)
- Only on preview, not on download
- **Model: Sonnet 4.6 | Effort: Low**

### 3.5 — Render pipeline hook (useRenderPipeline)
- Debounced (100-200ms) re-render on any state change
- Renders at preview scale (fit to viewport) for the canvas element
- Separate `exportFullRes()` function renders at original resolution and triggers PNG download
- **Model: Sonnet 4.6 | Effort: Medium**

### 3.6 — Tests: render engine
- Test compositor output with known inputs (single solid layer → expected color)
- Test multiply blend math for overlapping layers
- Test jitter offsets apply correctly
- Test grayscale tinting produces correct RGB values
- Test grain effect modifies pixel values within expected range
- **Model: Sonnet 4.6 | Effort: Medium**

---

## Phase 4: Config Panel & Settings

### 4.1 — ConfigPanel component
- Collapsible/expandable section in settings panel
- Controls:
  - Jitter: on/off toggle (default off)
  - Paper grain size: slider (range TBD, maps to noise frequency)
  - Paper base color: hex input with color preview
  - Registration marks: on/off toggle (default on)
- When jitter toggled on, each layer's stored jitterX/jitterY values become active
- Per-layer jitter X/Y inputs appear on LayerTile when jitter is enabled
- **Model: Sonnet 4.6 | Effort: Low**

### 4.2 — Download button
- "Download PNG" button in settings or toolbar
- Calls `exportFullRes()` — renders at full input resolution with all effects (grain, jitter if on) except registration marks
- Triggers browser download as `riso-print.png`
- **Model: Haiku 4.5 | Effort: Low**

---

## Phase 5: Polish & Integration

### 5.1 — Centre-align layers of different sizes
- Composite canvas = dimensions of largest uploaded image
- Smaller layers centered within that canvas
- **Model: Sonnet 4.6 | Effort: Low**

### 5.2 — Real-time preview wiring
- Connect all state changes to render pipeline
- Ensure debounced updates feel responsive
- Preview canvas scales to fit available viewport space
- **Model: Sonnet 4.6 | Effort: Medium**

### 5.3 — Edge cases & robustness
- Handle: no layers, single layer, removing all layers
- Handle: very large image uploads (show loading state)
- Handle: replacing an image on existing layer
- Validate image dimensions ≤ 5000x5000
- **Model: Sonnet 4.6 | Effort: Medium**

### 5.4 — End-to-end smoke tests
- Upload image → appears in layer list
- Change color → preview updates
- Reorder layers → preview updates
- Toggle jitter → preview changes
- Download → produces valid PNG
- **Model: Sonnet 4.6 | Effort: Medium**

---

## Implementation Order

1. [x] Write plan (this file)
2. [x] **1.1** Scaffold project
3. [x] **1.2** Types + ink config
4. [x] **1.3** CSS structure
5. [x] **1.4** App shell
6. [ ] **2.1** useLayerState hook
7. [ ] **2.2** LayerList + LayerTile
8. [ ] **2.3** ColorPicker
9. [ ] **2.4** Drag-and-drop
10. [ ] **2.5** Layer management tests
11. [ ] **3.1** Grayscale conversion
12. [ ] **3.2** Compositor (multiply blend)
13. [ ] **3.3** Paper grain + texture effects
14. [ ] **3.4** Registration marks
15. [ ] **3.5** Render pipeline hook
16. [ ] **3.6** Render engine tests
17. [ ] **4.1** ConfigPanel
18. [ ] **4.2** Download button
19. [ ] **5.1** Centre-align layers
20. [ ] **5.2** Real-time preview wiring
21. [ ] **5.3** Edge cases
22. [ ] **5.4** Smoke tests

---

## Model Recommendations Summary

| Effort | Model | Use For |
|---|---|---|
| **High** | Opus 4.6 | Compositor algorithm (3.2), paper grain effects (3.3) |
| **Medium** | Sonnet 4.6 | Ink config (1.2), state hook (2.1), layer UI (2.2), render pipeline (3.5), tests (3.6), integration (5.x) |
| **Low** | Haiku 4.5 | Scaffolding (1.1), CSS (1.3), ColorPicker (2.3), DnD (2.4), simple tests (2.5), download (4.2) |

**General rule:** Use Opus for anything where correctness and visual quality are critical (the render engine). Use Sonnet for standard React component work and moderate logic. Use Haiku for boilerplate and simple wiring.
