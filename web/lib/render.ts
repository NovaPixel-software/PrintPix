import type { ClipKind } from './catalog';
import { DPI, PX_PER_MM, type Rect, type SheetLayout } from './layout';
import { drawLabel, ensureLabelFonts, preloadFrames } from './labels';
import type { Photo } from './types';

const BRAND = '#ff5e00';

/* ---------- Geometry ---------- */

/** Scale (mm per image pixel) at which the photo, turned by `deg`, still covers a w x h slot. */
export function coverScale(imgW: number, imgH: number, w: number, h: number, deg: number): number {
  const r = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  return Math.max((w * c + h * s) / imgW, (w * s + h * c) / imgH);
}

const totalAngle = (p: Pick<Photo, 'rot' | 'tilt'>) => p.rot + p.tilt;

/** The smallest zoom the editor allows. Below 1 the whole photo shows and the rest of the slot is filled with a soft blur of it. */
export const MIN_ZOOM = 0.25;

/** The zoom at which the whole photo, turned as it is now, fits inside the slot (so nothing is cut off). */
export function fitZoom(p: Pick<Photo, 'rot' | 'tilt' | 'bmp'>, slotW: number, slotH: number): number {
  const r = (totalAngle(p) * Math.PI) / 180;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  const iw = p.bmp.width;
  const ih = p.bmp.height;
  const whole = Math.min(slotW / (iw * c + ih * s), slotH / (iw * s + ih * c));
  return Math.max(MIN_ZOOM, Math.min(1, whole / coverScale(iw, ih, slotW, slotH, totalAngle(p))));
}

function scaleOf(p: Photo, slotW: number, slotH: number) {
  return coverScale(p.bmp.width, p.bmp.height, slotW, slotH, totalAngle(p)) * p.zoom;
}

/** True when the photo, shifted by (dx, dy) mm, still covers the whole slot. */
function covers(p: Photo, slotW: number, slotH: number, dx: number, dy: number): boolean {
  const s = scaleOf(p, slotW, slotH);
  const r = (-totalAngle(p) * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const halfW = (p.bmp.width * s) / 2 + 1e-6;
  const halfH = (p.bmp.height * s) / 2 + 1e-6;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const px = (sx * slotW) / 2 - dx;
      const py = (sy * slotH) / 2 - dy;
      const ux = px * cos - py * sin;
      const uy = px * sin + py * cos;
      if (Math.abs(ux) > halfW || Math.abs(uy) > halfH) return false;
    }
  }
  return true;
}

/** Pulls the pan back along its direction until the photo covers the slot again. */
export function clampPan(p: Photo, slotW: number, slotH: number): { ox: number; oy: number } {
  if (p.zoom < 1) return { ox: 0, oy: 0 }; // the whole photo is showing, there is nothing to slide
  const dx = p.ox * slotW;
  const dy = p.oy * slotH;
  if (covers(p, slotW, slotH, dx, dy)) return { ox: p.ox, oy: p.oy };
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (covers(p, slotW, slotH, dx * mid, dy * mid)) lo = mid;
    else hi = mid;
  }
  return { ox: p.ox * lo, oy: p.oy * lo };
}

export function hitSlot(layout: SheetLayout, clip: ClipKind, x: number, y: number): number {
  // With a cut outline, the whole piece counts, so a click in the ring around the photo still picks it.
  return (layout.cuts ?? layout.slots).findIndex((s) => {
    if (clip === 'ellipse') {
      const nx = (x - (s.x + s.w / 2)) / (s.w / 2);
      const ny = (y - (s.y + s.h / 2)) / (s.h / 2);
      return nx * nx + ny * ny <= 1;
    }
    return x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
  });
}

/* ---------- Drawing ---------- */

function path(ctx: CanvasRenderingContext2D, s: Rect, clip: ClipKind) {
  ctx.beginPath();
  if (clip === 'ellipse') ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
  else if (clip === 'rounded') ctx.roundRect(s.x, s.y, s.w, s.h, Math.min(s.w, s.h) * 0.12);
  else ctx.rect(s.x, s.y, s.w, s.h);
}

