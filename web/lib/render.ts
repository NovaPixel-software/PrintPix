import type { ClipKind } from './catalog';
import { PX_PER_MM, type Rect, type SheetLayout } from './layout';
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
  return layout.slots.findIndex((s) => {
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

function drawPhoto(ctx: CanvasRenderingContext2D, p: Photo, s: Rect, clip: ClipKind) {
  ctx.save();
  path(ctx, s, clip);
  ctx.clip();
  ctx.translate(s.x + s.w / 2 + p.ox * s.w, s.y + s.h / 2 + p.oy * s.h);
  ctx.rotate((totalAngle(p) * Math.PI) / 180);
  const k = scaleOf(p, s.w, s.h);
  ctx.scale(k, k);
  ctx.drawImage(p.bmp, -p.bmp.width / 2, -p.bmp.height / 2);
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
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, layout.pageW, layout.pageH);

  layout.slots.forEach((s, i) => {
    const p = slots[i];
    if (p) drawPhoto(ctx, p, s, clip);

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
    } else {
      // faint cut outline for alignment
      path(ctx, s, clip);
      ctx.lineWidth = 0.25;
      ctx.strokeStyle = '#d4d4d8';
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

/** Print-ready PNG at 300 DPI. */
export function exportPng(layout: SheetLayout, clip: ClipKind, slots: (Photo | null)[]): Promise<Blob> {
  const c = canvasOf(layout.pxW, layout.pxH);
  drawSheet(c, layout, clip, slots, PX_PER_MM);
  return toBlob(c, 'image/png');
}

/* ---------- Photo import ---------- */

/** Reads an image file, applying EXIF orientation, and shrinks it to a sensible working size. */
export async function importPhoto(file: File): Promise<Photo> {
  const src = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const k = Math.min(1, 2400 / Math.max(src.width, src.height));
  const c = canvasOf(Math.round(src.width * k), Math.round(src.height * k));
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  src.close();
  const blob = await toBlob(c, 'image/jpeg', 0.92);
  return { blob, bmp: await createImageBitmap(blob), zoom: 1, rot: 0, tilt: 0, ox: 0, oy: 0 };
}
