/* Products, shapes, template sizes and paper sizes. Pure data, so it can move to a DB table later. */

export type ClipKind = 'rect' | 'rounded' | 'ellipse';

export interface Shape {
  id: string;
  label: string;
  icon: string; // Material Symbols name
  clip: ClipKind;
}

export interface Product {
  id: string;
  label: string;
}

export interface Template {
  id: string;
  productId: string;
  shapeId: string;
  wmm: number;
  hmm: number;
  label: string; // e.g. 3.1 × 2.1 in (80×53 mm)
  /**
   * Optional. The outer cut size in mm. When set, wmm and hmm are the photo area, centred inside the cut
   * outline, and every piece on the sheet gets a cut outline drawn around it. The space between the photo
   * edge and the cut line is the same on every side.
   */
  cutW?: number;
  cutH?: number;
  /** Optional spacing overrides in mm. Defaults are a 10 mm printer-safe margin and a 4 mm gap. */
  gapMm?: number;
  marginMm?: number;
}

export interface Paper {
  id: string;
  label: string;
  wmm: number;
  hmm: number;
}

export const PRODUCTS: Product[] = [
  { id: 'magnet', label: 'Fridge Magnet' },
  { id: 'print', label: 'Photo Print' },
  { id: 'badge', label: 'Badge / Pin' },
  { id: 'keychain', label: 'Keychain' },
  { id: 'sticker', label: 'Sticker' },
];

// The order here is the order of the Photo Shape dropdown: Round first, Square second.
export const SHAPES: Shape[] = [
  { id: 'round', label: 'Round / Circle', icon: 'circle', clip: 'ellipse' },
  { id: 'square', label: 'Square (1:1)', icon: 'crop_square', clip: 'rect' },
  { id: 'rect-landscape', label: 'Rectangle Landscape (3:2)', icon: 'crop_landscape', clip: 'rect' },
  { id: 'rect-portrait', label: 'Rectangle Portrait (2:3)', icon: 'crop_portrait', clip: 'rect' },
  { id: 'oval', label: 'Oval', icon: 'egg', clip: 'ellipse' },
  { id: 'rounded', label: 'Rounded Rectangle', icon: 'rounded_corner', clip: 'rounded' },
];

const mmToIn = (mm: number) => (mm / 25.4).toFixed(1).replace(/\.0$/, '');
const dim = (w: number, h: number) =>
  w === h ? `${mmToIn(w)} in (${w} mm)` : `${mmToIn(w)} × ${mmToIn(h)} in (${w}×${h} mm)`;

function t(productId: string, shapeId: string, wmm: number, hmm = wmm): Template {
  return { id: `${productId}-${shapeId}-${wmm}x${hmm}`, productId, shapeId, wmm, hmm, label: dim(wmm, hmm) };
}

/**
 * Printing templates measured from the two PSD files (58 MM ROUND 12 PIECES, SQUARE FRIDGE MAGNET; A4, 200 ppi).
 * Each piece is a photo area inside a thin cut outline. Both give 12 pieces (3 x 4) on A4.
 * The sizes come from the vector data and the pixels in the PSDs, not from the layer boxes (those include the
 * anti-aliased edge and the line width, which made them 0.3 to 0.5 mm too big). Cut sizes are the centre of the cut line.
 */
const ROUND_CUT_ID = 'magnet-round-photo59-cut68';
const SQUARE_CUT_ID = 'magnet-square-photo53.6-cut64';
/** Space between the photo edge and the cut outline, on every side, in mm. Measured from the two PSD files. */
const RING_ROUND_MM = 4.5; // (68 - 59) / 2
const RING_SQUARE_MM = 5.2; // (64 - 53.6) / 2, also used for the magnet rectangles

const round2 = (n: number) => Math.round(n * 100) / 100;

function cutTemplate(id: string, shapeId: string, photoW: number, photoH: number, ringMm: number, gapMm: number, marginMm: number, label?: string): Template {
  const cutW = round2(photoW + 2 * ringMm);
  const cutH = round2(photoH + 2 * ringMm);
  return {
    id,
    productId: 'magnet',
    shapeId,
    wmm: photoW,
    hmm: photoH,
    cutW,
    cutH,
    gapMm,
    marginMm,
    label: label ?? `${dim(photoW, photoH)} · cut ${cutW}×${cutH} mm`,
  };
}

