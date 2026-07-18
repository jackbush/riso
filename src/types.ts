export interface InkColor {
  name: string;
  hex: string;
  /** 0 = fully opaque (occludes layers below), 1 = fully transparent (pure multiply/dye-like) */
  transparency: number;
}

export interface Layer {
  id: string;
  name: string;
  imageData: ImageData | null;
  grayscaleData: ImageData | null;
  inkColor: InkColor;
  opacity: number;
  offsetX: number;
  offsetY: number;
  visible: boolean;
}

export interface RisoConfig {
  advancedLayerOptionsEnabled: boolean; // shows per-layer opacity + offset controls; offsets apply when on
  inkBlendMode: 'km' | 'simple' | 'off'; // km = Kubelka-Munk mixing, simple = per-ink transparency blend, off = flat multiply
  inkSpreadEnabled: boolean;
  inkSpreadAmount: number; // 0-5px at full resolution
  registrationJitterEnabled: boolean;
  registrationJitterAmount: number; // 0-10px at full resolution
  registrationJitterSeed: number;
  halftoneMode: 'off' | 'stochastic' | 'am';
  halftoneScale: number; // stochastic grain size, 1-6px at full resolution
  halftoneSpacing: number; // AM dot pitch, 4-40px at full resolution
  halftoneAngle: number | null; // AM screen angle in degrees; null = auto per-layer
  kubelkaMunkOrderBias: number; // 0-1; extra K/S weight for bottom layers (km blend mode only)
  paperColor: string;
  paperSize: 'largest' | 'smallest'; // canvas resolves to the largest or smallest layer image
  margin: number; // extra paper added around the artwork, px at full resolution
  safeArea: number; // no-ink inset from the paper edge, px at full resolution
}
