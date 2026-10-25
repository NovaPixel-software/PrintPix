import type { ClipKind } from './catalog';
import type { Rect } from './layout';
import { getFrame } from './frames';
import type { LabelFont, NameLabel, RibbonStyle } from './types';

/*
 * Name labels: a name written on a photo. Each photo can have its own text, colour, font, weight, italic,
 * outline and size. Everything here only draws; the editor decides when.
 */

/** `normal` and `heavy` are the weights used with Bold off and on. One-weight fonts get a faked bold from the browser. */
export const LABEL_FONTS: { id: LabelFont; label: string; cssVar: string; normal: number; heavy: number }[] = [
  { id: 'script', label: 'Script', cssVar: '--font-script', normal: 500, heavy: 700 },
  { id: 'fun', label: 'Fun', cssVar: '--font-fun', normal: 400, heavy: 700 },
  { id: 'bold', label: 'Clean sans', cssVar: '--font-inter', normal: 500, heavy: 800 },
  { id: 'serif', label: 'Classic serif', cssVar: '--font-serif', normal: 500, heavy: 800 },
  { id: 'retro', label: 'Retro', cssVar: '--font-retro', normal: 400, heavy: 700 },
  { id: 'hand', label: 'Handwriting', cssVar: '--font-hand', normal: 500, heavy: 700 },
  { id: 'round', label: 'Rounded', cssVar: '--font-round', normal: 500, heavy: 700 },
];

export const LABEL_COLORS: { name: string; value: string }[] = [
  { name: 'Navy', value: '#1e3a6e' },
  { name: 'Blue', value: '#2f80ed' },
  { name: 'Sky', value: '#3aa0e8' },
  { name: 'Pink', value: '#e8467c' },
  { name: 'Red', value: '#d62839' },
  { name: 'Orange', value: '#f57c00' },
  { name: 'Gold', value: '#f2b705' },
  { name: 'Green', value: '#2e9e5b' },
  { name: 'Purple', value: '#7b4bb3' },
  { name: 'Brown', value: '#8d5a2b' },
  { name: 'Black', value: '#111827' },
  { name: 'White', value: '#ffffff' },
];

export const RIBBON_STYLES: { id: RibbonStyle; label: string; icon: string }[] = [
  { id: 'classic', label: 'Classic ribbon', icon: 'bookmark' },
  { id: 'folded', label: 'Folded banner', icon: 'flag' },
  { id: 'wavy', label: 'Wavy ribbon', icon: 'waves' },
  { id: 'sash', label: 'Curved sash', icon: 'tab' },
  { id: 'pill', label: 'Pill', icon: 'rounded_corner' },
  { id: 'none', label: 'Name only', icon: 'title' },
];

export const DEFAULT_LABEL: NameLabel = { text: '', color: '#ffffff', font: 'serif', size: 1, bold: true, italic: true, stroke: 0, strokeColor: '#14213d', ribbon: 'classic', ribbonColor: '#e8467c' };
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
  await Promise.all(LABEL_FONTS.flatMap((f) => [f.normal, f.heavy].flatMap((w) => [`${w} 40px ${family(f.id)}`, `italic ${w} 40px ${family(f.id)}`].map((spec) => document.fonts.load(spec, 'Aa Bb')))));
  await document.fonts.ready;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** The CSS font string for a label: style, weight, size and family. */
function fontCss(label: NameLabel, px: number): string {
  const m = fontMeta(label.font);
  return `${label.italic ? 'italic ' : ''}${label.bold === false ? m.normal : m.heavy} ${px}px ${family(label.font)}`;
}

const frameImages = new Map<string, HTMLImageElement>();

/** Loads overlay designs ahead of drawing, since a canvas cannot wait for an image. Resolves true if something new arrived. */
export async function preloadFrames(ids: (string | undefined)[]): Promise<boolean> {
  if (typeof Image === 'undefined') return false;
  const wanted = [...new Set(ids)].filter((id): id is string => !!id && !frameImages.has(id) && !!getFrame(id));
  await Promise.all(
    wanted.map(
      (id) =>
        new Promise<void>((done) => {
          const img = new Image();
          img.onload = () => {
            frameImages.set(id, img);
            done();
          };
          img.onerror = () => done();
          img.src = getFrame(id)!.src;
        }),
    ),
  );
  return wanted.some((id) => frameImages.has(id));
}

