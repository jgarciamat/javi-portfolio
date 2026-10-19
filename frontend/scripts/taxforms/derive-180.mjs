/**
 * The modelo 180 has no facsimile with text: the BOE of 2000 (Orden de 20-11-2000, BOE-A-2000-21430,
 * anexo V, págs. 28-29) is a scan. Its layout is rebuilt on the one of its sibling, the 190 of the same
 * family of forms (BOE-A-2009-18567), with what the scan of the 180 prints: the summary with boxes
 * 01-03 (perceptores, base and withholdings) and the inner sheet of eight landlords (tax id of the
 * landlord and of the legal representative, name, province, modalidad, base, % and withholdings,
 * year of accrual) with the totals of the sheet. The places are approximate, and the preview says so.
 * Run after extract-layout.mjs has written 190.json:
 *
 *   node scripts/taxforms/derive-180.mjs && npx prettier --write src/modules/taxforms/data
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = join(process.cwd(), 'src', 'modules', 'taxforms', 'data');
const m190 = JSON.parse(readFileSync(join(dir, '190.json'), 'utf8'));
const [summary, inner] = m190.pages;

// Colours of the 190: 1 the shadow of a cell, 2 the grey of a block, 3 the white cell, 4 the rules.
const SHADOW = 1;
const BLOCK = 2;
const WHITE = 3;
const RULE = 4;

/** Bold Helvetica takes about 0.56 of its size per letter: where a label ends. */
const endOf = (x, text, size) => x + text.length * size * 0.56;

/** Dots from the end of a label to the box number of its line. */
const dots = (x, y, size, to) => [x, y, size, 0, '.'.repeat(200), Math.max(4, to - x - 3)];

// ─── Summary ─────────────────────────────────────────────────────────────────

const SUMMARY_TEXT = {
  'Retenciones e ingresos a cuenta del IRPF': 'Retenciones e ingresos a cuenta',
  'Rendimientos del trabajo y de actividades económicas, premios y':
    'Rendimientos procedentes del arrendamiento o subarrendamiento',
  'determinadas ganancias patrimoniales e imputaciones de renta':
    'de inmuebles urbanos (IRPF, IS e IRNR con establecimiento permanente)',
  190: '180',
  'Número total de percepciones relacionadas en la declaración': 'Número total de perceptores',
  'Importe total de las percepciones relacionadas': 'Base retenciones e ingresos a cuenta',
  'Importe total de las retenciones e ingresos a cuenta relacionados':
    'Retenciones e ingresos a cuenta',
  'Declaración complementaria por inclusión de datos ................................':
    'Declaración complementaria .......................................................',
};
/** The footnote of box 01 and the second kind of complementary form are the 190's own. */
const dropped = (t) =>
  t[4] === '(1)' ||
  (t[1] > 360 && t[1] < 376) ||
  (Math.abs(t[1] - 262.7) < 0.5 && t[0] < 300) ||
  // The dots of the summary are drawn again for the shorter labels.
  (t[1] > 380 && t[1] < 430 && /^\.+$/.test(t[4]));
const COMPLEMENTARY = [
  'Si la presentación de esta declaración tiene por objeto incluir perceptores que, debiendo haber figurado en otra declaración del mismo ejercicio presentada',
  'anteriormente, hubieran sido completamente omitidos en la misma, marque con una "X" la casilla "Declaración complementaria".',
  'Cuando la presentación de esta declaración tenga por objeto anular y sustituir completamente a otra declaración anterior del mismo ejercicio en la cual se',
  'hubieran consignado datos inexactos o erróneos, indique su carácter de declaración sustitutiva marcando con una "X" la casilla correspondiente.',
  'En ambos casos, se hará constar el número de 13 dígitos identificativo de la declaración anterior.',
];
const summaryTexts = summary.t
  .filter((t) => !dropped(t) && !(t[1] > 289 && t[1] < 337 && t[0] < 100))
  .map((t) => (SUMMARY_TEXT[t[4]] ? [t[0], t[1], t[2], t[3], SUMMARY_TEXT[t[4]], t[5]] : t));
const resumen = [
  ['Número total de perceptores', 426.8, 458],
  ['Base retenciones e ingresos a cuenta', 407.7, 424],
  ['Retenciones e ingresos a cuenta', 388.5, 424],
];
for (const [label, y, to] of resumen) summaryTexts.push(dots(endOf(89, label, 5.6), y, 5.6, to));
COMPLEMENTARY.forEach((line, i) => summaryTexts.push([89, 336 - i * 9.3, 5.6, 0, line, 425]));

