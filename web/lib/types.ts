export type LabelStyle = 'ribbon' | 'bar' | 'pill' | 'text';
export type LabelFont = 'script' | 'fun' | 'bold';

/** A name written on one photo, like the ribbon on a badge. */
export interface NameLabel {
  text: string; // empty means no label
  style: LabelStyle;
  color: string; // hex, like #1e3a6e
  font: LabelFont;
  size: number; // 1 = normal, 0.6 to 1.6
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
