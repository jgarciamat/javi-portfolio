/**
 * Documents of the second batch of the case bank (personas «p2-»): the same layouts as generar.ts
 * (Renta draft with the «label  amount  box» lines of the AEAT draft, invoice books and bank statement
 * in Excel, invoices and filed modelos in PDF, summary of the expected boxes) plus the papers a
 * gestor asks for: withholding certificates of each payer, a payslip, the bank's tax report of the
 * savings and a data sheet. Writes docs/casos-practicos/personas/p2-NN-…/documentos and a copy for
 * the owner in ~/Downloads/pruebas finanverso/personas/NN - <name>/ (names from the private
 * nombres-p2.json there; «Persona Ficticia NN» otherwise). It does not touch personas 01-28.
 *
 *   node scripts/casos/run-personas2.mjs      (from frontend/)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { buildXlsx, type XlsxCell } from '../xlsx';
import { model111, model115, model130, model303 } from '../pdf-templates';
import { readDraft } from '../../src/modules/tools/domain/rentaDraft';
import { linesOf } from '../../src/modules/tools/application/readPdf';
import { CCAA_OPTIONS } from '../../src/modules/tools/data/renta/index';

const ROOT = (() => {
  let dir = __dirname;
  while (!existsSync(join(dir, 'docs', 'casos-practicos'))) dir = dirname(dir);
  return dir;
})();
const PEOPLE = join(ROOT, 'docs', 'casos-practicos', 'personas');
const PRIVATE = join(homedir(), 'Downloads', 'pruebas finanverso', 'personas');
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
  kind?: string;
  isp?: string;
  tax?: string;
  re?: number;
  reAmount?: number;
}
interface Payer {
  name: string;
  nif: string;
  gross: number;
  withheld: number;
  ss: number;
}
type Rows = [string, string, number][];
interface Persona {
  slug: string;
  nombre: string;
  nif: string;
  domicilio: string;
  iban: string;
  comunidad: string;
  ejercicio: number;
  titulo: string;
  descripcion: string;
  prueba: string[];
  modelos: string[];
  alcance: string;
  motivoFueraDeAlcance?: string;
  documentos: {
    borrador?: { exercise: number; sections: Section[] } | null;
    pagadores?: Payer[];
    ahorro?: string[];
    actividad?: string[];
    emitidas?: Invoice[];
    recibidas?: Invoice[];
    banco?: { date: string; concept: string; amount: number }[];
    m303?: Rows[];
    m130?: Rows[];
    m111?: Rows[];
    m115?: Rows[];
  };
}

export const money = (n: number): string => {
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
};
const round2 = (n: number) => Math.round(n * 100) / 100;
const spanishDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

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

/** Cuts a text to a width (pdf-lib does not wrap) and keeps to the WinAnsi characters. */
const fit = (font: PDFFont, raw: string, size: number, width: number) => {
  const text = raw
    .replace(/[−–]/g, '-')
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\*\*/g, '')
    .replace(/[^\x20-\x7E -ÿ€]/g, '');
  let t = text;
  while (t.length > 3 && font.widthOfTextAtSize(t, size) > width) t = t.slice(0, -1);
  return t === text ? t : `${t.slice(0, -1)}…`;
};

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

async function start(title: string, subtitle: string): Promise<Doc> {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setProducer('Finanverso, banco de casos prácticos (datos inventados)');
  const d: Doc = {
    doc,
    font: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    page: doc.addPage([W, H]),
    y: H - 40,
  };
  head(d, title, subtitle);
  return d;
}

function room(d: Doc, needed: number, title: string) {
  if (d.y - needed > 50) return;
  d.page = d.doc.addPage([W, H]);
  d.y = H - 40;
  head(d, title, 'continuación');
}

/** A line of text that wraps on words. */
function para(d: Doc, text: string, title: string, size = 9, bold = false) {
  const font = bold ? d.bold : d.font;
  const words = fit(font, text, size, 1e6).split(' ');
  let line = '';
  const flush = () => {
    room(d, 14, title);
    d.page.drawText(line, { x: 40, y: d.y, size, font, color: INK });
    d.y -= size + 4;
    line = '';
  };
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > 515) flush();
    line = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(line, size) > 515) line = w;
  }
  if (line) flush();
}