/** A magnet rectangle: same sizes and ids as before, now with a cut outline around it. */
const magnetRect = (shapeId: string, w: number, h: number) => cutTemplate(`magnet-${shapeId}-${w}x${h}`, shapeId, w, h, RING_SQUARE_MM, 2, 4);

/** Events saved before these templates existed point at the old ids, which now map to the new ones. */
const LEGACY_TEMPLATE_IDS: Record<string, string> = {
  'magnet-round-58x58': ROUND_CUT_ID,
  'magnet-square-63.5x63.5': SQUARE_CUT_ID,
};

export const TEMPLATES: Template[] = [
  // Fridge magnets: round first, then square
  cutTemplate(ROUND_CUT_ID, 'round', 59, 59, RING_ROUND_MM, 0.5, 1.5, '58 mm round · photo 59 mm · cut 68 mm'),
  t('magnet', 'round', 50),
  cutTemplate(SQUARE_CUT_ID, 'square', 53.6, 53.6, RING_SQUARE_MM, 4, 4, 'Square · photo 53.6 mm · cut 64 mm'),
  t('magnet', 'square', 50),
  magnetRect('rect-landscape', 80, 53),
  magnetRect('rect-landscape', 89, 51),
  magnetRect('rect-portrait', 53, 80),
  t('magnet', 'round', 37),
  t('magnet', 'oval', 76, 51),
  t('magnet', 'rounded', 80, 53),
  // Photo prints
  t('print', 'rect-landscape', 152, 102),
  t('print', 'rect-landscape', 178, 127),
  t('print', 'rect-portrait', 102, 152),
  t('print', 'rect-portrait', 127, 178),
  t('print', 'square', 102),
  t('print', 'square', 127),
  // Badges / pins
  t('badge', 'round', 58),
  t('badge', 'round', 44),
  t('badge', 'round', 37),
  t('badge', 'square', 50),
  // Keychains
  t('keychain', 'rect-landscape', 45, 30),
  t('keychain', 'rounded', 50, 35),
  t('keychain', 'round', 40),
  // Stickers
  t('sticker', 'round', 50),
  t('sticker', 'round', 76),
  t('sticker', 'square', 50),
  t('sticker', 'square', 76),
  t('sticker', 'rounded', 76, 51),
];

export const PAPERS: Paper[] = [
  { id: 'a6', label: 'A6 (105 × 148 mm)', wmm: 105, hmm: 148 },
  { id: 'a5', label: 'A5 (148 × 210 mm)', wmm: 148, hmm: 210 },
  { id: 'a4', label: 'A4 (210 × 297 mm)', wmm: 210, hmm: 297 },
  { id: 'a3', label: 'A3 (297 × 420 mm)', wmm: 297, hmm: 420 },
  { id: '4x6', label: '4 × 6 in photo paper (102 × 152 mm)', wmm: 102, hmm: 152 },
  { id: '5x7', label: '5 × 7 in photo paper (127 × 178 mm)', wmm: 127, hmm: 178 },
  { id: '13x19', label: '13 × 19 in (330 × 483 mm)', wmm: 330, hmm: 483 },
];

export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id);
export const getShape = (id: string) => SHAPES.find((s) => s.id === id);
export const getTemplate = (id: string) => TEMPLATES.find((x) => x.id === (LEGACY_TEMPLATE_IDS[id] ?? id));

/** Short size text for lists: "59 mm photo · 68 mm cut" for cut templates, otherwise the piece size. */
export function sizeText(t: Template): string {
  const piece = t.wmm === t.hmm ? `${t.wmm} mm` : `${t.wmm}×${t.hmm} mm`;
  return t.cutW && t.cutH ? `${piece} photo · ${cutText(t)} cut` : piece;
}

/** The cut outline size, like "68 mm" or "90.4×63.4 mm". Empty when the template has no cut outline. */
export function cutText(t: Template): string {
  if (!t.cutW || !t.cutH) return '';
  return t.cutW === t.cutH ? `${t.cutW} mm` : `${t.cutW}×${t.cutH} mm`;
}
export const getPaper = (id: string) => PAPERS.find((p) => p.id === id);

export const shapesForProduct = (productId: string) =>
  SHAPES.filter((s) => TEMPLATES.some((x) => x.productId === productId && x.shapeId === s.id));

export const templatesFor = (productId: string, shapeId: string) =>
  TEMPLATES.filter((x) => x.productId === productId && x.shapeId === shapeId);
