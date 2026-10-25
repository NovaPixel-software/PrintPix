import type { Paper, Template } from './catalog';

export const DPI = 300;
export const PX_PER_MM = DPI / 25.4;
/** Safe margin around the sheet that the printer cannot reach. */
export const MARGIN_MM = 10;
/** Gap between slots, left for the die-cut. */
export const GAP_MM = 4;

export type Orientation = 'portrait' | 'landscape';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SheetLayout {
  pageW: number; // mm
  pageH: number; // mm
  cols: number;
  rows: number;
  count: number;
  slots: Rect[]; // mm, row by row
  slotW: number;
  slotH: number;
  pxW: number; // pixels at 300 DPI
  pxH: number;
}

export function pageSize(paper: Paper, orientation: Orientation) {
  return orientation === 'portrait' ? { w: paper.wmm, h: paper.hmm } : { w: paper.hmm, h: paper.wmm };
}

const fit = (avail: number, size: number) => Math.max(0, Math.floor((avail - 2 * MARGIN_MM + GAP_MM) / (size + GAP_MM)));

export function computeLayout(paper: Paper, orientation: Orientation, template: Pick<Template, 'wmm' | 'hmm'>): SheetLayout {
  const { w: pageW, h: pageH } = pageSize(paper, orientation);
  const cols = fit(pageW, template.wmm);
  const rows = fit(pageH, template.hmm);
  const totalW = cols * template.wmm + Math.max(0, cols - 1) * GAP_MM;
  const totalH = rows * template.hmm + Math.max(0, rows - 1) * GAP_MM;
  const x0 = (pageW - totalW) / 2;
  const y0 = (pageH - totalH) / 2;
  const slots: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({ x: x0 + c * (template.wmm + GAP_MM), y: y0 + r * (template.hmm + GAP_MM), w: template.wmm, h: template.hmm });
    }
  }
  return {
    pageW,
    pageH,
    cols,
    rows,
    count: cols * rows,
    slots,
    slotW: template.wmm,
    slotH: template.hmm,
    pxW: Math.round(pageW * PX_PER_MM),
    pxH: Math.round(pageH * PX_PER_MM),
  };
}

/** How many slots fit if the template were turned 90 degrees, to say whether the chosen yield is the best one. */
export function rotatedYield(paper: Paper, orientation: Orientation, template: Pick<Template, 'wmm' | 'hmm'>): number {
  return computeLayout(paper, orientation, { wmm: template.hmm, hmm: template.wmm }).count;
}