/** Rows of «concept ... amount», as in a certificate. */
function table(d: Doc, rows: [string, string][], title: string) {
  for (const [label, value] of rows) {
    room(d, 14, title);
    d.page.drawText(fit(d.font, label, 9, 380), {
      x: 46,
      y: d.y,
      size: 9,
      font: d.font,
      color: INK,
    });
    const v = fit(d.font, value, 9, 120);
    d.page.drawText(v, {
      x: 555 - d.font.widthOfTextAtSize(v, 9),
      y: d.y,
      size: 9,
      font: d.font,
      color: INK,
    });
    d.y -= 13;
  }
  d.y -= 6;
}

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

async function summaryPdf(p: Persona, figures: Figure[]): Promise<Uint8Array> {
  const title = `Resumen de casillas · ${p.nombre}`;
  const d = await start(title, `${p.titulo} · NIF ficticio ${p.nif}`);
  if (p.alcance === 'fuera') para(d, `Fuera de alcance: ${p.motivoFueraDeAlcance}`, title);
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
      const v = fit(d.font, value, 8, 110);
      d.page.drawText(v, {
        x: 520 - d.font.widthOfTextAtSize(v, 8),
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

async function sheetPdf(p: Persona): Promise<Uint8Array> {
  const title = `Ficha de la persona · ${p.nombre}`;
  const d = await start(title, p.titulo);
  table(
    d,
    [
      ['Nombre (ficticio)', p.nombre],
      ['NIF (ficticio)', p.nif],
      ['Domicilio (inventado)', p.domicilio.replace(' (dirección inventada)', '')],
      ['Comunidad o ciudad', p.comunidad],
      ['IBAN (inventado)', p.iban],
      ['Ejercicio', String(p.ejercicio)],
      ['Modelos', p.modelos.join(', ')],
    ],
    title
  );
  para(d, p.descripcion, title);
  d.y -= 6;
  para(d, 'Qué prueba este caso:', title, 9, true);
  for (const t of p.prueba) para(d, `- ${t}`, title);
  return d.doc.save();
}

async function certificatePdf(p: Persona, pay: Payer): Promise<Uint8Array> {
  const pension = pay.nif.startsWith('Q') || /Pensiones/.test(pay.name);
  const title = `Certificado de ${pension ? 'pensiones y ' : ''}retenciones · Ejercicio 2025`;
  const d = await start(title, `Pagador: ${pay.name} · NIF ${pay.nif}`);
  para(
    d,
    `Perceptor: ${p.nombre}, NIF ${p.nif}. Certificado a efectos del IRPF (art. 108 del Reglamento).`,
    title
  );
  d.y -= 6;
  table(
    d,
    [
      [
        pension ? 'Prestaciones íntegras dinerarias' : 'Retribuciones dinerarias íntegras',
        `${money(pay.gross)} €`,
      ],
      ['Retenciones e ingresos a cuenta practicados', `${money(pay.withheld)} €`],
      ['Cotizaciones a la Seguridad Social a cargo del perceptor', `${money(pay.ss)} €`],
      ['Rendimientos en especie', '0,00 €'],
    ],
    title
  );
  return d.doc.save();
}

async function payslipPdf(p: Persona, pay: Payer): Promise<Uint8Array> {
  const title = 'Nómina de diciembre de 2025';
  const d = await start(title, `Empresa: ${pay.name} · NIF ${pay.nif}`);
  const month = round2(pay.gross / 12);
  const ss = round2(pay.ss / 12);
  const held = round2(pay.withheld / 12);
  para(d, `Trabajador: ${p.nombre}, NIF ${p.nif}. Doce pagas (pagas extra prorrateadas).`, title);
  d.y -= 6;
  table(
    d,
    [
      ['Salario bruto del mes', `${money(month)} €`],
      ['Cotización del trabajador (6,48 %)', `-${money(ss)} €`],
      ['Retención del IRPF', `-${money(held)} €`],
      ['Líquido a percibir', `${money(round2(month - ss - held))} €`],
      ['Acumulado del año: bruto', `${money(pay.gross)} €`],
      ['Acumulado del año: retenciones', `${money(pay.withheld)} €`],
    ],
    title
  );
  return d.doc.save();
}

async function savingsPdf(p: Persona): Promise<Uint8Array> {
  const title = 'Información fiscal 2025 · Banco Ficticio';
  const d = await start(title, `Titular: ${p.nombre} · NIF ${p.nif} · cuenta ${p.iban}`);
  for (const line of p.documentos.ahorro ?? []) para(d, `- ${line}`, title);
  return d.doc.save();
}

/** The data of the farm or business of the year (sales, grants, withholdings, expenses), as the owner hands them over. */
async function activityPdf(p: Persona, lines: string[]): Promise<Uint8Array> {
  const title = 'Datos de la actividad 2025 (libros, liquidaciones y ayudas)';
  const d = await start(title, `Titular: ${p.nombre} · NIF ${p.nif}`);
  for (const line of lines) para(d, `- ${line}`, title);
  return d.doc.save();
}

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
  put(inv.nif ? `NIF ${inv.nif}` : 'Factura simplificada (sin NIF)', 320);
  d.y -= 12;
  put(p.domicilio, 40);
  d.y -= 30;
  const tax = inv.tax ?? 'IVA';
  const withheld = round2((inv.base * (inv.withheldRate ?? 0)) / 100);
  const vat = round2((inv.base * inv.rate) / 100);
  const rows: [string, number][] = [
    ['Base imponible', inv.base],
    ...(inv.rate ? ([[`${tax} ${inv.rate} %`, vat]] as [string, number][]) : []),
    ...(withheld
      ? ([[`Retención IRPF ${inv.withheldRate} %`, -withheld]] as [string, number][])
      : []),
    ['Total factura', round2(inv.base + vat - withheld)],
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
  d.y -= 10;
  if (inv.kind === 'exempt')
    put('Operación exenta de IVA (art. 20.Uno.3.º Ley 37/1992: asistencia sanitaria)', 40);
  else if (!inv.rate && p.comunidad === 'ceuta')
    put('Operación no sujeta al IVA (Ceuta, art. 3 Ley 37/1992); IPSI aparte', 40);
  return d.doc.save();
}

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
      'Nota',
    ],
    ...list.map((i) => {
      const vat = round2((i.base * i.rate) / 100);
      const held = round2((i.base * (i.withheldRate ?? 0)) / 100);
      const note =
        i.kind === 'exempt'
          ? 'Exenta art. 20 LIVA'
          : i.tax === 'IGIC'
          ? 'IGIC (Canarias), no IVA'
          : '';
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
        note,
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
      'Recargo de equivalencia',
      'Importe retenido IRPF',
      'Total factura',
      'Nota',
    ],
    ...list.map((i) => {
      const vat = round2((i.base * i.rate) / 100);
      const re = i.reAmount ?? 0;
      const note =
        i.isp === 'eu'
          ? 'Inversión del sujeto pasivo (UE)'
          : i.isp === 'noneu'
          ? 'Inversión del sujeto pasivo (fuera de la UE)'
          : i.tax === 'IGIC'
          ? 'IGIC (Canarias)'
          : '';
      return [
        { date: i.date },
        i.number,
        i.supplier as string,
        i.nif,
        i.base,
        i.rate,
        vat,
        re,
        i.retention ?? 0,
        round2(i.base + vat + re),
        note,
      ];
    }),
  ];
  return buildXlsx([{ name: 'Facturas recibidas', rows }], { sharedStrings: true });
}

function bankBook(
  p: Persona,
  moves: { date: string; concept: string; amount: number }[]
): Uint8Array {
  let balance = 15000;
  const sorted = [...moves].sort((a, b) => a.date.localeCompare(b.date));
  const rows: XlsxCell[][] = [
    [`Banco Ficticio · extracto de la cuenta ${p.iban} (inventada)`],
    [],
    ['Fecha', 'Concepto', 'Importe', 'Saldo'],
    ...sorted.map((m) => {
      balance = round2(balance + m.amount);
      return [{ date: m.date }, m.concept, m.amount, balance];
    }),
  ];
  return buildXlsx([{ name: 'Movimientos', rows }], { sharedStrings: true });
}

/** The payroll credits of the year, one per payer and month worked. */
function payrollMoves(pagadores: Payer[]) {
  const moves: { date: string; concept: string; amount: number }[] = [];
  pagadores.forEach((pay, i) => {
    const months =
      pagadores.length > 1 && !pay.nif.startsWith('Q')
        ? Math.max(1, Math.round((12 * pay.gross) / pagadores.reduce((s, x) => s + x.gross, 0)))
        : 12;
    const first =
      pagadores.length > 1
        ? 1 +
          pagadores
            .slice(0, i)
            .reduce(
              (s, x) =>
                s +
                Math.max(
                  1,
                  Math.round((12 * x.gross) / pagadores.reduce((t, y) => t + y.gross, 0))
                ),
              0
            )
        : 1;
    const net = round2((pay.gross - pay.ss - pay.withheld) / months);
    for (let m = 0; m < months; m++) {
      const month = pay.nif.startsWith('Q') ? m + 1 : Math.min(12, first + m);
      moves.push({
        date: `2025-${String(month).padStart(2, '0')}-28`,
        concept: `Nómina o pensión · ${pay.name}`,
        amount: net,
      });
    }
  });
  return moves;
}

async function filledModel(
  build: () => Promise<Uint8Array>,
  quarter: number,
  rows: Rows
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await build());
  const form = doc.getForm();
  form.getTextField('dato.ejercicio').setText('2026');
  form.getTextField('dato.periodo').setText(`${quarter}T`);
  const boxes = Object.fromEntries(rows.map(([box, , amount]) => [box, amount]));
  for (const field of form.getFields()) {
    const box = field.getName().replace('dato.', '');
    if (box in boxes) form.getTextField(field.getName()).setText(money(boxes[box]));
  }
  return doc.save();
}

