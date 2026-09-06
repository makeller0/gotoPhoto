import { ExifMetadata } from './utils/exifHelper';

export type WatermarkMode = 'text' | 'tile' | 'image';
export type AppTheme = 'dark' | 'light';

export type PositionAnchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'custom';

export interface WatermarkConfig {
  mode: WatermarkMode;
  // Text & Tile props
  text: string;
  color: string;
  fontSizeRatio: number; // proportional to image dimension, e.g. 0.045
  opacity: number; // 0.05 to 1.0
  rotation: number; // degrees, -180 to 180
  position: PositionAnchor;
  customX: number; // 0 to 100%
  customY: number; // 0 to 100%
  bold: boolean;
  hasShadow: boolean;
  hasStroke: boolean;
  strokeColor: string;
  // Tile props
  tileSpacing: number; // gap factor 1 to 5
  isStaggered: boolean; // offset alternate rows
  // Image props
  imageLogoUrl: string | null;
  imageScale: number; // 0.1 to 0.8
  presetStampId?: string;
}

export interface ImageFileItem {
  id: string;
  name: string;
  file: File;
  objectUrl: string;
  width: number;
  height: number;
  size: number;
  exif?: ExifMetadata;
}

export interface WatermarkPreset {
  id: string;
  name: string;
  description: string;
  tag: string;
  config: Partial<WatermarkConfig>;
  isCustom?: boolean;
  createdAt?: number;
}

