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
  jitterX: number;
  jitterY: number;
  visible: boolean;
}

export interface RisoConfig {
  jitterEnabled: boolean;
  grainSize: number;
  paperColor: string;
  showRegMarks: boolean;
}
