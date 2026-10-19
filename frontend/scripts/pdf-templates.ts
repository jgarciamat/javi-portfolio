import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

/**
 * The fillable PDFs of the modelos 130, 303, 111 and 115 that the app offers as templates. They follow the layout
 * of the official forms where it matters to the reader: the box number printed first and, to its right,
 * the field for its amount, one box per line. Fill them in any PDF viewer and upload them in Autónomos.
 */

interface Row {
  /** Box number, as printed on the form. */
  box: string;
  label: string;
}

const MARGIN = 40;
const WIDTH = 595;
const HEIGHT = 842;
const ROW = 22;
const LABEL_SIZE = 8.5;
const BOX_X = 405;
const FIELD_X = 432;
const FIELD_W = 123;

const GREY = rgb(0.35, 0.4, 0.5);

function title(page: PDFPage, bold: PDFFont, lines: string[]): number {
  let y = HEIGHT - MARGIN;
  lines.forEach((line, i) => {
    page.drawText(line, {
      x: MARGIN,
      y,
      size: i === 0 ? 15 : 9.5,
      font: bold,
      color: i === 0 ? rgb(0.1, 0.2, 0.5) : GREY,
    });
    y -= i === 0 ? 20 : 13;
  });
  return y - 14;
}

/** One line: the label on the left, the box number, then the field where its amount goes. */
function drawRow(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  form: ReturnType<PDFDocument['getForm']>,
  row: Row,
  y: number
) {
  page.drawText(row.label, {
    x: MARGIN,
    y: y + 4,
    size: LABEL_SIZE,
    font,
    maxWidth: BOX_X - MARGIN - 8,
  });
  page.drawText(row.box, { x: BOX_X, y: y + 4, size: 9, font: bold, color: rgb(0.1, 0.2, 0.5) });
  const field = form.createTextField(`dato.${row.box}`);
  // The field sits a couple of points under the printed baseline, as in the official form.
  field.addToPage(page, {
    x: FIELD_X,
    y: y + 2,
    width: FIELD_W,
    height: 15,
    borderWidth: 0.6,
    borderColor: GREY,
  });
  field.setFontSize(9);
}

/** What to write in the fields (`dato.01`, `dato.ejercicio`…), to make the filled examples. */
export type Filled = Record<string, string>;

async function build(
  headTitle: string[],
  intro: string[],
  rows: (Row | string)[],
  filled: Filled = {}
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const form = doc.getForm();
  const page = doc.addPage([WIDTH, HEIGHT]);
  let y = title(page, bold, headTitle);

  // Year and quarter: the label first, the field to its right, like «Ejercicio ... Período ... T».
  page.drawText('Ejercicio', { x: MARGIN, y: y + 4, size: 9, font: bold });
  form.createTextField('dato.ejercicio').addToPage(page, {
    x: 100,
    y: y + 2,
    width: 50,
    height: 15,
    borderWidth: 0.6,
    borderColor: GREY,
  });
  page.drawText('Período', { x: 175, y: y + 4, size: 9, font: bold });
  form.createTextField('dato.periodo').addToPage(page, {
    x: 225,
    y: y + 2,
    width: 50,
    height: 15,
    borderWidth: 0.6,
    borderColor: GREY,
  });
  page.drawText('(1, 2, 3 o 4 · también vale 1T)', {
    x: 285,
    y: y + 4,
    size: 8,
    font,
    color: GREY,
  });
  y -= ROW + 6;

  for (const line of intro) {
    page.drawText(line, {
      x: MARGIN,
      y,
      size: 8.5,
      font,
      color: GREY,
      maxWidth: WIDTH - 2 * MARGIN,
    });
    y -= 12;
  }
  y -= 8;
  for (const row of rows) {
    if (typeof row === 'string') {
      y -= 6;
      page.drawText(row, { x: MARGIN, y: y + 4, size: 9.5, font: bold, color: rgb(0.1, 0.2, 0.5) });
      y -= ROW - 4;
      continue;
    }
    drawRow(page, font, bold, form, row, y);
    y -= ROW;
  }
  page.drawText(
    'Plantilla de Finanverso (finanverso.app). Datos orientativos: no es el modelo oficial ni sirve para presentarlo.',
    {
      x: MARGIN,
      y: MARGIN - 10,
      size: 7.5,
      font,
      color: GREY,
    }
  );
  for (const [name, value] of Object.entries(filled)) form.getTextField(name).setText(value);
  return doc.save();
}

