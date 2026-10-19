/**
 * Builds the synthetic documents of the case bank (docs/casos-practicos/personas/<slug>/documentos) and a
 * copy for the owner to drag into the app (~/Downloads/pruebas finanverso/casos-practicos/<slug>):
 * the Renta draft in PDF with the «label  amount  box» lines of the real AEAT draft, invoice books and
 * bank statements in Excel, single invoices in PDF, filed modelos 130 and 303 (Finanverso templates,
 * filled in) and a «Resumen» PDF with the expected boxes. Every name, tax id and amount is made up.
 *
 *   npm run casos            (from frontend/)
 *
 * The persona data and the expected figures come from construir_casos.py (hand calculation).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { buildXlsx, type XlsxCell } from '../xlsx';
import { model130, model303 } from '../pdf-templates';
import { readDraft } from '../../src/modules/tools/domain/rentaDraft';
import { linesOf } from '../../src/modules/tools/application/readPdf';
import { CCAA_OPTIONS } from '../../src/modules/tools/data/renta/index';

/** The repository root: the first folder up from here that has the case bank. */
const ROOT = (() => {
  let dir = __dirname;
  while (!existsSync(join(dir, 'docs', 'casos-practicos'))) dir = dirname(dir);
  return dir;
})();
const PEOPLE = join(ROOT, 'docs', 'casos-practicos', 'personas');
const DOWNLOADS = join(homedir(), 'Downloads', 'pruebas finanverso', 'casos-practicos');
const NOTICE =
  'Simulación orientativa: no es el modelo oficial. Datos inventados (Finanverso, banco de casos).';

interface Line {
  label: string;
  amount?: number;
  text?: string;
  box: string;
}
interface Section {
  title: string;
  lines: Line[];
}
interface Figure {
  modelo: string;
  periodo?: string;
  declaracion?: string;
  casilla: string | null;
  concepto: string;
  importe: number | null;
  valor?: string;
  origen: 'oficial' | 'calculo-a-mano' | 'pendiente';
  motivo?: string;
}
interface Invoice {
  date: string;
  number: string;
  client?: string;
  supplier?: string;
  nif: string;
  base: number;
  rate: number;
  withheldRate?: number;
  retention?: number;
}
interface Persona {
  slug: string;
  nombre: string;
  nif: string;
  domicilio: string;
  titulo: string;
  descripcion: string;
  modelos: string[];
  alcance: string;
  motivoFueraDeAlcance?: string;
  conyuge?: { nombre: string };
  documentos: {
    borrador?: { exercise: number; sections: Section[] } | null;
    emitidas?: Invoice[];
    recibidas?: Invoice[];
    banco?: { date: string; concept: string; amount: number }[];
    m303?: [string, string, number][][];
  };
}

/** `1234.5` → `1.234,50`, as the AEAT prints amounts. */
export const money = (n: number): string => {
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
};

const INK = rgb(0.1, 0.12, 0.18);
const GREY = rgb(0.4, 0.43, 0.5);
const RED = rgb(0.65, 0.1, 0.1);
const W = 595;
const H = 842;

interface Doc {
  doc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  page: PDFPage;
  y: number;
}

async function start(title: string, subtitle: string): Promise<Doc> {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setProducer('Finanverso, banco de casos prácticos (datos inventados)');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const d: Doc = { doc, font, bold, page: doc.addPage([W, H]), y: H - 40 };
  head(d, title, subtitle);
  return d;
}

function head(d: Doc, title: string, subtitle: string) {
  d.page.drawText(fit(d.bold, title, 13, 515), {
    x: 40,
    y: d.y,
    size: 13,
    font: d.bold,
    color: INK,
  });
  d.y -= 16;
  d.page.drawText(fit(d.font, subtitle, 9, 515), {
    x: 40,
    y: d.y,
    size: 9,
    font: d.font,
    color: GREY,
  });
  d.y -= 14;
  d.page.drawText(NOTICE, { x: 40, y: d.y, size: 8.5, font: d.bold, color: RED });
  d.y -= 22;
}

