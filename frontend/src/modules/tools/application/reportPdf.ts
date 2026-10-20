import type { jsPDF as JsPdf } from 'jspdf';
import type { CellHookData, RowInput, UserOptions } from 'jspdf-autotable';
import { copyFileName, type CopyPlan, type ReportSheet, type Zone } from '../domain/invest/report';
import { webValue } from '../domain/invest/rentaWeb';

/**
 * `Finanverso-Renta-<año>-copiar-en-Renta-WEB.pdf`, the file to follow beside Renta WEB (jsPDF and
 * jspdf-autotable, as the other PDFs of the app). A4 landscape: «Empieza aquí» with the numbers in
 * cards, the three steps and one row worked out; a section per window with its table (the columns
 * to copy in soft yellow, those to check in grey, a box to tick per row and the header repeated on
 * every page); the totals to see; and the FIFO detail as an annex in small print. Every page has the
 * title, the «not an official document» mark and «Página X de Y». Helvetica, so every text is put in
 * WinAnsi (accents, ñ and € are kept).
 */

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;

/** The brand's blues, a soft yellow for what is copied and greys that print well in black and white. */
export const PDF_COLORS = {
  navy: rgb('#1e3a8a'),
  blue: rgb('#2563eb'),
  ink: rgb('#0f172a'),
  muted: rgb('#475569'),
  faint: rgb('#64748b'),
  line: rgb('#cbd5e1'),
  card: rgb('#eff6ff'),
  cardLine: rgb('#bfdbfe'),
  copy: rgb('#fef3c7'),
  copyAlt: rgb('#fcebb6'),
  copyBand: rgb('#fde68a'),
  check: rgb('#f1f5f9'),
  checkAlt: rgb('#e5eaf0'),
  checkHead: rgb('#64748b'),
  zebra: rgb('#f8fafc'),
  white: rgb('#ffffff'),
};
const C = PDF_COLORS;

/** The labels over each kind of column of a window's table. */
export const ZONE_BAND: Record<Exclude<Zone, 'plain' | 'done'>, string> = {
  copy: 'COPIAR EN RENTA WEB (un campo por columna, en este orden)',
  check: 'NO COPIAR: solo para comprobar',
};

/** What the standard fonts cannot draw, said with what they can. */
const SPELLED: Record<string, string> = {
  '≥': '>=',
  '≤': '<=',
  '→': '->',
  '←': '<-',
  '−': '-',
  '✓': 'x',
  '₮': 'USDT',
  '\t': ' ',
};
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
const drawable = (ch: string) => {
  const code = ch.charCodeAt(0);
  return (
    ch === '\n' ||
    (code >= 0x20 && code <= 0x7e) ||
    (code >= 0xa0 && code <= 0xff) ||
    WIN_ANSI_EXTRA.has(ch)
  );
};

/** A text with only WinAnsi characters: accents are kept, the rest is spelled or becomes «?». */
export function winAnsi(text: string): string {
  let out = '';
  for (const ch of text) {
    if (drawable(ch)) out += ch;
    else if (SPELLED[ch]) out += SPELLED[ch];
    else {
      const plain = ch.normalize('NFKD').replace(/[̀-ͯ]/g, '');
      out += plain && [...plain].every(drawable) ? plain : '?';
    }
  }
  return out;
}

/** A value as the PDF shows it: decimal comma, no thousands separator, euros with two decimals. */
const cellText = (v: string | number, money: boolean) =>
  typeof v === 'string' ? winAnsi(v) : money ? webValue(v) : String(v).replace('.', ',');

const euros = (n: number) => `${webValue(n)} €`;

/** A header: «(€)» becomes «, en €» (some viewers draw the bold € wider and it hits the bracket). */
const headText = (v: string) => winAnsi(v.replace(/ \(€\)$/, ', en €'));
const rowsWord = (n: number) => `${n} ${n === 1 ? 'fila' : 'filas'}`;

// A4 landscape, in millimetres.
const W = 297;
const H = 210;
const M = 12;
const TOP = 22;
const BOTTOM = H - 15;
const WIDTH = W - 2 * M;
/** From points to millimetres, with some leading. */
const lineHeight = (size: number) => size * 0.3528 * 1.32;

