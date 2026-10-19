import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

/**
 * The fillable PDFs of the modelos 130, 303, 390, 349, 111 and 115 that the app offers as templates. They
 * follow the layout of the official forms where it matters to the reader: the box number printed first
 * and, to its right, the field for its amount, one box per line (the 349, one operator per line). Fill
 * them in any PDF viewer and upload them in Autónomos. The boxes of the 303 are those of its 2026 record
 * design and the ones of the 390 those of the 2025 one (backend autonomo-vat-data.ts).
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
  let page = doc.addPage([WIDTH, HEIGHT]);
  let y = title(page, bold, headTitle);
  /** A new page when the next line would not fit (the long forms take two or three). */
  const room = (needed: number) => {
    if (y - needed >= MARGIN + 6) return;
    footer(page, font);
    page = doc.addPage([WIDTH, HEIGHT]);
    y = HEIGHT - MARGIN - 10;
  };

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
      room(ROW * 2);
      y -= 6;
      page.drawText(row, { x: MARGIN, y: y + 4, size: 9.5, font: bold, color: rgb(0.1, 0.2, 0.5) });
      y -= ROW - 4;
      continue;
    }
    room(ROW);
    drawRow(page, font, bold, form, row, y);
    y -= ROW;
  }
  footer(page, font);
  for (const [name, value] of Object.entries(filled)) form.getTextField(name).setText(value);
  return doc.save();
}

function footer(page: PDFPage, font: PDFFont) {
  page.drawText(
    'Plantilla de Finanverso (finanverso.app). Datos orientativos: no es el modelo oficial ni sirve para presentarlo.',
    { x: MARGIN, y: MARGIN - 10, size: 7.5, font, color: GREY }
  );
}

export const model130 = (filled?: Filled) =>
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
    ],
    filled
  );

const r = (box: string, label: string): Row => ({ box, label });

/** The 303 of 2026 for a sole trader in the general regime: every box it can need, as the form groups them. */
export const model303 = (filled?: Filled) =>
  build(
    [
      'Modelo 303 · plantilla de Finanverso',
      'Impuesto sobre el Valor Añadido',
      'Autoliquidación · Régimen general (diseño de 2026)',
    ],
    [
      'Escribe cada importe en euros, con o sin decimales. Las bases y las cuotas son las del trimestre, sin acumular.',
      'Finanverso lee todas las casillas: ventas por tipo, recargo, adquisiciones intracomunitarias, deducciones y resultado.',
    ],
    [
      'IVA devengado · régimen general',
      r('150', 'Base imponible al 0 %'),
      r('01', 'Base imponible al 4 %'),
      r('03', 'Cuota al 4 %'),
      r('04', 'Base imponible al 10 %'),
      r('06', 'Cuota al 10 %'),
      r('07', 'Base imponible al 21 %'),
      r('09', 'Cuota al 21 %'),
      r('10', 'Adquisiciones intracomunitarias de bienes y servicios: base'),
      r('11', 'Adquisiciones intracomunitarias de bienes y servicios: cuota'),
      r('12', 'Otras operaciones con inversión del sujeto pasivo: base'),
      r('13', 'Otras operaciones con inversión del sujeto pasivo: cuota'),
      r('14', 'Modificación de bases'),
      r('15', 'Modificación de cuotas'),
      'Recargo de equivalencia',
      r('156', 'Recargo al 1,75 %: base'),
      r('158', 'Recargo al 1,75 %: cuota'),
      r('168', 'Recargo al 0,5 %: base'),
      r('170', 'Recargo al 0,5 %: cuota'),
      r('19', 'Recargo al 1,4 %: base'),
      r('21', 'Recargo al 1,4 %: cuota'),
      r('22', 'Recargo al 5,2 %: base'),
      r('24', 'Recargo al 5,2 %: cuota'),
      r('25', 'Modificaciones del recargo: base'),
      r('26', 'Modificaciones del recargo: cuota'),
      r('27', 'Total cuota devengada'),
      'IVA deducible',
      r('28', 'Operaciones interiores corrientes: base'),
      r('29', 'Operaciones interiores corrientes: cuota'),
      r('30', 'Operaciones interiores con bienes de inversión: base'),
      r('31', 'Operaciones interiores con bienes de inversión: cuota'),
      r('32', 'Importaciones de bienes corrientes: base'),
      r('33', 'Importaciones de bienes corrientes: cuota'),
      r('34', 'Importaciones de bienes de inversión: base'),
      r('35', 'Importaciones de bienes de inversión: cuota'),
      r('36', 'Adquisiciones intracomunitarias de bienes y servicios corrientes: base'),
      r('37', 'Adquisiciones intracomunitarias de bienes y servicios corrientes: cuota'),
      r('38', 'Adquisiciones intracomunitarias de bienes de inversión: base'),
      r('39', 'Adquisiciones intracomunitarias de bienes de inversión: cuota'),
      r('40', 'Rectificación de deducciones: base'),
      r('41', 'Rectificación de deducciones: cuota'),
      r('42', 'Compensaciones del régimen especial de agricultura, ganadería y pesca'),
      r('43', 'Regularización de bienes de inversión'),
      r('44', 'Regularización por aplicación del porcentaje definitivo de prorrata'),
      r('45', 'Total a deducir'),
      r('46', 'Resultado régimen general (27 - 45)'),
      'Información adicional',
      r('59', 'Entregas intracomunitarias de bienes y servicios'),
      r('60', 'Exportaciones y operaciones asimiladas'),
      r('120', 'Operaciones no sujetas por reglas de localización (salvo las de la 123)'),
      r('122', 'Operaciones sujetas con inversión del sujeto pasivo'),
      r('123', 'No sujetas por localización acogidas a la ventanilla única'),
      r('124', 'Sujetas y acogidas a la ventanilla única'),
      r('62', 'Criterio de caja: base de las entregas (regla general)'),
      r('63', 'Criterio de caja: cuota de las entregas (regla general)'),
      r('74', 'Criterio de caja: base de las adquisiciones'),
      r('75', 'Criterio de caja: cuota de las adquisiciones'),
      'Resultado',
      r('76', 'Regularización de cuotas del art. 80.Cinco.5.ª LIVA'),
      r('64', 'Suma de resultados (46 + 58 + 76)'),
      r('66', 'Atribuible a la Administración del Estado'),
      r('77', 'IVA a la importación liquidado por la Aduana pendiente de ingreso'),
      r('110', 'Cuotas a compensar pendientes de periodos anteriores'),
      r('78', 'Cuotas a compensar de periodos anteriores aplicadas en este periodo'),
      r('87', 'Cuotas a compensar pendientes para periodos posteriores (110 - 78)'),
      r('69', 'Resultado de la autoliquidación (66 + 77 - 78)'),
      r('71', 'Resultado de la liquidación'),
      r('72', 'A compensar'),
      r('73', 'A devolver'),
    ],
    filled
  );

