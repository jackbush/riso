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
  offsetEnabled: boolean;
  opacityEnabled: boolean;
  inkTransparencyEnabled: boolean;
  inkSpreadEnabled: boolean;
  inkSpreadAmount: number; // 0-5px at full resolution
  registrationJitterEnabled: boolean;
  registrationJitterAmount: number; // 0-10px at full resolution
  registrationJitterSeed: number;
  paperColor: string;
  safeArea: number; // pixels at full resolution
}