/** A colour made lighter (amt > 0) or darker (amt < 0). */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** A band across x = L to R, y = y0 to y1, whose top and bottom edges bow up by `sag` in the middle. Ends are left to the caller. */
function bowed(ctx: CanvasRenderingContext2D, L: number, R: number, y0: number, y1: number, sag: number, notch: number) {
  const cx = (L + R) / 2;
  const yc = (y0 + y1) / 2;
  ctx.moveTo(L, y0);
  ctx.quadraticCurveTo(cx, y0 - 2 * sag, R, y0);
  if (notch > 0) {
    ctx.lineTo(R - notch, yc);
    ctx.lineTo(R, y1);
  } else ctx.lineTo(R, y1);
  ctx.quadraticCurveTo(cx, y1 - 2 * sag, L, y1);
  if (notch > 0) {
    ctx.lineTo(L + notch, yc);
  }
  ctx.closePath();
}

/** Fills a path with a soft top-to-bottom shine, a white edge, and optionally stitched lines near the long edges. */
function finish(ctx: CanvasRenderingContext2D, color: string, y0: number, y1: number, edgeW: number) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, shade(color, 0.12));
  g.addColorStop(1, shade(color, -0.1));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = edgeW;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.stroke();
}

function stitches(ctx: CanvasRenderingContext2D, L: number, R: number, y0: number, y1: number, sag: number, inset: number, u: number) {
  const cx = (L + R) / 2;
  ctx.save();
  ctx.setLineDash([u * 0.018, u * 0.012]);
  ctx.lineWidth = u * 0.005;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  for (const y of [y0 + inset, y1 - inset]) {
    ctx.beginPath();
    ctx.moveTo(L, y);
    ctx.quadraticCurveTo(cx, y - 2 * sag, R, y);
    ctx.stroke();
  }
  ctx.restore();
}

const frameScaled = new Map<string, HTMLCanvasElement | HTMLImageElement>();

/**
 * The overlay at the size it will be drawn. The 2000 px picture is halved step by step until it is close to the
 * target, because shrinking it in one go makes thin lines and dots jagged. Kept so a second draw costs nothing.
 */
function frameAt(id: string, img: HTMLImageElement, px: number): CanvasImageSource {
  const target = Math.max(1, Math.round(px));
  const key = id + ':' + target;
  const hit = frameScaled.get(key);
  if (hit) return hit;
  let cur: CanvasImageSource = img;
  let w = img.width;
  while (w / 2 >= target) {
    const half = document.createElement('canvas');
    half.width = Math.round(w / 2);
    half.height = Math.round(w / 2);
    const g = half.getContext('2d')!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(cur, 0, 0, half.width, half.height);
    cur = half;
    w = half.width;
  }
  if (cur !== img) frameScaled.set(key, cur as HTMLCanvasElement);
  return cur;
}

