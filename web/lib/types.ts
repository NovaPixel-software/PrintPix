/** How the name is shown: a ribbon of some shape, or just the letters. */
export type RibbonStyle = 'classic' | 'folded' | 'wavy' | 'sash' | 'pill' | 'none';
export type LabelFont = 'script' | 'fun' | 'bold' | 'serif' | 'retro' | 'hand' | 'round';

/** A name written on one photo, like the ribbon on a badge. */
export interface NameLabel {
  text: string; // empty means no label
  color: string; // hex, like #1e3a6e
  font: LabelFont;
  size: number; // 1 = normal, 0.6 to 1.6
  ribbon?: RibbonStyle; // the shape the name sits on, classic when missing
  ribbonColor?: string; // hex, the ribbon colour
  frame?: string; // id of an overlay design (lib/frames.ts), none when missing
  bold?: boolean; // heavier weight, on by default
  italic?: boolean;
  stroke?: number; // outline round the letters, 0 = none to 1 = thick
  strokeColor?: string; // hex, the outline colour
}

/** What belongs to one photo slot: the photo file and how it is cropped and labelled. Nothing is saved to a server. */
export interface SlotData {
  blob: Blob; // the file the photo was read from
  zoom: number; // 1 = fit, up to 3
  rot: number; // quarter turns in degrees: -180, -90, 0, 90
  tilt: number; // fine rotation, degrees
  ox: number; // pan, as a fraction of the slot size
  oy: number;
  label?: NameLabel | null;
}

/** A slot that is loaded in memory and ready to draw. */
export interface Photo extends SlotData {
  bmp: ImageBitmap;
}