async function selfCheck(p: Persona, bytes: Uint8Array, lines: string[]): Promise<string | null> {
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
  if (reading.ccaaId !== p.comunidad)
    return `${p.slug}: el lector lee la comunidad ${reading.ccaaId}`;
  return reading.gross === gross ? null : `${p.slug}: el lector da ${reading.gross} y no ${gross}`;
}

const KEY_BOXES = ['0435', '0500', '0545', '0546', '0595', '0670', '71', '19', '30', '05'];

function leeme(p: Persona, shown: string, figures: Figure[], files: string[]): string {
  const key = figures.filter(
    (f) => f.origen !== 'pendiente' && f.importe !== null && KEY_BOXES.includes(f.casilla ?? '')
  );
  const pending = figures.filter((f) => f.origen === 'pendiente');
  return [
    `${shown} · ${p.titulo}`,
    '',
    'DATOS INVENTADOS para probar Finanverso. Simulación orientativa: no es el modelo oficial.',
    `Dentro de los PDF aparece el nombre técnico «${p.nombre}»: es la misma persona. Caso del banco: ${p.slug}.`,
    '',
    p.descripcion,
    '',
    'Qué prueba:',
    ...p.prueba.map((t) => `  - ${t}`),
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
    ...(pending.length
      ? [
          '',
          'Pendiente (Finanverso aún no lo calcula o no está confirmado):',
          ...pending.map((f) => `  - ${f.concepto}: ${f.motivo}`),
        ]
      : []),
    ...(p.alcance === 'fuera' ? ['', `Fuera de alcance: ${p.motivoFueraDeAlcance}`] : []),
    '',
    'Cómo probarlo: Renta → «Importar borrador» con borrador-renta-2025.pdf; Autónomos → «Importar facturas»',
    'con los Excel, y «Importar modelo presentado» con los 130, 303, 111 y 115 en PDF.',
    '',
  ].join('\n');
}

