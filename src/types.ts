export interface InkColor {
  name: string;
  hex: string;
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
  paperColor: string;
  safeArea: number; // pixels at full resolution
}
