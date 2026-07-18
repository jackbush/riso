# RISO

A risograph print emulator that runs in your browser. Drop in some images, stack them up as ink layers, and watch them overprint with all the happy accidents real riso is loved for — wonky registration, ink bleed, grain, and colours that mix like actual pigment instead of pixels.

**Try it: [jackbush.github.io/riso](https://jackbush.github.io/riso/)** — nothing gets uploaded, everything runs locally.

## Riso?

A risograph is a Japanese duplicator from the 80s. Think screen printing pretending to be a photocopier: it prints one vivid ink at a time, so a multi-colour print means feeding the same sheet through again and again. The layers never quite line up, the inks are semi-transparent and mix where they overlap, and the whole thing has a warm, slightly-off charm that a normal printer can't do.

This fakes all of that. Use it to play, or to plan colour separations before spending real money at a print shop.

## How to use it

1. **Drag images (or a PDF) onto the page.** Each image becomes a layer, each PDF page too. Up to 7 — a real shop would charge you dearly for 7 passes.
2. **Click a layer's colour strip** and pick an ink. The palette is ~30 real riso inks; Fluorescent Pink + Blue is a classic first combo.
3. **Fiddle with the settings** until it feels like a print, not a screen. The defaults are already most of the way there.
4. **Download** (bottom left) for a full-resolution PNG.

Layers turn grayscale on import: dark areas become heavy ink, light areas become bare paper. That's exactly how a real riso sees your artwork — one colour separation at a time. Drag the handle to reorder layers (they print bottom to top), click the name to rename, click the thumbnail to swap the image.

### The settings, top to bottom

- **Paper size** — sized to your largest layer by default. *Smallest layer* crops everything down to it; *Zine* (A3 landscape) and *Drawing* (A4 portrait) are fixed 300dpi sheets.
- **Paper color** — riso ink is translucent, so the paper glows through everything. The same print reads completely differently on Newsprint than on White.
- **Margin** — extra paper around the artwork.
- **Safe area** — keeps ink away from the paper edge, like a real riso's unprintable rim. Jitter can't sneak past it.
- **Ink spread** — ink soaks into paper and creeps past its edges (printers call it dot gain). A little of it takes the digital crispness off.
- **Halftone** — riso can't print grey, only dots. **Grain** is scattered stipple like modern riso output; **Dot screen** is classic printshop dots on a rotated grid. In dot-screen mode leave *Auto angles* on so overlapping layers don't fight — unless you want moiré as a texture, in which case set two layers to nearly the same angle and enjoy.
- **Registration jitter** — every pass through a real machine lands a bit differently. It's seeded, so the preview is stable and the export matches it exactly. Hit **Re-roll** (bottom left) for a different accident.
- **Ink blending** — how overlapping inks mix. **Realistic** is the good one (next section). **Simple** is multiply blending weighted by each ink's actual opacity — Black covers, Yellow dyes. **Off** treats every ink like coloured cellophane.
- **Advanced layer options** — per-layer opacity, scale, and X/Y offset controls, for when you want to art-direct the accidents.

| Grain | Dot screen |
|---|---|
| ![Grain halftone gradient](docs/demo-halftone-stochastic.png) | ![Dot screen halftone gradient](docs/demo-halftone-am.png) |

### The Realistic bit

Nearly every riso simulator just multiplies colours together, which treats ink like coloured cellophane. Real pigment absorbs *and* scatters light, and there's been maths for that since 1931 — the Kubelka-Munk model. It's the default here, and it's why blue + yellow makes an actual green instead of instant mud:

![Kubelka-Munk vs multiply comparison](docs/demo-km-vs-multiply.png)

Left is Kubelka-Munk, right is multiply — same three inks. The **Order bias** slider makes lower layers count a little more in the mix, because ink printed first soaks deeper into the paper.

<details>
<summary>For the colour nerds</summary>

Each ink's reflectance is inverted per RGB channel via K/S = (1 − R)² / 2R, the per-pixel K/S sums (weighted by density and order bias) accumulate over the paper's own K/S, and the total converts back to reflectance. It's a 3-channel approximation of a properly spectral computation, and we skip film thickness and the Saunderson correction — but a single ink at full density on white paper reproduces its own hex within one 8-bit step, and that's the unit test.

</details>

### Tips

- Two layers, two inks. That's it, that's the look.
- Duotone trick: the *same* photo on two layers, different inks, slight offset.
- The zoomed-out preview can shimmer — the export is the truth. Click anywhere on the preview (or hit **100%**) to inspect real pixels, drag to pan, click again to zoom back out.

## Hacking on it

```
npm install
npm run dev      # Vite dev server
npm test         # vitest
npm run build    # tsc + vite build
```

React 19 + TypeScript + Vite, no state library. Pushes to `main` deploy to GitHub Pages. The interesting code is `src/engine/` — a density pipeline where each stage is a pure function over grayscale "ink density" `ImageData` that no-ops when its feature is off:

```
upload → toGrayscale ─→ spread (blur.ts) ─→ halftone (halftone.ts) ─→ blend
                                                                      ├─ multiply path: tint + canvas 'multiply'
                                                                      └─ Kubelka-Munk path (kubelkaMunk.ts)
```

Things worth knowing before you change it:

- **Everything is full-resolution pixels, no DPI anywhere.** Effects run on full-res data *before* the preview downscale — never scale an effect radius by render scale, that double-applies it.
- **Randomness is always seeded**, keyed by layer id (not index, so reordering doesn't reshuffle jitter). The export reuses the preview's seed and matches it exactly.
- **Heavy stages are cached** in `WeakMap`s chained stage to stage (spread → halftone → tint → downscale prefilter), LRU-capped so slider-dragging can't hoard full-res buffers.
- **The KM path doesn't reimplement geometry** — it rasterizes density with the same shared placement code as the multiply path, then mixes per-pixel in 256-row strips so export memory stays sane.
- **jsdom has no canvas**, so keep maths in pure functions over typed arrays where vitest can reach it; the canvas plumbing is verified in the browser.
- A new effect gets: a `RisoConfig` field, a default in `App.tsx`, a ConfigPanel control, a pipeline stage (not conditionals sprinkled through `composite()`), and tests.