export const model130 = () =>
  build(
    [
      'Modelo 130 · plantilla de Finanverso',
      'Impuesto sobre la Renta de las Personas Físicas',
      'Actividades económicas en estimación directa · Pago fraccionado',
    ],
    [
      'Escribe cada importe en euros, con o sin decimales (5300 o 5.300,00). Los importes son acumulados desde el 1 de enero.',
      'Finanverso lee las casillas 01, 02, 05, 06 y 07 para pasar al trimestre siguiente; el resto es para que cuadre el modelo.',
    ],
    [
      'I. Actividades económicas en estimación directa',
      { box: '01', label: 'Ingresos computables del conjunto de las actividades' },
      { box: '02', label: 'Gastos fiscalmente deducibles del conjunto de las actividades' },
      { box: '03', label: 'Rendimiento neto (01 - 02)' },
      { box: '04', label: '20 por 100 de la casilla 03, si es positiva' },
      {
        box: '05',
        label: 'De trimestres anteriores: suma de las casillas 07 positivas menos la 16',
      },
      {
        box: '06',
        label: 'Retenciones e ingresos a cuenta soportados (acumulados del año)',
      },
      { box: '07', label: 'Pago fraccionado previo del trimestre (04 - 05 - 06)' },
      'III. Total liquidación',
      {
        box: '12',
        label: 'Suma de pagos fraccionados previos del trimestre (07 + 11), mínimo 0',
      },
      { box: '13', label: 'Minoración por aplicación de la deducción del artículo 80 bis' },
      { box: '14', label: 'Diferencia (12 - 13)' },
      { box: '15', label: 'Resultados negativos de trimestres anteriores' },
      {
        box: '16',
        label: 'Por préstamos de vivienda habitual (2 % de la 03, máximo 660,14 €)',
      },
      { box: '17', label: 'Total (14 - 15 - 16)' },
      { box: '19', label: 'Resultado de la declaración' },
    ]
  );

export const model303 = () =>
  build(
    [
      'Modelo 303 · plantilla de Finanverso',
      'Impuesto sobre el Valor Añadido',
      'Autoliquidación · Régimen general',
    ],
    [
      'Escribe cada importe en euros, con o sin decimales. Las bases y las cuotas son las del trimestre, sin acumular.',
      'Finanverso lee los ingresos por tipo (01, 04, 07), las exentas (59, 60) y los gastos de operaciones corrientes (28, 29).',
    ],
    [
      'IVA devengado',
      { box: '01', label: 'Base imponible al 4 %' },
      { box: '03', label: 'Cuota al 4 %' },
      { box: '04', label: 'Base imponible al 10 %' },
      { box: '06', label: 'Cuota al 10 %' },
      { box: '07', label: 'Base imponible al 21 %' },
      { box: '09', label: 'Cuota al 21 %' },
      { box: '27', label: 'Total cuota devengada' },
      'IVA deducible',
      { box: '28', label: 'Base de cuotas soportadas en operaciones interiores corrientes' },
      { box: '29', label: 'Cuota soportada en operaciones interiores corrientes' },
      { box: '45', label: 'Total a deducir' },
      { box: '46', label: 'Resultado régimen general (27 - 45)' },
      'Otras operaciones',
      { box: '59', label: 'Entregas intracomunitarias de bienes y servicios (base)' },
      { box: '60', label: 'Exportaciones y operaciones asimiladas (base)' },
      { box: '71', label: 'Resultado de la autoliquidación' },
    ]
  );

// Boxes and labels of the 111 and the 115 as the AEAT instructions and record layouts give them
// (checked on 19 October 2026; sources in src/modules/finances/domain/withholdings.ts).
export const model111 = (filled?: Filled) =>
  build(
    [
      'Modelo 111 · plantilla de Finanverso',
      'Retenciones e ingresos a cuenta. Rendimientos del trabajo y de actividades económicas,',
      'premios y determinadas ganancias patrimoniales e imputaciones de renta · Autoliquidación',
    ],
    [
      'Escribe los importes del trimestre en euros (7500 o 7.500,00) y el número de perceptores sin decimales.',
      'Finanverso lee los empleados (01-06) y los profesionales (07-09); el resto es para que cuadre el modelo.',
    ],
    [
      'I. Rendimientos del trabajo · dinerarios',
      { box: '01', label: 'N.º perceptores' },
      { box: '02', label: 'Importe de las percepciones' },
      { box: '03', label: 'Importe de las retenciones' },
      'Rendimientos del trabajo · en especie',
      { box: '04', label: 'N.º perceptores' },
      { box: '05', label: 'Valor percepciones en especie' },
      { box: '06', label: 'Importe de los ingresos a cuenta' },
      'II. Rendimientos de actividades económicas · dinerarios',
      { box: '07', label: 'N.º perceptores' },
      { box: '08', label: 'Importe de las percepciones' },
      { box: '09', label: 'Importe de las retenciones' },
      'Total liquidación',
      { box: '28', label: 'Suma de retenciones e ingresos a cuenta' },
      { box: '29', label: 'Resultado de anteriores declaraciones (solo complementaria)' },
      { box: '30', label: 'Resultado a ingresar (28 - 29)' },
    ],
    filled
  );

export const model115 = (filled?: Filled) =>
  build(
    [
      'Modelo 115 · plantilla de Finanverso',
      'Retenciones e ingresos a cuenta. Rentas o rendimientos procedentes del',
      'arrendamiento o subarrendamiento de inmuebles urbanos · Autoliquidación',
    ],
    [
      'Escribe los importes del trimestre en euros y el número de arrendadores sin decimales.',
      'La base es todo lo pagado al arrendador sin el IVA; la retención general es el 19 %.',
    ],
    [
      'Liquidación',
      { box: '01', label: 'Número de perceptores' },
      { box: '02', label: 'Base de las retenciones e ingresos a cuenta' },
      { box: '03', label: 'Retenciones e ingresos a cuenta' },
      { box: '04', label: 'Resultado de anteriores declaraciones (solo complementaria)' },
      { box: '05', label: 'Resultado a ingresar (03 - 04)' },
    ],
    filled
  );
