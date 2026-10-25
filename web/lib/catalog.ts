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

export const SHAPES: Shape[] = [
  { id: 'rect-landscape', label: 'Rectangle Landscape (3:2)', icon: 'crop_landscape', clip: 'rect' },
  { id: 'rect-portrait', label: 'Rectangle Portrait (2:3)', icon: 'crop_portrait', clip: 'rect' },
  { id: 'square', label: 'Square (1:1)', icon: 'crop_square', clip: 'rect' },
  { id: 'round', label: 'Round / Circle', icon: 'circle', clip: 'ellipse' },
  { id: 'oval', label: 'Oval', icon: 'egg', clip: 'ellipse' },
  { id: 'rounded', label: 'Rounded Rectangle', icon: 'rounded_corner', clip: 'rounded' },
];

const mmToIn = (mm: number) => (mm / 25.4).toFixed(1).replace(/\.0$/, '');
const dim = (w: number, h: number) =>
  w === h ? `${mmToIn(w)} in (${w} mm)` : `${mmToIn(w)} × ${mmToIn(h)} in (${w}×${h} mm)`;

function t(productId: string, shapeId: string, wmm: number, hmm = wmm): Template {
  return { id: `${productId}-${shapeId}-${wmm}x${hmm}`, productId, shapeId, wmm, hmm, label: dim(wmm, hmm) };
}

export const TEMPLATES: Template[] = [
  // Fridge magnets
  t('magnet', 'rect-landscape', 80, 53),
  t('magnet', 'rect-landscape', 89, 51),
  t('magnet', 'rect-portrait', 53, 80),
  t('magnet', 'square', 63.5),
  t('magnet', 'square', 50),
  t('magnet', 'round', 58),
  t('magnet', 'round', 50),
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
export const getTemplate = (id: string) => TEMPLATES.find((x) => x.id === id);
export const getPaper = (id: string) => PAPERS.find((p) => p.id === id);

export const shapesForProduct = (productId: string) =>
  SHAPES.filter((s) => TEMPLATES.some((x) => x.productId === productId && x.shapeId === s.id));

export const templatesFor = (productId: string, shapeId: string) =>
  TEMPLATES.filter((x) => x.productId === productId && x.shapeId === shapeId);
