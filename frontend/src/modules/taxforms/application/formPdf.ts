import {
  PDFDocument,
  StandardFonts,
  TextAlignment,
  degrees,
  rgb,
  type PDFFont,
  type PDFForm,
  type PDFPage,
} from 'pdf-lib';
import {
  BOLD,
  TURNED,
  type FormLayout,
  type LayoutBox,
  type LayoutCell,
  type LayoutRule,
  type LayoutText,
} from '../domain/layout';
import { formatBox, kindOf, type FilledForm } from '../domain/values';

/** The words of the preview that are not on the official form, in the language of the person. */
export interface PreviewText {
  /** The mark on top of every page: a simulation, not the official form. */
  banner: string;
  /** Under the mark: to be checked by an adviser; the app files and signs nothing. */
  notice: string;
  /** At the foot: what an empty box means. */
  legend: string;
  /** Written in the empty boxes the app does not work out (the Renta). */
  pending: string;
  /** «Página {n} de {total}». */
  page: string;
  /** The title of the document («Modelo 303 · 2026 3T»). */
  title: string;
}

export const A4: [number, number] = [595.28, 841.89];

const INK = rgb(0.13, 0.12, 0.13);
const MARK = rgb(0.71, 0.33, 0.04);
const MARK_FILL = rgb(1, 0.97, 0.9);

/** Letters the standard fonts cannot write, as their closest ones. */
const SWAP: Record<string, string> = { '−': '-', '‐': '-', '≤': '<=', '≥': '>=', '→': '->' };

/** The text in the letters the font has: the others become their closest one, or go. */
function writable(text: string, font: PDFFont): string {
  const has = new Set(font.getCharacterSet());
  return [...text]
    .map((c) => SWAP[c] ?? c)
    .join('')
    .split('')
    .filter((c) => has.has(c.codePointAt(0) as number))
    .join('');
}

/** The size that makes a text take the width it has on the facsimile (never larger than its own). */
function fitted(text: string, size: number, width: number | null, font: PDFFont): number {
  if (!width) return size;
  const natural = font.widthOfTextAtSize(text, size);
  return natural > width * 1.02 ? (size * width) / natural : size;
}

/**
 * The facsimile paints its header bars with pictures over a black base: without the pictures (they
 * are the Tax Agency's), the base is drawn in the dark blue of the forms instead of black.
 */
const BAR: [number, number, number] = [0, 68, 122];

const rgbOf = (layout: FormLayout, i: number, filled: boolean): [number, number, number] => {
  const c = layout.colors[i];
  return filled && c[0] + c[1] + c[2] === 0 ? BAR : c;
};

const colorOf = (layout: FormLayout, i: number, filled = false) => {
  const [r, g, b] = rgbOf(layout, i, filled);
  return rgb(r / 255, g / 255, b / 255);
};

/** True when the text sits on a dark cell (a section bar): it is printed in white there. */
function onDark(layout: FormLayout, cells: LayoutCell[], t: LayoutText): boolean {
  const [x, y, size, flags] = t;
  const [px, py] = flags & TURNED ? [x - size * 0.4, y + 2] : [x + 1, y + size * 0.3];
  const under = cells
    .filter(
      ([cx, cy, w, h, fill]) => fill >= 0 && px >= cx && px <= cx + w && py >= cy && py <= cy + h
    )
    .sort((a, b) => a[2] * a[3] - b[2] * b[3])[0];
  if (!under) return false;
  const [r, g, b] = rgbOf(layout, under[4], true);
  return 0.299 * r + 0.587 * g + 0.114 * b < 110;
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

function drawCell(page: PDFPage, layout: FormLayout, cell: LayoutCell) {
  const [x, y, width, height, fill, stroke, lw] = cell;
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: fill >= 0 ? colorOf(layout, fill, true) : undefined,
    borderColor: stroke >= 0 ? colorOf(layout, stroke) : undefined,
    borderWidth: stroke >= 0 ? lw : 0,
  });
}

function drawRule(page: PDFPage, layout: FormLayout, rule: LayoutRule) {
  const [x1, y1, x2, y2, color, lw] = rule;
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: lw,
    color: colorOf(layout, color),
  });
}

/** The facsimile of one page: its cells and rules first, then its texts on top. */
function drawPage(page: PDFPage, layout: FormLayout, n: number, fonts: Fonts) {
  const { r: cells, l: rules, t: texts } = layout.pages[n];
  // Cells and rules in the order the facsimile paints them (a white cell can hide a rule).
  const shapes = [
    ...cells.map((c) => ({ z: c[7], draw: () => drawCell(page, layout, c) })),
    ...rules.map((l) => ({ z: l[6], draw: () => drawRule(page, layout, l) })),
  ].sort((a, b) => a.z - b.z);
  shapes.forEach((s) => s.draw());
  texts.forEach((t: LayoutText) => {
    const [x, y, size, flags, raw, width] = t;
    const font = flags & BOLD ? fonts.bold : fonts.regular;
    const text = writable(raw, font);
    page.drawText(text, {
      x,
      y,
      font,
      size: fitted(text, size, width, font),
      color: onDark(layout, cells, t) ? rgb(1, 1, 1) : INK,
      rotate: flags & TURNED ? degrees(90) : undefined,
    });
  });
}