/** The 390 (2025 design): the boxes a sole trader in the general regime fills in, section by section. */
export const model390 = (filled?: Filled) =>
  build(
    [
      'Modelo 390 · plantilla de Finanverso',
      'Impuesto sobre el Valor Añadido',
      'Declaración-resumen anual (diseño de 2025)',
    ],
    [
      'El período es el año entero: escribe 0A o déjalo vacío. Importes del año, en euros.',
      'Finanverso usa el 390 del año pasado: su prorrata definitiva (118) y lo que quedó a compensar (97 y 662).',
    ],
    [
      '5. Régimen general · IVA devengado',
      r('700', 'Régimen ordinario al 0 %: base'),
      r('01', 'Régimen ordinario al 4 %: base'),
      r('02', 'Régimen ordinario al 4 %: cuota'),
      r('03', 'Régimen ordinario al 10 %: base'),
      r('04', 'Régimen ordinario al 10 %: cuota'),
      r('05', 'Régimen ordinario al 21 %: base'),
      r('06', 'Régimen ordinario al 21 %: cuota'),
      r('25', 'Adquisiciones intracomunitarias de bienes al 21 %: base'),
      r('26', 'Adquisiciones intracomunitarias de bienes al 21 %: cuota'),
      r('551', 'Adquisiciones intracomunitarias de servicios al 21 %: base'),
      r('552', 'Adquisiciones intracomunitarias de servicios al 21 %: cuota'),
      r('27', 'Otros supuestos de inversión del sujeto pasivo: base'),
      r('28', 'Otros supuestos de inversión del sujeto pasivo: cuota'),
      r('29', 'Modificación de bases'),
      r('30', 'Modificación de cuotas'),
      r('33', 'Total bases imponibles'),
      r('34', 'Total cuotas'),
      r('601', 'Recargo de equivalencia al 5,2 %: base'),
      r('602', 'Recargo de equivalencia al 5,2 %: cuota'),
      r('47', 'Total cuotas de IVA y recargo de equivalencia'),
      'IVA deducible',
      r('605', 'Operaciones interiores corrientes al 21 %: base'),
      r('606', 'Operaciones interiores corrientes al 21 %: cuota'),
      r('49', 'Total operaciones interiores corrientes: cuota'),
      r('51', 'Total operaciones interiores con bienes de inversión: cuota'),
      r('53', 'Total importaciones de bienes corrientes: cuota'),
      r('57', 'Total adquisiciones intracomunitarias de bienes corrientes: cuota'),
      r('598', 'Total adquisiciones intracomunitarias de servicios: cuota'),
      r('62', 'Rectificación de deducciones: cuota'),
      r('63', 'Regularización de bienes de inversión'),
      r('522', 'Regularización por aplicación del porcentaje definitivo de prorrata'),
      r('64', 'Suma de deducciones'),
      r('65', 'Resultado régimen general (47 - 64)'),
      '7. Resultado de la liquidación anual',
      r('84', 'Suma de resultados'),
      r('85', 'Compensación de cuotas del ejercicio anterior'),
      r('86', 'Resultado de la liquidación'),
      '9. Resultado de las liquidaciones',
      r('95', 'Total resultados a ingresar en las autoliquidaciones del ejercicio'),
      r('97', 'Resultado del último periodo a compensar'),
      r('98', 'Resultado del último periodo a devolver'),
      r('662', 'Cuotas pendientes de compensación generadas en el ejercicio, distintas de la 97'),
      '10. Volumen de operaciones',
      r('99', 'Operaciones en régimen general'),
      r('103', 'Entregas intracomunitarias de bienes y servicios'),
      r('104', 'Exportaciones y otras operaciones exentas con derecho a deducción'),
      r('105', 'Operaciones exentas sin derecho a deducción'),
      r('108', 'Total volumen de operaciones'),
      '12. Prorrata',
      r('115', 'Importe total de las operaciones'),
      r('116', 'Importe de las operaciones con derecho a deducción'),
      r('118', '% de prorrata definitivo'),
    ],
    filled
  );

