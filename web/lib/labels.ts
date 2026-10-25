import type { ClipKind } from './catalog';
import type { Rect } from './layout';
import type { LabelFont, LabelStyle, NameLabel } from './types';

/*
 * Name labels: a name written on a photo, like the ribbon on a badge. Each photo can have its own text,
 * design (style), colour, font and size. Everything here only draws; the editor decides when.
 */

export const LABEL_STYLES: { id: LabelStyle; label: string; icon: string }[] = [
  { id: 'ribbon', label: 'Ribbon', icon: 'bookmark' },
  { id: 'bar', label: 'Bar', icon: 'horizontal_rule' },
  { id: 'pill', label: 'Pill', icon: 'rounded_corner' },
  { id: 'text', label: 'Text only', icon: 'title' },
];

export const LABEL_FONTS: { id: LabelFont; label: string; cssVar: string; weight: number }[] = [
  { id: 'script', label: 'Script', cssVar: '--font-script', weight: 700 },
  { id: 'fun', label: 'Fun', cssVar: '--font-fun', weight: 400 },
  { id: 'bold', label: 'Bold', cssVar: '--font-inter', weight: 800 },
];

export const LABEL_COLORS: { name: string; value: string }[] = [
  { name: 'Navy', value: '#1e3a6e' },
  { name: 'Blue', value: '#2f80ed' },
  { name: 'Pink', value: '#e8467c' },
  { name: 'Red', value: '#d62839' },
  { name: 'Orange', value: '#f57c00' },
  { name: 'Gold', value: '#f2b705' },
  { name: 'Green', value: '#2e9e5b' },
  { name: 'Purple', value: '#7b4bb3' },
  { name: 'Black', value: '#111827' },
  { name: 'White', value: '#ffffff' },
];

export const DEFAULT_LABEL: NameLabel = { text: '', style: 'ribbon', color: '#1e3a6e', font: 'script', size: 1 };
export const MAX_LABEL_CHARS = 24;

const fontMeta = (f: LabelFont) => LABEL_FONTS.find((x) => x.id === f) ?? LABEL_FONTS[0];

/** The real font-family string behind a label font. next/font gives each font a generated name, kept in a CSS variable. */
function family(f: LabelFont): string {
  const v = typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(fontMeta(f).cssVar).trim() : '';
  return v || (f === 'bold' ? 'system-ui, sans-serif' : 'cursive');
}

/** Makes sure the label fonts are downloaded. A canvas never triggers that by itself, so ask the browser to load them. */
export async function ensureLabelFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all(LABEL_FONTS.map((f) => document.fonts.load(`${f.weight} 40px ${family(f.id)}`, 'Aa Bb')));
  await document.fonts.ready;
}

/** Dark or white writing, whichever reads better on a colour. */
function readableOn(hex: string): string {
  return luminance(hex) > 0.6 ? '#14213d' : '#ffffff';
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

const polar = (cx: number, cy: number, r: number, a: number): [number, number] => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

/** Draws one photo's label inside its slot. Call it while the slot's clip is active, so the label is cut to the slot shape. */
export function drawLabel(ctx: CanvasRenderingContext2D, label: NameLabel, s: Rect, clip: ClipKind): void {
  const text = label.text.trim();
  if (!text) return;

  const u = Math.min(s.w, s.h);
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const meta = fontMeta(label.font);
  const fam = family(label.font);
  const setFont = (px: number) => (ctx.font = `${meta.weight} ${px}px ${fam}`);
  const round = clip === 'ellipse';

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  // Size the writing from the slot, then shrink it if the name would not fit.
  let size = u * 0.12 * label.size;
  setFont(size);
  let tw = ctx.measureText(text).width;
  const maxW = round ? u * 0.66 : s.w * 0.82;
  if (tw > maxW) {
    size *= maxW / tw;
    setFont(size);
    tw = ctx.measureText(text).width;
  }
  const ink = readableOn(label.color);

  if (label.style === 'ribbon' && round) {
    // A band that follows the lower edge of the round slot, with notched ends, and the name curved along it.
    const R = u / 2;
    const thick = size * 1.9;
    const rOut = R * 0.97;
    const rMid = rOut - thick / 2;
    const rIn = rOut - thick;
    const textAngle = tw / rMid;
    const half = Math.min(Math.PI * 0.46, Math.max(Math.PI * 0.27, textAngle / 2 + 0.34));
    const left = Math.PI / 2 + half;
    const right = Math.PI / 2 - half;
    const notch = Math.min(0.24, (thick / rMid) * 0.5);

    ctx.beginPath();
    ctx.arc(cx, cy, rOut, left, right, true);
    ctx.lineTo(...polar(cx, cy, rMid, right + notch));
    ctx.lineTo(...polar(cx, cy, rIn, right));
    ctx.arc(cx, cy, rIn, right, left, false);
    ctx.lineTo(...polar(cx, cy, rMid, left - notch));
    ctx.closePath();
    ctx.fillStyle = label.color;
    ctx.fill();
    ctx.lineWidth = u * 0.008;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.stroke();

    // name along the middle of the band, each letter turned to follow the curve
    ctx.fillStyle = ink;
    let walked = 0;
    for (const ch of text) {
      const w = ctx.measureText(ch).width;
      const a = Math.PI / 2 + textAngle / 2 - (walked + w / 2) / rMid;
      const [x, y] = polar(cx, cy, rMid, a);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a - Math.PI / 2);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      walked += w;
    }
  } else if (label.style === 'ribbon') {
    // Straight banner with swallow-tail ends, across the lower part of a rectangular slot.
    const h = size * 1.9;
    const x0 = s.x + s.w * 0.03;
    const x1 = s.x + s.w * 0.97;
    const y0 = s.y + s.h - h - u * 0.06;
    const y1 = y0 + h;
    const tail = Math.min(h * 0.5, s.w * 0.05);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y0);
    ctx.lineTo(x1 - tail, (y0 + y1) / 2);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x0, y1);
    ctx.lineTo(x0 + tail, (y0 + y1) / 2);
    ctx.closePath();
    ctx.fillStyle = label.color;
    ctx.fill();
    ctx.lineWidth = u * 0.008;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.fillText(text, cx, (y0 + y1) / 2);
  } else if (label.style === 'bar' || label.style === 'pill') {
    const h = size * 1.75;
    const w = Math.min(s.w * 0.92, tw + size * 1.7);
    const yc = round ? cy + s.h * 0.34 : s.y + s.h - h / 2 - u * 0.07;
    const x = cx - w / 2;
    const y = yc - h / 2;
    ctx.beginPath();
    if (label.style === 'pill') ctx.roundRect(x, y, w, h, h / 2);
    else ctx.roundRect(x, y, w, h, Math.min(h * 0.18, 1.2));
    ctx.fillStyle = label.color;
    ctx.fill();
    ctx.lineWidth = u * 0.008;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.fillText(text, cx, yc);
  } else {
    // text only: the name in the chosen colour with an outline so it stays readable on any photo
    const yc = round ? cy + s.h * 0.34 : s.y + s.h - size * 0.9 - u * 0.05;
    ctx.lineWidth = size * 0.26;
    ctx.strokeStyle = luminance(label.color) > 0.55 ? '#14213d' : '#ffffff';
    ctx.strokeText(text, cx, yc);
    ctx.fillStyle = label.color;
    ctx.fillText(text, cx, yc);
  }
  ctx.restore();
}