/** The mark of a simulation on top and the legend at the foot, on every page. */
function drawMarks(page: PDFPage, text: PreviewText, n: number, total: number, fonts: Fonts) {
  page.drawRectangle({
    x: 36,
    y: 786,
    width: 523,
    height: 30,
    color: MARK_FILL,
    borderColor: MARK,
    borderWidth: 0.6,
  });
  page.drawText(writable(text.banner, fonts.bold), {
    x: 44,
    y: 803,
    size: 8.5,
    font: fonts.bold,
    color: MARK,
  });
  const notice = writable(text.notice, fonts.regular);
  page.drawText(notice, {
    x: 44,
    y: 792,
    size: fitted(notice, 6.2, 505, fonts.regular),
    font: fonts.regular,
    color: INK,
  });
  const legend = writable(text.legend, fonts.regular);
  page.drawText(legend, {
    x: 40,
    y: 40,
    size: fitted(legend, 6, 440, fonts.regular),
    font: fonts.regular,
    color: MARK,
  });
  const number = writable(
    text.page.replace('{n}', String(n + 1)).replace('{total}', String(total)),
    fonts.regular
  );
  page.drawText(number, {
    x: 555 - fonts.regular.widthOfTextAtSize(number, 6),
    y: 40,
    size: 6,
    font: fonts.regular,
    color: INK,
  });
}

/** What goes in a box: the year, the period or the figure, written as the form expects it. */
function valueOf(form: FilledForm, id: string): string | null {
  if (id === 'ejercicio') return String(form.year);
  if (id === 'periodo') return form.period;
  return id in form.values ? formatBox(form.values[id], kindOf(form.model, id)) : null;
}

interface FieldContext {
  acro: PDFForm;
  page: PDFPage;
  fonts: Fonts;
  form: FilledForm;
  text: PreviewText;
}

const isPeriod = (id: string) => id === 'ejercicio' || id === 'periodo';

/**
 * The fillable field of a box, with the app's figure the first time the box appears; an empty box
 * the app does not work out says so (the Renta).
 */
function addField({ acro, page, fonts, form, text }: FieldContext, box: LayoutBox, times: number) {
  const [id, x, y, width, height] = box;
  const name = `${isPeriod(id) ? id : `casilla.${id}`}${times ? `_${times + 1}` : ''}`;
  const field = acro.createTextField(name);
  const value = times === 0 ? valueOf(form, id) : null;
  if (value !== null) field.setText(value);
  else if (times === 0 && form.pending.includes(id)) {
    page.drawText(writable(text.pending, fonts.regular), {
      x: x + 1.5,
      y: y + height / 2 - 1.5,
      size: fitted(text.pending, 4.2, width - 3, fonts.regular),
      font: fonts.regular,
      color: MARK,
    });
  }
  field.setAlignment(isPeriod(id) ? TextAlignment.Left : TextAlignment.Right);
  field.addToPage(page, {
    x,
    y,
    width,
    height,
    font: fonts.regular,
    textColor: rgb(0.05, 0.2, 0.55),
    backgroundColor: undefined,
    borderWidth: 0,
  });
  field.setFontSize(Math.max(4, Math.min(7, height - 2.4)));
}

/**
 * The preview of a form as a PDF: the official layout, the mark of a simulation and a fillable field
 * in the cell of every box, with the figure of the app typed in. Built on the device.
 */
export async function buildFormPdf(
  layout: FormLayout,
  form: FilledForm,
  text: PreviewText
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(text.title);
  doc.setSubject(text.banner);
  doc.setCreator('Finanverso');
  doc.setProducer('Finanverso');
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const acro = doc.getForm();
  const seen = new Map<string, number>();
  layout.pages.forEach((_, n) => {
    const page = doc.addPage(A4);
    drawPage(page, layout, n, fonts);
    drawMarks(page, text, n, layout.pages.length, fonts);
    for (const box of layout.pages[n].b) {
      // A box printed twice (a table of several properties…) has one field per cell, its value once.
      const times = seen.get(box[0]) ?? 0;
      seen.set(box[0], times + 1);
      addField({ acro, page, fonts, form, text }, box, times);
    }
  });
  acro.updateFieldAppearances(fonts.regular);
  return doc.save();
}
