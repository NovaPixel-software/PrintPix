/** What is saved for one photo slot. The blob is the (resized) photo; the rest is how it is cropped. */
export interface SlotData {
  blob: Blob;
  zoom: number; // 1 = fit, up to 3
  rot: number; // quarter turns in degrees: -180, -90, 0, 90
  tilt: number; // fine rotation, degrees
  ox: number; // pan, as a fraction of the slot size
  oy: number;
}

/** A slot that is loaded in memory and ready to draw. */
export interface Photo extends SlotData {
  bmp: ImageBitmap;
}
