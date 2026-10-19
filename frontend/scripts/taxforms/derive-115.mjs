/**
 * The modelo 115 has no facsimile with text (the BOE of 2000 is a scan) and no current fillable PDF:
 * its layout is the one of its sibling, the 111 of the same family of forms (header, devengo,
 * declarant, payment, signature), with the settlement of the 115 (boxes 01-05, as the record layout
 * DR115e15v13 numbers and names them). Run after extract-layout.mjs has written 111.json:
 *
 *   node scripts/taxforms/derive-115.mjs && npx prettier --write src/modules/taxforms/data
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = join(process.cwd(), 'src', 'modules', 'taxforms', 'data');
const m111 = JSON.parse(readFileSync(join(dir, '111.json'), 'utf8'));
const page = m111.pages[0];

/** The settlement of the 111 (sections I to V and its totals) is what the 115 replaces. */
const TOP = 545;
const BOTTOM = 224;
const inBlock = (y) => y > BOTTOM && y < TOP;

const TITLE = {
  'Retenciones e ingresos a cuenta del IRPF': 'Retenciones e ingresos a cuenta',
  'Rendimientos del trabajo y de actividades económicas, premios y':
    'Rendimientos procedentes del arrendamiento o subarrendamiento de inmuebles urbanos',
  'determinadas ganancias patrimoniales e imputaciones de renta':
    'IRPF, Impuesto sobre Sociedades e IRNR (establecimientos permanentes)',
  111: '115',
  30: '05',
};

const kept = page.t
  .filter((t) => !inBlock(t[1]) || (t[0] < 95 && t[3] & 2))
  // The title keeps the room of the 111's (the longer lines are set smaller to fit in it).
  .map((t) => (TITLE[t[4]] ? [t[0], t[1], t[2], t[3], TITLE[t[4]], Math.max(t[5] ?? 0, 236)] : t));

const label = (y, text, bold = false) => [109.4, y, 6.1, bold ? 1 : 0, text, null];
const head = (x, y, text) => [x, y, 6.1, 1, text, null];
const rows = [
  ['01', 505, 'Número de perceptores'],
  ['02', 486, 'Base retenciones e ingresos a cuenta'],
  ['03', 467, 'Retenciones e ingresos a cuenta'],
  [
    '04',
    420,
    'Resultados a ingresar de anteriores autoliquidaciones por el mismo concepto, ejercicio y período',
  ],
  ['05', 395, 'Resultado a ingresar ( 03 – 04 )'],
];
const dots = (text) => `${text} ${'.'.repeat(Math.max(3, 120 - Math.round(text.length * 1.15)))}`;
const texts = [
  head(97.3, 530, 'Retenciones e ingresos a cuenta'),
  head(97.3, 443, 'A deducir'),
  [130, 443, 6.1, 0, '(exclusivamente en caso de autoliquidación complementaria):', null],
  ...rows.map(([, y, text]) => label(y, dots(text), text.startsWith('Resultado a'))),
  ...rows.map(([id, y]) => [431.5, y, 6.1, 0, id, 6.8]),
];
// The cells of a box as the 111 draws them: the number and its amount, filled in light grey.
const cells = rows.flatMap(([, y]) => [
  [432.7, y - 2.7, 81.2, 10.1, 4, -1, 0, 9999],
  [429.8, y - 2.7, 10.5, 10.1, 4, -1, 0, 9999],
]);
const boxes = rows.map(([id, y]) => [id, 440.5, y - 2.7, 73, 10.1]);

const out = {
  model: '115',
  source: `Maquetación del 111 (${m111.source}) con la liquidación del 115 (DR115e15v13, casillas 01-05)`,
  colors: m111.colors,
  pages: [
    {
      t: [...kept, ...texts],
      r: [...page.r.filter((r) => !inBlock(r[1]) || r[2] > 300), ...cells],
      l: page.l.filter((l) => !inBlock(l[1]) && !inBlock(l[3])),
      b: [...page.b.filter((b) => !inBlock(b[2])), ...boxes],
    },
  ],
};
writeFileSync(join(dir, '115.json'), `${JSON.stringify(out)}\n`);
console.log('115', out.pages[0].b.map((b) => b[0]).join(' '));