/**
 * Shrinks an image so that every output pixel is the true average of the source pixels it covers (a box filter
 * with fractional edges). The browser's own smoothing only blends a few neighbours when it shrinks, so fine
 * detail turns into grain and moire. Averaging everything removes that, like a good photo editor does.
 * Done in two passes, across and then down. Transparent pixels do not darken the colours.
 */
function areaDownscale(src: ImageBitmap | HTMLCanvasElement, dw: number, dh: number): HTMLCanvasElement {
  const sw = src.width;
  const sh = src.height;
  const c0 = canvasOf(sw, sh);
  const g0 = c0.getContext('2d', { willReadFrequently: true })!;
  g0.drawImage(src, 0, 0);
  const px = g0.getImageData(0, 0, sw, sh).data;

  // pass 1: width sw -> dw, for every row. Channels are held premultiplied by alpha: R*A, G*A, B*A, A.
  const mid = new Float32Array(dw * sh * 4);
  const xr = sw / dw;
  for (let y = 0; y < sh; y++) {
    const row = y * sw;
    for (let x = 0; x < dw; x++) {
      const a = x * xr;
      const b = a + xr;
      const i1 = Math.min(sw - 1, Math.ceil(b) - 1);
      let r = 0, g = 0, bl = 0, al = 0;
      for (let i = Math.floor(a); i <= i1; i++) {
        const w = Math.min(i + 1, b) - Math.max(i, a);
        const p = (row + i) * 4;
        const alpha = px[p + 3] * w;
        r += px[p] * alpha;
        g += px[p + 1] * alpha;
        bl += px[p + 2] * alpha;
        al += alpha;
      }
      const o = (y * dw + x) * 4;
      mid[o] = r / xr;
      mid[o + 1] = g / xr;
      mid[o + 2] = bl / xr;
      mid[o + 3] = al / xr;
    }
  }

  // pass 2: height sh -> dh, for every column, then un-premultiply
  const out = new Uint8ClampedArray(dw * dh * 4);
  const yr = sh / dh;
  for (let y = 0; y < dh; y++) {
    const a = y * yr;
    const b = a + yr;
    const j1 = Math.min(sh - 1, Math.ceil(b) - 1);
    for (let x = 0; x < dw; x++) {
      let r = 0, g = 0, bl = 0, al = 0;
      for (let j = Math.floor(a); j <= j1; j++) {
        const w = Math.min(j + 1, b) - Math.max(j, a);
        const p = (j * dw + x) * 4;
        r += mid[p] * w;
        g += mid[p + 1] * w;
        bl += mid[p + 2] * w;
        al += mid[p + 3] * w;
      }
      const o = (y * dw + x) * 4;
      if (al > 0) {
        out[o] = r / al;
        out[o + 1] = g / al;
        out[o + 2] = bl / al;
      }
      out[o + 3] = al / yr;
    }
  }
  const res = canvasOf(dw, dh);
  res.getContext('2d')!.putImageData(new ImageData(out, dw, dh), 0, 0);
  return res;
}

/** Exactly averaged copies for the printed sheet, kept so print and download after each other do not repeat the work. */
const exactCache = new WeakMap<ImageBitmap, Map<number, HTMLCanvasElement>>();

function exactCopy(bmp: ImageBitmap, deviceScale: number): HTMLCanvasElement {
  const dw = Math.max(1, Math.round(bmp.width * deviceScale));
  let byWidth = exactCache.get(bmp);
  if (!byWidth) exactCache.set(bmp, (byWidth = new Map()));
  let hit = byWidth.get(dw);
  if (!hit) byWidth.set(dw, (hit = areaDownscale(bmp, dw, Math.max(1, Math.round(bmp.height * deviceScale)))));
  return hit;
}

/*
 * Shrinking a big photo to a small slot in one go makes a single pass skip most of its pixels, which looks
 * jagged and grainy. Halving it a step at a time, with high quality smoothing, averages the pixels instead,
 * the way a good photo editor does. The reduced copies are kept, so redrawing the editor stays fast.
 */
const stepCache = new WeakMap<ImageBitmap, Map<number, HTMLCanvasElement>>();