export interface PdfReport {
  /** «Renta <año>: lo que tienes que copiar en Renta WEB», at the top of every page. */
  title: string;
  year: number;
  plan: CopyPlan;
  sheets: ReportSheet[];
}

interface Card {
  label: string;
  value: string;
  note: string;
}

/** The PDF's bytes; `compress: false` leaves the text readable (tests). */
export async function reportPdfBytes(
  report: PdfReport,
  { compress = true }: { compress?: boolean } = {}
): Promise<ArrayBuffer> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc: JsPdf = new jsPDF({ orientation: 'landscape', format: 'a4', unit: 'mm', compress });
  doc.setFont('helvetica', 'normal');
  let y = TOP;
  let blank = true;

  const color = (c: Rgb) => doc.setTextColor(c[0], c[1], c[2]);
  const fill = (c: Rgb) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: Rgb) => doc.setDrawColor(c[0], c[1], c[2]);
  const font = (size: number, bold = false) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
  };
  const page = () => {
    if (!blank) doc.addPage('a4', 'landscape');
    y = TOP;
    blank = true;
  };
  /** Room for `h` millimetres, or a new page. */
  const room = (h: number) => {
    if (y + h > BOTTOM) page();
  };
  const lines = (text: string, size: number, width: number, bold = false): string[] => {
    font(size, bold);
    return doc.splitTextToSize(winAnsi(text), width) as string[];
  };
  /** A paragraph, wrapped; `swatch` draws the colour of a kind of column before it. */
  const para = (
    text: string,
    size: number,
    opts: {
      bold?: boolean;
      tone: Rgb;
      x?: number;
      width?: number;
      after?: number;
      swatch?: Rgb;
    }
  ) => {
    const indent = opts.swatch ? 7 : 0;
    const x = (opts.x ?? M) + indent;
    const parts = lines(text, size, (opts.width ?? WIDTH) - indent, opts.bold);
    const lh = lineHeight(size);
    parts.forEach((part, i) => {
      room(lh);
      if (i === 0 && opts.swatch) {
        fill(opts.swatch);
        stroke(C.faint);
        doc.setLineWidth(0.2);
        doc.rect(x - indent, y - lh * 0.72, 5, lh * 0.8, 'FD');
      }
      font(size, opts.bold);
      color(opts.tone);
      doc.text(part, x, y);
      y += lh;
      blank = false;
    });
    y += opts.after ?? 1.5;
  };
  const heading = (text: string, size: number) => {
    room(lineHeight(size) + 8);
    y += lineHeight(size) * 0.6;
    para(text, size, { bold: true, tone: C.navy, after: 2 });
  };

  /** Numbers in boxes, six to a row. */
  /** At most `max` lines, the last one ending in «…» when the text is longer. */
  const clip = (text: string, size: number, width: number, max: number, bold = false) => {
    const all = lines(text, size, width, bold);
    if (all.length <= max) return all;
    const kept = all.slice(0, max);
    let tail = kept[max - 1];
    while (tail.length > 1 && doc.getTextWidth(`${tail}…`) > width) tail = tail.slice(0, -1);
    kept[max - 1] = `${tail.trimEnd()}…`;
    return kept;
  };

  const cards = (list: Card[]) => {
    const perRow = 6;
    const gap = 4;
    const w = (WIDTH - gap * (perRow - 1)) / perRow;
    const h = 21;
    for (let i = 0; i < list.length; i += perRow) {
      room(h);
      list.slice(i, i + perRow).forEach((card, j) => drawCard(card, M + j * (w + gap), w, h));
      y += h + gap;
    }
    y += 1;
  };

  /** One box: what it is, the number big, and a note under it. */
  const drawCard = (card: Card, x: number, w: number, h: number) => {
    fill(C.card);
    stroke(C.cardLine);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, 2, 2, 'FD');
    const label = clip(card.label, 7.5, w - 6, 2, true);
    color(C.muted);
    doc.text(label, x + 3, y + 4.6);
    font(15, true);
    color(C.navy);
    doc.text(winAnsi(card.value), x + 3, y + 7.4 + label.length * 3.3);
    const note = clip(card.note, 6.5, w - 6, 2);
    color(C.faint);
    doc.text(note, x + 3, y + h - 4.8 + (note.length === 1 ? 2.6 : 0));
    blank = false;
  };

  /** The three steps, each with its number in a circle. */
  const steps = (list: string[], x: number, width: number) => {
    list.forEach((step, i) => {
      const parts = lines(step, 9.5, width - 10);
      const lh = lineHeight(9.5);
      room(parts.length * lh + 3);
      fill(C.navy);
      doc.circle(x + 3.4, y + 0.6, 3.4, 'F');
      font(10, true);
      color(C.white);
      doc.text(String(i + 1), x + 3.4, y + 1.9, { align: 'center' });
      font(9.5);
      color(C.ink);
      doc.text(parts, x + 10, y + 1.4);
      y += parts.length * lh + 4;
      blank = false;
    });
  };

  const last = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  /**
   * A table: a band over the columns to copy and to check, the header in colour (repeated on every
   * page), alternate rows, numbers to the right, and a box to tick in the «Hecho» column.
   */
  const table = (
    sheet: ReportSheet,
    opts: { size: number; x?: number; width?: number; tick?: string }
  ) => {
    const zones: Zone[] = [...(sheet.zones ?? sheet.rows[0].map((): Zone => 'plain'))];
    const [head, ...body] = sheet.rows.map((r) => [...r]);
    if (opts.tick) {
      head.push(opts.tick);
      body.forEach((r) => r.push(''));
      zones.push('done');
    }
    const money = (c: number) => !!sheet.money?.[c];
    const numeric = head.map(
      (_, c) => money(c) || (body.length > 0 && body.every((r) => typeof r[c] === 'number'))
    );
    const banded = zones.some((z) => z === 'copy' || z === 'check') && sheet.kind === 'window';
    const band: RowInput = zones
      .reduce<{ content: string; colSpan: number; zone: Zone }[]>((cells, z, c) => {
        if (c > 0 && zones[c - 1] === z) cells[cells.length - 1].colSpan++;
        else
          cells.push({
            content: z === 'copy' || z === 'check' ? ZONE_BAND[z] : '',
            colSpan: 1,
            zone: z,
          });
        return cells;
      }, [])
      .map((b) => ({
        content: b.content,
        colSpan: b.colSpan,
        styles: {
          fillColor: b.zone === 'copy' ? C.copyBand : b.zone === 'check' ? C.checkAlt : C.white,
          textColor: b.zone === 'copy' ? C.ink : C.muted,
          fontStyle: 'bold',
          halign: 'left',
        },
      }));
    const columnStyles: UserOptions['columnStyles'] = {};
    zones.forEach((z, c) => {
      if (z === 'done') {
        font(opts.size - 0.5, true);
        columnStyles[c] = {
          cellWidth: Math.max(13, doc.getTextWidth(String(head[c])) + 4),
          halign: 'center',
        };
      } else if (numeric[c]) columnStyles[c] = { halign: 'right' };
      // A field whose label is a whole sentence (the mark of a repurchase) wraps it in a narrow column.
      else if (String(head[c]).length > 60) columnStyles[c] = { cellWidth: 40 };
    });
    if (sheet.kind === 'window') columnStyles[0] = { cellWidth: 12, halign: 'right' };
    // The row worked out: the field on the left, what to write on the right.
    if (sheet.kind === 'start' && zones.length === 2)
      columnStyles[0] = { cellWidth: (opts.width as number) * 0.6 };
    const zoneOf = (c: number) => zones[c];
    autoTable(doc, {
      startY: y,
      margin: {
        top: TOP,
        bottom: H - BOTTOM,
        left: opts.x ?? M,
        right: W - (opts.x ?? M) - (opts.width ?? WIDTH),
      },
      head: [...(banded ? [band] : []), head.map((v) => headText(String(v)))],
      body: body.map((r) => r.map((v, c) => cellText(v, money(c)))),
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: opts.size,
        cellPadding: { top: 1.3, bottom: 1.3, left: 1.5, right: 1.5 },
        lineColor: C.line,
        lineWidth: 0.15,
        textColor: C.ink,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: C.navy,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: opts.size - 0.5,
        valign: 'bottom',
      },
      columnStyles,
      didParseCell: (data: CellHookData) => {
        const z = zoneOf(data.column.index);
        const s = data.cell.styles;
        if (data.section === 'head') {
          if (data.row.index === (banded ? 1 : 0) && z === 'check') s.fillColor = C.checkHead;
          if (numeric[data.column.index] && data.row.index === (banded ? 1 : 0)) s.halign = 'right';
          if (z === 'done') s.halign = 'center';
          return;
        }
        const odd = data.row.index % 2 === 1;
        if (z === 'copy') s.fillColor = odd ? C.copyAlt : C.copy;
        else if (z === 'check') {
          s.fillColor = odd ? C.checkAlt : C.check;
          s.textColor = C.muted;
        } else s.fillColor = odd ? C.zebra : C.white;
        if (z === 'copy' && sheet.kind === 'start') s.fontStyle = 'bold';
      },
      didDrawCell: (data: CellHookData) => {
        if (data.section !== 'body' || zoneOf(data.column.index) !== 'done') return;
        const size = 3.8;
        stroke(C.navy);
        fill(C.white);
        doc.setLineWidth(0.35);
        doc.rect(
          data.cell.x + (data.cell.width - size) / 2,
          data.cell.y + (data.cell.height - size) / 2,
          size,
          size,
          'FD'
        );
      },
    });
    blank = false;
    return last();
  };

  const totalsSheet = report.sheets.find((s) => s.kind === 'totals');
  const totalCards = (totalsSheet?.rows.slice(1) ?? []).map(([box, label, amount]): Card => ({
    label: `Casilla ${box}`,
    value: euros(Number(amount)),
    note: String(label),
  }));

  // ─── Empieza aquí ───────────────────────────────────────────────────────────
  const start = report.sheets.find((s) => s.kind === 'start');
  if (start) {
    para(start.title as string, 17, { bold: true, tone: C.navy, after: 1 });
    (start.intro ?? []).forEach((text) => para(text, 10, { tone: C.muted, after: 1 }));
    y += 2;
    const { plan } = report;
    if (plan.rows > 0) {
      para('Lo que tienes que hacer', 9, { bold: true, tone: C.blue, after: 1.5 });
      cards([
        { label: 'Filas que copiar', value: String(plan.rows), note: 'Una «Alta» por fila' },
        {
          label: 'Tiempo estimado',
          value: `${plan.minutes} min`,
          note: 'Unos 90 segundos por fila',
        },
        ...plan.windows.map((w) => ({ label: w.tab, value: rowsWord(w.rows), note: w.title })),
      ]);
    }
    if (totalCards.length) {
      para('Totales que Renta WEB debe mostrar al terminar', 9, {
        bold: true,
        tone: C.blue,
        after: 1.5,
      });
      cards(totalCards);
    }
    if (start.steps?.length) {
      // The steps on the left, the row worked out on the right (on a page of their own if needed).
      const left = 118;
      room(
        14 +
          start.steps.reduce(
            (h, step) => h + lines(step, 9.5, left - 10).length * lineHeight(9.5) + 4,
            0
          )
      );
      const top = y;
      para('Los 3 pasos', 11, { bold: true, tone: C.navy, width: left, after: 2 });
      steps(start.steps, M, left);
      const stepsEnd = y;
      y = top;
      const x = M + left + 8;
      const width = WIDTH - left - 8;
      para(start.caption as string, 9, { bold: true, tone: C.navy, x, width, after: 1.5 });
      const end = table(start, { size: 8.5, x, width });
      y = Math.max(stepsEnd, end) + 4;
    } else {
      para(start.caption as string, 10, { bold: true, tone: C.navy, after: 1.5 });
      y = table(start, { size: 9, tick: 'Hecho' }) + 4;
    }
  }

  // ─── Una sección por ventana ────────────────────────────────────────────────
  for (const sheet of report.sheets.filter((s) => s.kind === 'window')) {
    page();
    para(sheet.name.toUpperCase(), 8.5, { bold: true, tone: C.blue, after: 1.5 });
    para(sheet.title as string, 14, { bold: true, tone: C.navy, after: 1.5 });
    // The first line says where; the next two explain the yellow and the grey columns.
    (sheet.intro as string[]).forEach((text, i) =>
      para(text, 8.5, {
        tone: C.muted,
        after: 0.6,
        swatch: i === 1 ? C.copy : i === 2 ? C.check : undefined,
      })
    );
    y += 1.5;
    const width = sheet.rows[0].length;
    y = table(sheet, { size: width > 12 ? 7 : 7.5 }) + 5;
    const w = sheet.window;
    if (w) {
      room(32);
      para('Al terminar esta ventana, Renta WEB debe mostrar:', 9, {
        bold: true,
        tone: C.navy,
        after: 1.5,
      });
      cards([
        { label: `Casilla ${w.gains.box}`, value: euros(w.gains.amount), note: 'Ganancias' },
        { label: `Casilla ${w.losses.box}`, value: euros(w.losses.amount), note: 'Pérdidas' },
      ]);
    }
  }

  // ─── Totales y lo que hay que guardar ───────────────────────────────────────
  if (totalsSheet) {
    page();
    para(totalsSheet.title as string, 16, { bold: true, tone: C.navy, after: 1 });
    (totalsSheet.intro as string[]).forEach((text) => para(text, 10, { tone: C.muted, after: 1 }));
    y += 2;
    y = table(totalsSheet, { size: 10, tick: 'Comprobado' }) + 8;
    room(26);
    fill(C.card);
    stroke(C.blue);
    doc.setLineWidth(0.5);
    doc.roundedRect(M, y, WIDTH, 22, 2, 2, 'FD');
    y += 7;
    para('Guarda este archivo y el detalle FIFO al menos 4 años (art. 66 LGT).', 12, {
      bold: true,
      tone: C.navy,
      x: M + 5,
      width: WIDTH - 10,
      after: 0.5,
    });
    para(
      'Es el plazo en el que Hacienda puede revisar tu declaración (artículo 66 de la Ley General Tributaria). El detalle de cada venta con sus compras (FIFO) está en el anexo de este PDF.',
      9,
      { tone: C.muted, x: M + 5, width: WIDTH - 10 }
    );
    y += 6;
  }

  // ─── Anexo, en letra pequeña ────────────────────────────────────────────────
  report.sheets
    .filter((s) => !s.kind || s.kind === 'annex')
    .forEach((sheet, i) => {
      if (i === 0) page();
      else room(30);
      heading(sheet.title ?? sheet.name, 11);
      (sheet.intro ?? []).forEach((text) => para(text, 7.5, { tone: C.muted, after: 1 }));
      y = table(sheet, { size: 6.5 }) + 6;
    });

  // ─── Cabecera y pie de cada página ──────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  const file = copyFileName(report.year);
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    font(10, true);
    color(C.navy);
    doc.text(winAnsi(report.title), M, 12);
    font(7.5);
    color(C.faint);
    doc.text('Preparado con Finanverso · no es un documento oficial', W - M, 12, {
      align: 'right',
    });
    stroke(C.blue);
    doc.setLineWidth(0.5);
    doc.line(M, 15, W - M, 15);
    stroke(C.line);
    doc.setLineWidth(0.2);
    doc.line(M, H - 10, W - M, H - 10);
    font(7.5);
    color(C.faint);
    doc.text(`Renta ${report.year} · ${file}`, M, H - 6);
    doc.text(`Página ${p} de ${pages}`, W - M, H - 6, { align: 'right' });
  }
  return doc.output('arraybuffer');
}

/** The PDF as a file to save. */
export const reportPdf = async (report: PdfReport): Promise<Blob> =>
  new Blob([await reportPdfBytes(report)], { type: 'application/pdf' });