/** The number of a persona from its slug (p3-100-… → 100). */
const numberOf = (slug: string) => Number((/^p\d+-(\d+)-/.exec(slug) as RegExpExecArray)[1]);

async function main() {
  // CASOS_PREFIX=p3 builds the third batch the same way (default: p2).
  const prefix = process.env.CASOS_PREFIX ?? 'p2';
  const names: Record<string, string> = existsSync(join(PRIVATE, `nombres-${prefix}.json`))
    ? JSON.parse(readFileSync(join(PRIVATE, `nombres-${prefix}.json`), 'utf8'))
    : {};
  const slugs = readdirSync(PEOPLE).filter(
    (s) => s.startsWith(`${prefix}-`) && existsSync(join(PEOPLE, s, 'persona.json'))
  );
  const problems: string[] = [];
  const index: string[] = [];
  let count = 0;
  for (const slug of slugs.sort((a, b) => numberOf(a) - numberOf(b))) {
    const dir = join(PEOPLE, slug);
    const p = JSON.parse(readFileSync(join(dir, 'persona.json'), 'utf8')) as Persona;
    const figures = (
      JSON.parse(readFileSync(join(dir, 'esperado.json'), 'utf8')) as { cifras: Figure[] }
    ).cifras;
    const docs = join(dir, 'documentos');
    mkdirSync(docs, { recursive: true });
    const out: Record<string, Uint8Array> = {};
    const doc = p.documentos;
    out['ficha-persona.pdf'] = await sheetPdf(p);
    if (doc.borrador) {
      const { bytes, lines } = await draftPdf(p);
      out['borrador-renta-2025.pdf'] = bytes;
      const problem = await selfCheck(p, bytes, lines);
      if (problem) problems.push(problem);
    }
    for (const [i, pay] of (doc.pagadores ?? []).entries())
      out[`certificado-retenciones-2025-pagador-${i + 1}.pdf`] = await certificatePdf(p, pay);
    const job = (doc.pagadores ?? []).find((x) => !x.nif.startsWith('Q') && x.ss > 0);
    if (job) out['nomina-diciembre-2025.pdf'] = await payslipPdf(p, job);
    if (doc.ahorro?.length) out['informacion-fiscal-banco-2025.pdf'] = await savingsPdf(p);
    if (doc.actividad?.length)
      out['datos-actividad-agraria-2025.pdf'] = await activityPdf(p, doc.actividad);
    if (doc.pagadores?.length)
      out['extracto-banco-2025.xlsx'] = bankBook(p, payrollMoves(doc.pagadores));
    const issued = doc.emitidas ?? [];
    if (issued.length) {
      out['facturas-emitidas-2026.xlsx'] = issuedBook(issued);
      out['facturas-recibidas-2026.xlsx'] = receivedBook(doc.recibidas ?? []);
      out['extracto-banco-2026.xlsx'] = bankBook(p, doc.banco ?? []);
      out[`factura-${issued[0].number}.pdf`] = await invoicePdf(p, issued[0]);
      const other = issued
        .slice(1)
        .find((i) => i.kind !== issued[0].kind || i.withheldRate !== issued[0].withheldRate);
      if (other) out[`factura-${other.number}.pdf`] = await invoicePdf(p, other);
      for (const q of [1, 2]) {
        const pick = (list: Rows[] | undefined) => (list ?? [])[q - 1] ?? [];
        if (pick(doc.m130).length)
          out[`modelo-130-${q}T-2026-presentado.pdf`] = await filledModel(
            model130,
            q,
            pick(doc.m130)
          );
        if (pick(doc.m303).length)
          out[`modelo-303-${q}T-2026-presentado.pdf`] = await filledModel(
            model303,
            q,
            pick(doc.m303)
          );
        if (pick(doc.m111).length)
          out[`modelo-111-${q}T-2026-presentado.pdf`] = await filledModel(
            model111,
            q,
            pick(doc.m111)
          );
        if (pick(doc.m115).length)
          out[`modelo-115-${q}T-2026-presentado.pdf`] = await filledModel(
            model115,
            q,
            pick(doc.m115)
          );
      }
    }
    out['resumen-casillas.pdf'] = await summaryPdf(p, figures);
    const n = String(numberOf(slug));
    const shown = names[String(Number(n))] ?? p.nombre;
    const copy = join(PRIVATE, `${n} - ${shown}`);
    mkdirSync(copy, { recursive: true });
    for (const [name, bytes] of Object.entries(out)) {
      writeFileSync(join(docs, name), bytes);
      writeFileSync(join(copy, name), bytes);
      if (bytes.length > 300 * 1024) problems.push(`${slug}/${name}: ${bytes.length} bytes`);
      count++;
    }
    const files = Object.keys(out);
    const text = leeme(p, shown, figures, files);
    writeFileSync(join(copy, 'LEEME.txt'), text);
    writeFileSync(join(copy, 'INDICE.txt'), text);
    index.push(`${n} - ${shown}   [${files.length} archivos]  — ${p.titulo}`);
  }
  // The owner's index of every persona: each batch has its own block, replaced on every run.
  const all = join(PRIVATE, 'INDICE.txt');
  if (existsSync(all)) {
    const marker = prefix === 'p2' ? '--- Segunda tanda (p2) ---' : `--- Tanda ${prefix} ---`;
    const blocks = readFileSync(all, 'utf8').split(/\n(?=--- )/);
    const kept = blocks.filter((b) => !b.startsWith(marker)).map((b) => b.replace(/\s+$/, ''));
    writeFileSync(all, `${[...kept, `${marker}\n${index.join('\n')}`].join('\n\n')}\n`);
  }
  console.log(`${count} documentos para ${slugs.length} personas ${prefix}; copia en ${PRIVATE}`);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exitCode = 1;
  }
}

void main();