function steppedDown(bmp: ImageBitmap, deviceScale: number): { src: CanvasImageSource; w: number } {
  if (deviceScale >= 0.5) return { src: bmp, w: bmp.width };
  const steps = Math.max(0, Math.floor(Math.log2(1 / deviceScale)));
  if (steps === 0) return { src: bmp, w: bmp.width };
  let byStep = stepCache.get(bmp);
  if (!byStep) stepCache.set(bmp, (byStep = new Map()));
  let hit = byStep.get(steps);
  if (!hit) {
    let src: CanvasImageSource = bmp;
    let w = bmp.width;
    let h = bmp.height;
    for (let i = 0; i < steps; i++) {
      w = Math.max(1, Math.round(w / 2));
      h = Math.max(1, Math.round(h / 2));
      const c = canvasOf(w, h);
      const g = c.getContext('2d')!;
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(src, 0, 0, w, h);
      src = c;
    }
    hit = src as HTMLCanvasElement;
    byStep.set(steps, hit);
  }
  return { src: hit, w: hit.width };
}

/** Fills the slot behind a zoomed-out photo with a soft blur of the same photo, so the empty parts do not look bare. */
function drawBlurBackdrop(ctx: CanvasRenderingContext2D, p: Photo, s: Rect, pxPerMm: number) {
  ctx.save();
  ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
  ctx.rotate((totalAngle(p) * Math.PI) / 180);
  const k = coverScale(p.bmp.width, p.bmp.height, s.w, s.h, totalAngle(p)) * 1.08; // a little over cover, so the blur has no thin edge
  const { src, w } = steppedDown(p.bmp, k * pxPerMm);
  const kk = (k * p.bmp.width) / w;
  ctx.scale(kk, kk);
  const sw = (src as { width: number }).width;
  const sh = (src as { height: number }).height;
  const canBlur = typeof (ctx as { filter?: unknown }).filter === 'string'; // Safari has no canvas filter, it gets a plain white fill
  if (canBlur) ctx.filter = `blur(${Math.max(2, s.w * 0.05 * pxPerMm)}px)`;
  else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
  }
  ctx.drawImage(src, -sw / 2, -sh / 2);
  ctx.restore();
}

function drawPhoto(ctx: CanvasRenderingContext2D, p: Photo, s: Rect, clip: ClipKind, pxPerMm: number, exact: boolean) {
  ctx.save();
  path(ctx, s, clip);
  ctx.clip();
  if (p.zoom < 1) drawBlurBackdrop(ctx, p, s, pxPerMm);
  ctx.save();
  ctx.translate(s.x + s.w / 2 + p.ox * s.w, s.y + s.h / 2 + p.oy * s.h);
  ctx.rotate((totalAngle(p) * Math.PI) / 180);
  const k = scaleOf(p, s.w, s.h); // mm per photo pixel
  // Printed sheet: exact averaging down to the size it will really be. Editor: fast step-down, it redraws while you drag.
  const deviceScale = k * pxPerMm;
  const copy = exact && deviceScale < 0.9 ? exactCopy(p.bmp, deviceScale) : null;
  const { src, w } = copy ? { src: copy, w: copy.width } : steppedDown(p.bmp, deviceScale);
  const kk = (k * p.bmp.width) / w; // mm per pixel of the (possibly reduced) copy
  ctx.scale(kk, kk);
  const sw = (src as { width: number }).width;
  const sh = (src as { height: number }).height;
  ctx.drawImage(src, -sw / 2, -sh / 2);
  ctx.restore();
  if (p.label) drawLabel(ctx, p.label, s, clip);
  ctx.restore();
}

export interface DrawUi {
  selected: number | null;
}