/** Draws one photo's label inside its slot: the overlay design (if any), then the name on its ribbon. */
export function drawLabel(ctx: CanvasRenderingContext2D, label: NameLabel, s: Rect, clip: ClipKind): void {
  const frameImg = label.frame ? frameImages.get(label.frame) : undefined;
  if (frameImg && label.frame) {
    // ctx.getTransform().a is how many device pixels one unit (mm) is, so the overlay can be prepared at its real size
    const k = ctx.getTransform().a;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(frameAt(label.frame, frameImg, s.w * k), s.x, s.y, s.w, s.h);
  }

  const text = label.text.trim();
  if (!text) return;

  const u = Math.min(s.w, s.h);
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const R = u / 2;
  const round = clip === 'ellipse';
  const style: RibbonStyle = label.ribbon ?? 'classic';
  const color = label.ribbonColor ?? '#e8467c';

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  /** One letter and where it goes: its middle, and the angle it is turned to (0 is upright). */
  type Glyph = { ch: string; x: number; y: number; a: number };

  /** Paints letters. An outline goes under all of them first, so a letter never covers its neighbour's fill. */
  const paint = (glyphs: Glyph[], size: number, outlineAuto: boolean) => {
    const own = (label.stroke ?? 0) > 0;
    const pass = (stroke: boolean) => {
      for (const g of glyphs) {
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.a);
        if (stroke) ctx.strokeText(g.ch, 0, 0);
        else ctx.fillText(g.ch, 0, 0);
        ctx.restore();
      }
    };
    if (own || outlineAuto) {
      ctx.lineWidth = size * 0.32 * (own ? label.stroke! : 0.8);
      ctx.strokeStyle = own ? (label.strokeColor ?? '#ffffff') : luminance(label.color) > 0.55 ? '#14213d' : '#ffffff';
      pass(true);
    }
    ctx.fillStyle = label.color;
    pass(false);
  };

  const widths = () => [...text].map((ch) => ({ ch, w: ctx.measureText(ch).width }));

  /** The name written flat, centred on x, y. */
  const flat = (x: number, y: number): Glyph[] => [{ ch: text, x, y, a: 0 }];

  /** The name written along a curve y = f(x) between x0 and x1, centred on x = cx, each letter turned to follow it. */
  const alongCurve = (f: (x: number) => number, x0: number, x1: number): Glyph[] => {
    const N = 200;
    const pts: { x: number; y: number; s: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const x = x0 + ((x1 - x0) * i) / N;
      const y = f(x);
      const p = pts[i - 1];
      pts.push({ x, y, s: p ? p.s + Math.hypot(x - p.x, y - p.y) : 0 });
    }
    const at = (sd: number) => {
      let i = 1;
      while (i < N && pts[i].s < sd) i++;
      const p = pts[i - 1];
      const q = pts[i];
      const k = q.s === p.s ? 0 : (sd - p.s) / (q.s - p.s);
      return { x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k, a: Math.atan2(q.y - p.y, q.x - p.x) };
    };
    const ws = widths();
    const total = ws.reduce((t, g) => t + g.w, 0);
    const mid = pts.reduce((best, p) => (Math.abs(p.x - cx) < Math.abs(best.x - cx) ? p : best)).s;
    let sd = mid - total / 2;
    return ws.map((g) => {
      const p = at(sd + g.w / 2);
      sd += g.w;
      return { ch: g.ch, ...p };
    });
  };

  /** The name written along the lower part of a circle of radius r around the photo's middle, reading left to right. */
  const alongArc = (r: number): Glyph[] => {
    const ws = widths();
    const total = ws.reduce((t, g) => t + g.w, 0);
    let walked = 0;
    return ws.map((g) => {
      const a = Math.PI / 2 + total / 2 / r - (walked + g.w / 2) / r;
      walked += g.w;
      return { ch: g.ch, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), a: a - Math.PI / 2 };
    });
  };

  if (style === 'none') {
    // Just the letters, with a plain outline unless one was chosen, so they read on any photo.
    let size = u * 0.13 * label.size;
    ctx.font = fontCss(label, size);
    const tw = ctx.measureText(text).width;
    const maxW = round ? u * 0.62 : s.w * 0.8;
    if (tw > maxW) {
      size *= maxW / tw;
      ctx.font = fontCss(label, size);
    }
    paint(round ? alongArc(R * 0.8) : flat(cx, s.y + s.h - size * 0.9 - u * 0.05), size, true);
    ctx.restore();
    return;
  }

  // The writing is sized from the photo, and shrunk if the ribbon it needs would be wider than the photo allows.
  let size = u * 0.1 * label.size;
  ctx.font = fontCss(label, size);
  let tw = ctx.measureText(text).width;
  const cap = round ? u * 0.68 : s.w * 0.82;
  const need = (sz: number) => tw * (sz / size) + sz * 3.4;
  if (need(size) > cap) {
    size *= cap / need(size);
    ctx.font = fontCss(label, size);
    tw = ctx.measureText(text).width;
  }
  const h = size * 1.7;
  const w = Math.max(Math.min(tw + size * 3.4, cap), Math.min(cap, (round ? u * 0.5 : s.w * 0.5)));
  const off = style === 'folded' ? h * 0.22 : 0; // the folded banner has tails hanging lower than the middle
  const sag = h * 0.34;

  // Where the ribbon sits: near the bottom, and for a round photo high enough that its lower corners stay inside the circle.
  let yc = round ? s.y + s.h * 0.795 : s.y + s.h - h / 2 - off - u * 0.06;
  if (round) {
    const edge = Math.sqrt(Math.max(0, R * R - (w / 2) * (w / 2))) + cy - u * 0.035;
    yc = Math.min(yc, edge - h / 2 - off);
  }
  const L = cx - w / 2;
  const Rt = cx + w / 2;
  const y0 = yc - h / 2;
  const y1 = yc + h / 2;
  const edgeW = u * 0.01;

  if (style === 'sash' && round) {
    // A band that follows the lower edge of the round photo, with notched ends.
    const rOut = R - u * 0.035;
    const rMid = rOut - h / 2;
    const rIn = rOut - h;
    const half = Math.min(Math.PI * 0.46, Math.max(Math.PI * 0.28, (tw + size * 3.4) / rMid / 2));
    const left = Math.PI / 2 + half;
    const right = Math.PI / 2 - half;
    const notch = Math.min(0.2, (h / rMid) * 0.5);
    const pt = (r: number, a: number): [number, number] => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    ctx.beginPath();
    ctx.arc(cx, cy, rOut, left, right, true);
    ctx.lineTo(...pt(rMid, right + notch));
    ctx.lineTo(...pt(rIn, right));
    ctx.arc(cx, cy, rIn, right, left, false);
    ctx.lineTo(...pt(rMid, left - notch));
    ctx.closePath();
    finish(ctx, color, cy + rIn, cy + rOut, edgeW);
    ctx.save();
    ctx.setLineDash([u * 0.018, u * 0.012]);
    ctx.lineWidth = u * 0.005;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    for (const r of [rOut - h * 0.14, rIn + h * 0.14]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, left - notch * 1.8, right + notch * 1.8, true);
      ctx.stroke();
    }
    ctx.restore();
    ctx.font = fontCss(label, size);
    paint(alongArc(rMid), size, false);
  } else if (style === 'pill') {
    ctx.beginPath();
    ctx.roundRect(L, y0, w, h, h / 2);
    finish(ctx, color, y0, y1, edgeW);
    paint(flat(cx, yc + size * 0.03), size, false);
  } else if (style === 'folded') {
    const tail = h * 0.9;
    const bodyL = L + tail * 0.6;
    const bodyR = Rt - tail * 0.6;
    // the tails, a little lower and darker, behind the body
    for (const d of [-1, 1]) {
      const edgeX = d < 0 ? L : Rt;
      const inner = edgeX - d * tail * 1.3;
      ctx.beginPath();
      ctx.moveTo(edgeX, y0 + off);
      ctx.lineTo(inner, y0 + off);
      ctx.lineTo(inner, y1 + off);
      ctx.lineTo(edgeX, y1 + off);
      ctx.lineTo(edgeX - d * tail * 0.4, yc + off);
      ctx.closePath();
      ctx.fillStyle = shade(color, -0.2);
      ctx.fill();
      ctx.lineWidth = edgeW;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.stroke();
      // the fold under the body
      const bx = d < 0 ? bodyL : bodyR;
      ctx.beginPath();
      ctx.moveTo(bx, y1);
      ctx.lineTo(bx - d * off * 1.2, y1 + off);
      ctx.lineTo(bx, y1 + off);
      ctx.closePath();
      ctx.fillStyle = shade(color, -0.4);
      ctx.fill();
    }
    ctx.beginPath();
    bowed(ctx, bodyL, bodyR, y0, y1, sag * 0.6, 0);
    finish(ctx, color, y0, y1, edgeW);
    stitches(ctx, bodyL + h * 0.15, bodyR - h * 0.15, y0, y1, sag * 0.6, h * 0.13, u);
    // the middle line of the body bows up like its edges do
    paint(alongCurve((x) => yc + size * 0.03 - 4 * sag * 0.6 * ((x - bodyL) / (bodyR - bodyL)) * (1 - (x - bodyL) / (bodyR - bodyL)), bodyL, bodyR), size, false);
  } else if (style === 'wavy') {
    const waves = 3;
    const amp = h * 0.09;
    const notch = h * 0.34;
    const wy = (x: number, base: number) => base + Math.sin(((x - L) / w) * Math.PI * 2 * waves) * amp;
    ctx.beginPath();
    ctx.moveTo(L, wy(L, y0));
    const steps = 48;
    for (let i = 1; i <= steps; i++) {
      const x = L + (w * i) / steps;
      ctx.lineTo(x, wy(x, y0));
    }
    ctx.lineTo(Rt - notch, yc);
    ctx.lineTo(Rt, wy(Rt, y1));
    for (let i = steps - 1; i >= 0; i--) {
      const x = L + (w * i) / steps;
      ctx.lineTo(x, wy(x, y1));
    }
    ctx.lineTo(L + notch, yc);
    ctx.closePath();
    finish(ctx, color, y0, y1, edgeW);
    paint(alongCurve((x) => yc + size * 0.03 + Math.sin(((x - L) / w) * Math.PI * 2 * waves) * amp, L + notch, Rt - notch), size, false);
  } else {
    // classic: swallow-tail ends and a gentle curve
    const notch = h * 0.34;
    ctx.save();
    ctx.translate(0, h * 0.07);
    ctx.beginPath();
    bowed(ctx, L, Rt, y0, y1, sag, notch);
    ctx.fillStyle = shade(color, -0.22);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    bowed(ctx, L, Rt, y0, y1, sag, notch);
    finish(ctx, color, y0, y1, edgeW);
    stitches(ctx, L + notch * 1.4, Rt - notch * 1.4, y0, y1, sag, h * 0.14, u);
    paint(alongCurve((x) => yc + size * 0.03 - 4 * sag * ((x - L) / w) * (1 - (x - L) / w), L + notch, Rt - notch), size, false);
  }
  ctx.restore();
}