/** One operator of the 349 as the template takes it (all text). */
export interface Operator349 {
  vatId: string;
  name: string;
  key: string;
  base: string;
  /** A correction: the year and quarter it corrects and the base declared then. */
  year?: string;
  period?: string;
  previous?: string;
}

/**
 * The 349: the VAT number, the name, the key and the base of each operator, one per line, and the
 * corrections of earlier periods below with their year, quarter and the base declared before.
 */
export async function model349(
  filled: {
    year?: string;
    period?: string;
    operators?: Operator349[];
    rectifications?: Operator349[];
  } = {}
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const form = doc.getForm();
  const page = doc.addPage([WIDTH, HEIGHT]);
  let y = title(page, bold, [
    'Modelo 349 · plantilla de Finanverso',
    'Declaración recapitulativa de operaciones intracomunitarias',
    'Una línea por operador y clave (E, A, T, S, I, M, H, R, D, C)',
  ]);
  const field = (name: string, x: number, width: number, value?: string) => {
    const f = form.createTextField(name);
    f.addToPage(page, { x, y: y + 2, width, height: 15, borderWidth: 0.6, borderColor: GREY });
    f.setFontSize(8.5);
    if (value) f.setText(value);
  };
  page.drawText('Ejercicio', { x: MARGIN, y: y + 4, size: 9, font: bold });
  field('dato.ejercicio', 100, 50, filled.year);
  page.drawText('Período', { x: 175, y: y + 4, size: 9, font: bold });
  field('dato.periodo', 225, 50, filled.period);
  y -= ROW + 8;
  const head = (labels: [string, number][]) => {
    for (const [label, x] of labels)
      page.drawText(label, { x, y: y + 4, size: 8, font: bold, color: GREY });
    y -= ROW - 6;
  };
  page.drawText('Operadores intracomunitarios', {
    x: MARGIN,
    y: y + 4,
    size: 9.5,
    font: bold,
    color: rgb(0.1, 0.2, 0.5),
  });
  y -= ROW - 4;
  head([
    ['NIF-IVA', MARGIN],
    ['Nombre o razón social', 150],
    ['Clave', 360],
    ['Base imponible', 410],
  ]);
  for (let i = 0; i < 10; i++) {
    const o = filled.operators?.[i];
    field(`op.${i}.nif`, MARGIN, 105, o?.vatId);
    field(`op.${i}.nombre`, 150, 200, o?.name);
    field(`op.${i}.clave`, 360, 30, o?.key);
    field(`op.${i}.base`, 410, 100, o?.base);
    y -= ROW - 2;
  }
  y -= 10;
  page.drawText('Rectificaciones de periodos anteriores', {
    x: MARGIN,
    y: y + 4,
    size: 9.5,
    font: bold,
    color: rgb(0.1, 0.2, 0.5),
  });
  y -= ROW - 4;
  head([
    ['NIF-IVA', MARGIN],
    ['Nombre', 150],
    ['Clave', 270],
    ['Ejercicio', 305],
    ['Periodo', 355],
    ['Base rectificada', 400],
    ['Base anterior', 480],
  ]);
  for (let i = 0; i < 5; i++) {
    const o = filled.rectifications?.[i];
    field(`rect.${i}.nif`, MARGIN, 105, o?.vatId);
    field(`rect.${i}.nombre`, 150, 110, o?.name);
    field(`rect.${i}.clave`, 270, 28, o?.key);
    field(`rect.${i}.ejercicio`, 305, 42, o?.year);
    field(`rect.${i}.periodo`, 355, 38, o?.period);
    field(`rect.${i}.base`, 400, 72, o?.base);
    field(`rect.${i}.anterior`, 480, 72, o?.previous);
    y -= ROW - 2;
  }
  y -= 6;
  for (const line of [
    'Base con decimales (3344,55). El NIF-IVA empieza por el código del país (FR, DE, PT…). Una rectificación',
    'lleva el nuevo total del periodo que corrige y lo que se declaró entonces (no la diferencia).',
  ]) {
    page.drawText(line, { x: MARGIN, y, size: 8, font, color: GREY });
    y -= 11;
  }
  footer(page, font);
  return doc.save();
}

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