function room(d: Doc, needed: number, title: string) {
  if (d.y - needed > 50) return;
  d.page = d.doc.addPage([W, H]);
  d.y = H - 40;
  head(d, title, 'continuación');
}

/** Cuts a label so that it fits before the amount column (pdf-lib does not wrap). */
const fit = (font: PDFFont, raw: string, size: number, width: number) => {
  // The standard fonts only have the WinAnsi characters.
  const text = raw.replace(/[−–]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  let t = text;
  while (t.length > 3 && font.widthOfTextAtSize(t, size) > width) t = t.slice(0, -1);
  return t === text ? t : `${t.slice(0, -1)}…`;
};

/** A draft of the Renta: «label   amount   box» on each line, sections as in the AEAT draft. */
async function draftPdf(p: Persona): Promise<{ bytes: Uint8Array; lines: string[] }> {
  const draft = p.documentos.borrador as { exercise: number; sections: Section[] };
  const title = 'Modelo 100 · Ejercicio 2025 · Borrador SINTÉTICO de prueba';
  const d = await start(title, 'Impuesto sobre la Renta de las Personas Físicas · Ejercicio 2025');
  const lines: string[] = [];
  for (const s of draft.sections) {
    room(d, 40, title);
    d.page.drawText(fit(d.bold, s.title, 10, 515), {
      x: 40,
      y: d.y,
      size: 10,
      font: d.bold,
      color: INK,
    });
    d.y -= 15;
    for (const l of s.lines) {
      room(d, 14, title);
      const value = fit(
        d.font,
        l.amount !== undefined ? money(l.amount) : (l.text as string),
        8,
        200
      );
      const label = fit(d.font, l.label, 8, 330);
      d.page.drawText(label, { x: 46, y: d.y, size: 8, font: d.font, color: INK });
      d.page.drawText(value, {
        x: 470 - d.font.widthOfTextAtSize(value, 8),
        y: d.y,
        size: 8,
        font: d.font,
        color: INK,
      });
      d.page.drawText(l.box, { x: 520, y: d.y, size: 8, font: d.bold, color: INK });
      lines.push(`${label}   ${value}   ${l.box}`);
      d.y -= 12.5;
    }
    d.y -= 6;
  }
  return { bytes: await d.doc.save(), lines };
}

/** The expected boxes of each model, grouped by model, return and period. */
async function summaryPdf(p: Persona, figures: Figure[]): Promise<Uint8Array> {
  const title = `Resumen de casillas · ${p.nombre}`;
  const d = await start(title, `${p.titulo} · NIF ficticio ${p.nif}`);
  const groups = new Map<string, Figure[]>();
  for (const f of figures) {
    const key = [
      `Modelo ${f.modelo}`,
      f.declaracion ? `declaración ${f.declaracion}` : '',
      f.periodo ? `periodo ${f.periodo}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  if (p.alcance === 'fuera') {
    d.page.drawText(fit(d.font, `Fuera de alcance: ${p.motivoFueraDeAlcance}`, 9, 515), {
      x: 40,
      y: d.y,
      size: 9,
      font: d.font,
      color: INK,
    });
    d.y -= 20;
  }
  for (const [key, list] of groups) {
    room(d, 50, title);
    d.page.drawText(fit(d.bold, key, 10, 515), {
      x: 40,
      y: d.y,
      size: 10,
      font: d.bold,
      color: INK,
    });
    d.y -= 14;
    for (const f of list) {
      room(d, 14, title);
      const value =
        f.origen === 'pendiente'
          ? 'pendiente'
          : f.importe === null
          ? (f.valor as string)
          : money(f.importe);
      d.page.drawText(f.casilla ?? '—', { x: 44, y: d.y, size: 8, font: d.bold, color: INK });
      d.page.drawText(fit(d.font, f.concepto, 8, 340), {
        x: 80,
        y: d.y,
        size: 8,
        font: d.font,
        color: INK,
      });
      d.page.drawText(value, {
        x: 520 - d.font.widthOfTextAtSize(value, 8),
        y: d.y,
        size: 8,
        font: d.font,
        color: f.origen === 'pendiente' ? GREY : INK,
      });
      d.page.drawText(f.origen === 'pendiente' ? 'P' : f.origen === 'oficial' ? 'O' : 'M', {
        x: 535,
        y: d.y,
        size: 7,
        font: d.font,
        color: GREY,
      });
      d.y -= 11.5;
    }
    d.y -= 8;
  }
  room(d, 30, title);
  d.page.drawText('Origen: M = cálculo a mano (calculo.md), O = caso oficial, P = pendiente.', {
    x: 40,
    y: d.y,
    size: 7.5,
    font: d.font,
    color: GREY,
  });
  return d.doc.save();
}

/** One issued invoice, laid out as a simple Spanish invoice. */
async function invoicePdf(p: Persona, inv: Invoice): Promise<Uint8Array> {
  const d = await start(`FACTURA ${inv.number}`, `Fecha de expedición: ${spanishDate(inv.date)}`);
  const put = (text: string, x: number, size = 9, bold = false) =>
    d.page.drawText(fit(d.font, text, size, 260), {
      x,
      y: d.y,
      size,
      font: bold ? d.bold : d.font,
      color: INK,
    });
  put('Emisor', 40, 9, true);
  put('Cliente', 320, 9, true);
  d.y -= 13;
  put(p.nombre, 40);
  put(inv.client as string, 320);
  d.y -= 12;
  put(`NIF ${p.nif}`, 40);
  put(inv.nif ? `NIF ${inv.nif}` : 'Sin NIF español', 320);
  d.y -= 12;
  put(fit(d.font, p.domicilio, 9, 260), 40);
  d.y -= 30;
  const withheld = Math.round(inv.base * (inv.withheldRate ?? 0)) / 100;
  const vat = Math.round(inv.base * inv.rate) / 100;
  const rows: [string, number][] = [
    ['Base imponible', inv.base],
    [`IVA ${inv.rate} %`, vat],
    ...(withheld
      ? ([[`Retención IRPF ${inv.withheldRate} %`, -withheld]] as [string, number][])
      : []),
    ['Total factura', Math.round((inv.base + vat - withheld) * 100) / 100],
  ];
  for (const [label, amount] of rows) {
    put(label, 300, 10, label === 'Total factura');
    const v = `${money(amount)} €`;
    d.page.drawText(v, {
      x: 555 - d.font.widthOfTextAtSize(v, 10),
      y: d.y,
      size: 10,
      font: d.font,
      color: INK,
    });
    d.y -= 15;
  }
  if (inv.rate === 0) {
    d.y -= 10;
    put(
      inv.nif?.startsWith('FR')
        ? 'Entrega intracomunitaria exenta (art. 25 Ley 37/1992)'
        : 'Exportación exenta (art. 21 Ley 37/1992)',
      40
    );
  }
  return d.doc.save();
}

const spanishDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

function issuedBook(list: Invoice[]): Uint8Array {
  const rows: XlsxCell[][] = [
    [
      'Fecha expedición',
      'Nº factura',
      'Cliente',
      'NIF cliente',
      'Base imponible',
      'Tipo de IVA (%)',
      'Cuota IVA repercutida',
      'Tipo retención IRPF (%)',
      'Importe retenido IRPF',
      'Total factura',
    ],
    ...list.map((i) => {
      const vat = round2((i.base * i.rate) / 100);
      const held = round2((i.base * (i.withheldRate ?? 0)) / 100);
      return [
        { date: i.date },
        i.number,
        i.client as string,
        i.nif,
        i.base,
        i.rate,
        vat,
        i.withheldRate ?? 0,
        held,
        round2(i.base + vat - held),
      ];
    }),
  ];
  return buildXlsx([{ name: 'Facturas emitidas', rows }], { sharedStrings: true });
}

function receivedBook(list: Invoice[]): Uint8Array {
  const rows: XlsxCell[][] = [
    [
      'Fecha expedición',
      'Nº factura',
      'Proveedor y concepto',
      'NIF proveedor',
      'Base imponible',
      'Tipo de IVA (%)',
      'Cuota IVA soportada',
      'Importe retenido IRPF',
      'Total factura',
    ],
    ...list.map((i) => {
      const vat = round2((i.base * i.rate) / 100);
      return [
        { date: i.date },
        i.number,
        i.supplier as string,
        i.nif,
        i.base,
        i.rate,
        vat,
        i.retention ?? 0,
        round2(i.base + vat),
      ];
    }),
  ];
  return buildXlsx([{ name: 'Facturas recibidas', rows }], { sharedStrings: true });
}

function bankBook(moves: { date: string; concept: string; amount: number }[]): Uint8Array {
  let balance = 15000;
  const sorted = [...moves].sort((a, b) => a.date.localeCompare(b.date));
  const rows: XlsxCell[][] = [
    ['Banco Ficticio · extracto de la cuenta ES00 0000 0000 0000 0000 0000 (inventada)'],
    [],
    ['Fecha', 'Concepto', 'Importe', 'Saldo'],
    ...sorted.map((m) => {
      balance = round2(balance + m.amount);
      return [{ date: m.date }, m.concept, m.amount, balance];
    }),
  ];
  return buildXlsx([{ name: 'Movimientos', rows }], { sharedStrings: true });
}

/** A filed modelo (Finanverso template) with its boxes filled in. */
async function filledModel(
  build: () => Promise<Uint8Array>,
  quarter: number,
  boxes: Record<string, number>
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await build());
  const form = doc.getForm();
  form.getTextField('dato.ejercicio').setText('2026');
  form.getTextField('dato.periodo').setText(`${quarter}T`);
  for (const field of form.getFields()) {
    const box = field.getName().replace('dato.', '');
    if (box in boxes) form.getTextField(field.getName()).setText(money(boxes[box]));
  }
  return doc.save();
}

function leeme(p: Persona, figures: Figure[], files: string[]): string {
  const key = figures.filter(
    (f) =>
      f.origen !== 'pendiente' &&
      f.importe !== null &&
      ['0435', '0500', '0545', '0546', '0595', '0670', '71', '19', '30', '05'].includes(
        f.casilla ?? ''
      )
  );
  return [
    `${p.nombre} · ${p.titulo}`,
    '',
    'DATOS INVENTADOS para probar Finanverso. Simulación orientativa: no es el modelo oficial.',
    '',
    p.descripcion,
    '',
    'Archivos:',
    ...files.map((f) => `  - ${f}`),
    '',
    'Qué debe salir (todas las cifras, con su origen, en esperado.json y calculo.md del repositorio):',
    ...key.map(
      (f) =>
        `  - Modelo ${f.modelo}${f.declaracion ? ` (${f.declaracion})` : ''}${
          f.periodo ? ` ${f.periodo}` : ''
        }, casilla ${f.casilla} ${f.concepto}: ${money(f.importe as number)} €`
    ),
    ...(p.alcance === 'fuera' ? ['', `Fuera de alcance: ${p.motivoFueraDeAlcance}`] : []),
    '',
    'Cómo probarlo: Renta → «Importar borrador» con borrador-renta-2025.pdf; Autónomos → «Importar facturas»',
    'con los Excel, y «Importar modelo presentado» con los 130 y 303 en PDF.',
    '',
  ].join('\n');
}

async function selfCheck(p: Persona, bytes: Uint8Array, lines: string[]): Promise<string | null> {
  // Reads the PDF back as the app does and checks the draft reader finds the main boxes.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({
    data: bytes.slice(),
    standardFontDataUrl:
      join(ROOT, 'frontend', 'node_modules', 'pdfjs-dist', 'standard_fonts') + '/',
  }).promise;
  const read: string[] = [];
  const words: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    const pieces = content.items
      .filter((it): it is { str: string; transform: number[] } & typeof it => 'str' in it)
      .map((it) => ({ x: it.transform[4], y: it.transform[5], str: it.str }));
    pieces.forEach((pc) => words.push(pc.str));
    read.push(...linesOf(pieces));
  }
  const missing = lines.filter((l) => !read.includes(l));
  if (missing.length) return `${p.slug}: ${missing.length} líneas no se leen igual (${missing[0]})`;
  const reading = readDraft(words.join(' '), {
    year: 2025,
    communities: CCAA_OPTIONS,
    lines: read,
  });
  const gross = p.documentos.borrador?.sections
    .flatMap((s) => s.lines)
    .find((l) => l.box === '0012')?.amount;
  return reading.gross === gross ? null : `${p.slug}: el lector da ${reading.gross} y no ${gross}`;
}

async function main() {
  const slugs = readdirSync(PEOPLE).filter((s) => existsSync(join(PEOPLE, s, 'persona.json')));
  const problems: string[] = [];
  let count = 0;
  for (const slug of slugs) {
    const dir = join(PEOPLE, slug);
    const p = JSON.parse(readFileSync(join(dir, 'persona.json'), 'utf8')) as Persona;
    const figures = (
      JSON.parse(readFileSync(join(dir, 'esperado.json'), 'utf8')) as { cifras: Figure[] }
    ).cifras;
    const docs = join(dir, 'documentos');
    mkdirSync(docs, { recursive: true });
    const out: Record<string, Uint8Array> = {};
    if (p.documentos.borrador) {
      const { bytes, lines } = await draftPdf(p);
      out['borrador-renta-2025.pdf'] = bytes;
      const problem = await selfCheck(p, bytes, lines);
      if (problem) problems.push(problem);
    }
    const issued = p.documentos.emitidas ?? [];
    if (issued.length) {
      out['facturas-emitidas-2026.xlsx'] = issuedBook(issued);
      out['facturas-recibidas-2026.xlsx'] = receivedBook(p.documentos.recibidas ?? []);
      out['extracto-banco-2026.xlsx'] = bankBook(p.documentos.banco ?? []);
      out[`factura-${issued[0].number}.pdf`] = await invoicePdf(p, issued[0]);
      const foreign = issued.find((i) => i.rate === 0);
      if (foreign) out[`factura-${foreign.number}.pdf`] = await invoicePdf(p, foreign);
      for (const q of [1, 2]) {
        const of = (m: string) =>
          Object.fromEntries(
            figures
              .filter((f) => f.modelo === m && f.periodo === `${q}T` && f.importe !== null)
              .map((f) => [f.casilla as string, f.importe as number])
          );
        out[`modelo-130-${q}T-2026-presentado.pdf`] = await filledModel(model130, q, of('130'));
        out[`modelo-303-${q}T-2026-presentado.pdf`] = await filledModel(model303, q, of('303'));
      }
    }
    out['resumen-casillas.pdf'] = await summaryPdf(p, figures);
    const copy = join(DOWNLOADS, slug);
    mkdirSync(copy, { recursive: true });
    for (const [name, bytes] of Object.entries(out)) {
      writeFileSync(join(docs, name), bytes);
      writeFileSync(join(copy, name), bytes);
      if (bytes.length > 300 * 1024) problems.push(`${slug}/${name}: ${bytes.length} bytes`);
      count++;
    }
    writeFileSync(join(copy, 'LEEME.txt'), leeme(p, figures, Object.keys(out)));
  }
  console.log(`${count} documentos para ${slugs.length} personas; copia en ${DOWNLOADS}`);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exitCode = 1;
  }
}

void main();
