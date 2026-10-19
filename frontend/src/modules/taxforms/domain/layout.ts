/**
 * The layout of an official form, as `scripts/taxforms/extract-layout.mjs` measures it on the
 * facsimile the BOE publishes: what is printed and where (PDF points, A4 595 × 842), the cells and
 * rules, and the cell of each numbered box. Only texts and lines: no logos, emblems or barcodes.
 */

// The Renta (modelo 100) has no preview: the owner removed it on 19-10-2026 (the planner works it out).
export type FormModel =
  | '130'
  | '303'
  | '111'
  | '115'
  | '131'
  | '390'
  | '349'
  | '190'
  | '180'
  | '347'
  | '309'
  | '123';

/** x, y (baseline), size, flags (1 bold, 2 turned 90°), text, width it takes on the facsimile. */
export type LayoutText = [number, number, number, number, string, number | null];
/** x, y, width, height, fill colour (-1: none), stroke colour (-1: none), line width, paint order. */
export type LayoutCell = [number, number, number, number, number, number, number, number];
/** x1, y1, x2, y2, colour, line width, paint order. */
export type LayoutRule = [number, number, number, number, number, number, number];
/** Box id ("01", "0435", or "ejercicio" / "periodo"), then the x, y, width and height of its cell. */
export type LayoutBox = [string, number, number, number, number];

export interface LayoutPage {
  t: LayoutText[];
  r: LayoutCell[];
  l: LayoutRule[];
  b: LayoutBox[];
  /**
   * A sheet that lists records (payees, persons, operators): how many blocks it holds. Its boxes
   * «n.field» are the block n of the sheet, and the sheet is repeated as many times as needed.
   */
  rows?: number;
}

export interface FormLayout {
  model: string;
  /** The order and page of the BOE the layout was measured on. */
  source: string;
  /** Rebuilt by hand because the facsimile is a scan: the preview says it is approximate. */
  approx?: boolean;
  colors: [number, number, number][];
  pages: LayoutPage[];
}

export const BOLD = 1;
export const TURNED = 2;

/** The layouts are large: each one is loaded only when it is shown. */
const LOADERS: Record<FormModel, () => Promise<{ default: unknown }>> = {
  '130': () => import('../data/130.json'),
  '303': () => import('../data/303.json'),
  '111': () => import('../data/111.json'),
  '115': () => import('../data/115.json'),
  '131': () => import('../data/131.json'),
  '390': () => import('../data/390.json'),
  '349': () => import('../data/349.json'),
  '190': () => import('../data/190.json'),
  '180': () => import('../data/180.json'),
  '347': () => import('../data/347.json'),
  '309': () => import('../data/309.json'),
  '123': () => import('../data/123.json'),
};

export async function loadLayout(model: FormModel): Promise<FormLayout> {
  return (await LOADERS[model]()).default as FormLayout;
}

/** Every box of the layout, in the order of the form (page by page, as the facsimile lists them). */
export const boxesOf = (layout: FormLayout): string[] =>
  layout.pages.flatMap((p) => p.b.map((b) => b[0]));

/** «3.nif»: the block 3 of a sheet of records and its field; null for a numbered box. */
export function slotOf(id: string): { slot: number; field: string } | null {
  const m = /^(\d+)\.(.+)$/.exec(id);
  return m ? { slot: Number(m[1]), field: m[2] } : null;
}

/** «hoja.base»: a total of the sheet, the sum of its blocks. */
export const sheetTotalOf = (id: string): string | null =>
  id.startsWith('hoja.') ? id.slice(5) : null;