const summaryPage = {
  t: summaryTexts,
  // The checkbox of the second kind of complementary form goes with its words.
  r: summary.r.filter((r) => !(r[1] > 255 && r[1] < 268 && r[0] > 300 && r[0] < 385)),
  l: summary.l,
  b: summary.b,
};

// ─── Inner sheet ─────────────────────────────────────────────────────────────

const INNER_TEXT = {
  'Retenciones e ingresos a cuenta del IRPF': 'Retenciones e ingresos a cuenta. Arrendamientos',
  'Relación de percepciones': 'Relación de perceptores',
  190: '180',
  Percepciones: 'Base retenciones',
  'Consigne en estas dos casillas la suma de todas las percepciones y de todas las retenciones e ingresos a cuenta relacio-':
    'Consigne en estas dos casillas la suma de las bases y de las retenciones e ingresos a cuenta',
  'nadas en esta hoja': 'de los perceptores relacionados en esta hoja',
};
const keep = (y) => y > 660 || y < 120;
const head = inner.t
  .filter((t) => keep(t[1]))
  // A new text keeps the room it needs (Helvetica takes about half its size per letter).
  .map((t) => {
    const text = INNER_TEXT[t[4]];
    return text ? [t[0], t[1], t[2], t[3], text, Math.max(t[5] ?? 0, text.length * t[2] * 0.5)] : t;
  });

const BLOCKS = 8;
const TOP = 655;
const STEP = 66;
const cell = (x, y, w) => [
  [x + 1.7, y - 1.6, w, 9.6, SHADOW, -1, 0, 1],
  [x, y, w, 9.6, WHITE, -1, 0, 2],
];
const label = (x, y, text) => [x, y, 4.8, 0, text, null];
const ROW1 = [
  [89, 'nif', 'NIF del perceptor', 63.2],
  [158, 'nifrep', 'NIF del representante legal', 63.2],
  [226.9, 'nombre', 'Apellidos y nombre, razón social o denominación del perceptor', 244],
  [470, 'provincia', 'Provincia (Código)', 38.5],
];
const ROW2 = [
  [89, 'modalidad', 'Modalidad', 20],
  [125, 'base', 'Base retenciones e ingresos a cuenta', 90],
  [232, 'pct', '% retención', 30],
  [280, 'retenciones', 'Retenciones e ingresos a cuenta', 90],
  [470, 'devengo', 'Ejercicio devengo', 38.5],
];
const texts = [...head];
const rects = inner.r.filter((r) => keep(r[1]) && r[1] + r[3] < 760 && !(r[1] < 120 && r[3] > 100));
const lines = inner.l.filter((l) => keep(l[1]) && keep(l[3]));
const boxes = inner.b.filter((b) => b[0] === 'ejercicio');
for (let k = 1; k <= BLOCKS; k++) {
  const top = TOP - (k - 1) * STEP;
  rects.push([79.9, top - 60, 435.8, 62, BLOCK, -1, 0, 0]);
  texts.push([90.5, top - 1.6, 6.4, 1, `Perceptor ${k}`, null]);
  for (const [row, dy] of [
    [ROW1, 10],
    [ROW2, 34],
  ]) {
    for (const [x, id, text, w] of row) {
      texts.push(label(x, top - dy, text));
      rects.push(...cell(x, top - dy - 12, w));
      boxes.push([`${k}.${id}`, x + 1, top - dy - 12, w - 2, 9.6]);
    }
  }
}
boxes.push(['hoja.base', 342.8, 89.3, 61.2, 9.6], ['hoja.retenciones', 411.8, 89.3, 61.2, 9.6]);
lines.push([79.9, 120, 515.7, 120, RULE, 0.4, 0]);

const out = {
  model: '180',
  source:
    'Reconstruida sobre la del 190 (https://www.boe.es/boe/dias/2009/11/23/pdfs/BOE-A-2009-18567.pdf) con el contenido del 180 escaneado en https://www.boe.es/boe/dias/2000/11/28/pdfs/A41078-41132.pdf (Orden de 20-11-2000, anexo V, págs. 28-29)',
  approx: true,
  colors: m190.colors,
  pages: [summaryPage, { t: texts, r: rects, l: lines, b: boxes, rows: BLOCKS }],
};
writeFileSync(join(dir, '180.json'), `${JSON.stringify(out)}\n`);
console.log('180', out.pages.map((p) => p.b.length).join(' + '), 'boxes');