/** Draws the sheet at `pxPerMm`. With `ui`, empty slots get placeholders and the selected slot an outline. */
export function drawSheet(
  canvas: HTMLCanvasElement,
  layout: SheetLayout,
  clip: ClipKind,
  slots: (Photo | null)[],
  pxPerMm: number,
  ui?: DrawUi,
) {
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(pxPerMm, 0, 0, pxPerMm, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, layout.pageW, layout.pageH);

  layout.slots.forEach((s, i) => {
    const p = slots[i];
    if (p) drawPhoto(ctx, p, s, clip, pxPerMm, !ui); // no editor overlay means this is the real sheet

    if (ui && !p) {
      path(ctx, s, clip);
      ctx.fillStyle = '#eff4ff';
      ctx.fill();
      ctx.setLineDash([2, 1.4]);
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = '#e4bfb1';
      ctx.stroke();
      ctx.setLineDash([]);
      const u = Math.min(s.w, s.h);
      ctx.fillStyle = '#8f7065';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${u * 0.13}px Inter, system-ui, sans-serif`;
      ctx.fillText(`Slot ${String(i + 1).padStart(2, '0')}`, s.x + s.w / 2, s.y + s.h / 2 + u * 0.12);
      ctx.font = `500 ${u * 0.3}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = '#009dd9';
      ctx.fillText('+', s.x + s.w / 2, s.y + s.h / 2 - u * 0.1);
    } else if (!layout.cuts) {
      // faint cut outline for alignment
      path(ctx, s, clip);
      ctx.lineWidth = 0.25;
      ctx.strokeStyle = '#d4d4d8';
      ctx.stroke();
    }

    // Templates with a cut size get a thin cut outline around the piece, like the printing templates:
    // solid black in the printed sheet, a softer grey line while editing.
    const cut = layout.cuts?.[i];
    if (cut) {
      path(ctx, cut, clip);
      ctx.lineWidth = ui ? 0.3 : 0.15;
      ctx.strokeStyle = ui ? '#6b7a90' : '#000';
      ctx.stroke();
    }
  });

  if (ui && ui.selected != null) {
    const s = layout.slots[ui.selected];
    if (s) {
      path(ctx, s, clip);
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = BRAND;
      ctx.stroke();
    }
  }
}

function canvasOf(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), type, q));

/*
 * A PNG written by the canvas says nothing about its resolution, so other programs (Photos, Word, print
 * dialogs) guess 72 or 96 dpi and show the A4 sheet about three times too big. This adds a pHYs chunk
 * that says 300 dpi, right after the IHDR chunk, so the sheet opens and prints at its real size.
 */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function withDpi(blob: Blob, dpi: number): Promise<Blob> {
  const src = new Uint8Array(await blob.arrayBuffer());
  const afterIhdr = 8 + 8 + 13 + 4; // signature, chunk header, IHDR data, IHDR crc
  const isPng = src.length > afterIhdr && String.fromCharCode(...src.slice(12, 16)) === 'IHDR';
  if (!isPng) return blob; // not a PNG we understand: leave it exactly as it is
  const perMetre = Math.round((dpi / 25.4) * 1000);
  const chunk = new Uint8Array(21); // length (4) + type (4) + data (9) + crc (4)
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  dv.setUint32(8, perMetre); // pixels per metre, across
  dv.setUint32(12, perMetre); // and down
  chunk[16] = 1; // unit: metre
  dv.setUint32(17, crc32(chunk.slice(4, 17)));
  return new Blob([src.slice(0, afterIhdr), chunk, src.slice(afterIhdr)], { type: 'image/png' });
}

/** Print-ready PNG at 300 DPI, with the 300 dpi written into the file. */
export async function exportPng(layout: SheetLayout, clip: ClipKind, slots: (Photo | null)[]): Promise<Blob> {
  await ensureLabelFonts(); // labels must be drawn in their real fonts, not a fallback
  await preloadFrames(slots.map((p) => p?.label?.frame)); // and overlay designs must be in
  const c = canvasOf(layout.pxW, layout.pxH);
  drawSheet(c, layout, clip, slots, PX_PER_MM);
  return withDpi(await toBlob(c, 'image/png'), DPI);
}

/* ---------- Photo import ---------- */

/** Longest side kept in memory. A 59 mm magnet needs about 700 px and the biggest print slot about 2100 px. */
const MAX_SIDE = 2400;

/**
 * Reads an image file, applying EXIF orientation. Only photos bigger than MAX_SIDE are reduced, with one high
 * quality (area averaged) resize. Nothing is re-encoded, so no JPEG quality is lost on the way in.
 */
export async function importPhoto(file: File): Promise<Photo> {
  const full = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const k = Math.min(1, MAX_SIDE / Math.max(full.width, full.height));
  let bmp = full;
  if (k < 1) {
    bmp = await createImageBitmap(areaDownscale(full, Math.round(full.width * k), Math.round(full.height * k)));
    full.close();
  }
  return { blob: file, bmp, zoom: 1, rot: 0, tilt: 0, ox: 0, oy: 0, label: null };
}
