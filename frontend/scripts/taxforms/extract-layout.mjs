/**
 * Turns the official facsimile of a form, as the BOE publishes it, into the layout the previews of
 * the app draw: every printed text with its place and size, every cell and rule, and the box of
 * each numbered «casilla». Nothing of the PDF itself is kept: no images (logos, emblems, barcodes),
 * no fonts, and none of the Tax Agency's own branding texts.
 *
 *   node scripts/taxforms/extract-layout.mjs <boe.pdf> <model> <first page> <last page>
 *   node scripts/taxforms/extract-layout.mjs <boe.pdf> <model> <page,page,…>
 *
 * The PDF is downloaded by hand from the URL in SOURCES (see docs/fiscalidad/documentos-oficiales.md)
 * and the result is written to src/modules/taxforms/data/<model>.json (then `npx prettier --write` it).
 */
import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

const SOURCES = {
  130: 'https://www.boe.es/boe/dias/2015/02/19/pdfs/BOE-A-2015-1656.pdf (Orden HAP/258/2015, anexo I, pág. 6)',
  111: 'https://www.boe.es/boe/dias/2011/03/18/pdfs/BOE-A-2011-4948.pdf (Orden EHA/586/2011, anexo I, pág. 14)',
  303: 'https://www.boe.es/boe/dias/2026/01/26/pdfs/BOE-A-2026-1761.pdf (Orden HAC/27/2026, anexo III, págs. 12-17)',
  100: 'https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf (Orden HAC/277/2026, anexo I, págs. 21-45)',
  131: 'https://www.boe.es/boe/dias/2015/02/19/pdfs/BOE-A-2015-1656.pdf (Orden HAP/258/2015, anexo II, pág. 8)',
  190: 'https://www.boe.es/boe/dias/2009/11/23/pdfs/BOE-A-2009-18567.pdf (Orden EHA/3127/2009, anexo I, págs. 21 y 23)',
  347: 'https://www.boe.es/boe/dias/2014/09/26/pdfs/BOE-A-2014-9740.pdf (Orden HAP/1732/2014, anexo I, págs. 5 y 7)',
  349: 'https://www.boe.es/boe/dias/2010/03/29/pdfs/BOE-A-2010-5098.pdf (Orden EHA/769/2010, anexo I, págs. 13, 15 y 17)',
  390: 'https://www.boe.es/boe/dias/2026/01/26/pdfs/BOE-A-2026-1761.pdf (Orden HAC/27/2026, anexo IV, págs. 18-26)',
  123: 'https://www.boe.es/boe/dias/2024/01/31/pdfs/BOE-A-2024-1772.pdf (Orden HAC/56/2024, anexo I, pág. 23)',
  309: 'https://www.boe.es/boe/dias/2022/12/19/pdfs/BOE-A-2022-21458.pdf (Orden HFP/1245/2022, anexo, pág. 3)',
  121: 'https://www.boe.es/boe/dias/2017/02/10/pdfs/BOE-A-2017-1334.pdf (Orden HFP/105/2017, anexo I, pág. 7)',
  122: 'https://www.boe.es/boe/dias/2018/07/18/pdfs/BOE-A-2018-10064.pdf (Orden HAC/763/2018, anexo II, págs. 8-9)',
  143: 'https://www.boe.es/boe/dias/2018/07/18/pdfs/BOE-A-2018-10064.pdf (Orden HAC/763/2018, anexo I, págs. 6-7)',
};

/**
 * Pages that list people or operations, one block after another (the payees of the 190, the persons
 * of the 347, the operators of the 349): model → page (1-based in the range) → the blocks it holds.
 * The preview repeats the page as many times as the records need.
 */
const ROWS = { 190: { 2: 3 }, 347: { 2: 3 }, 349: { 2: 15, 3: 10 } };

/**
 * Cells without a number (the record of a payee, a person, an operator): model → page (1-based in the
 * range) → [label printed on the facsimile, id, where the cell is from it (`below` or `right`), which
 * of the labels of a line when a line prints it twice (0: the leftmost), the width of the cell when
 * the facsimile draws none]. On a page of blocks the n-th label from the top is the block n: «n.id».
 * Ids that start with «hoja.» are the totals of the page.
 */
const FIELDS = {
  190: {
    2: [
      ['NIF del perceptor', 'nif', 'below'],
      [
        'Apellidos y nombre del perceptor o denominación de la entidad perceptora',
        'nombre',
        'below',
      ],
      ['Provincia', 'provincia', 'below'],
      ['Clave:', 'clave', 'right'],
      ['Subclave:', 'subclave', 'right'],
      ['Percepción íntegra', 'integra', 'below'],
      ['Retenciones practicadas', 'retenciones', 'below'],
      ['Valoración', 'especie', 'below'],
      ['Ingresos a cuenta efectuados', 'ingresos', 'below'],
      ['Percepciones', 'hoja.percepciones', 'below', -1],
      ['Retenciones e ingresos a cuenta', 'hoja.retenciones', 'below'],
    ],
  },
  347: {
    2: [
      ['NIF declarado', 'nif', 'below'],
      ['Apellidos y nombre, razón social o denominación del declarado', 'nombre', 'below'],
      ['Provincia (Código)', 'provincia', 'below'],
      ['Clave operación', 'clave', 'below'],
      ['Arrendamiento', 'local', 'below'],
      ['Op. con inversión', 'isp', 'below'],
      ['Importe anual de las operaciones', 'total', 'below'],
      ['1 T', 't1', 'right', 0],
      ['2 T', 't2', 'right', 0],
      ['3 T', 't3', 'right', 0],
      ['4 T', 't4', 'right', 0],
    ],
  },
  349: {
    2: [
      ['Código país', 'pais', 'below', 0, 23],
      ['NIF comunitario', 'nif', 'below', 0, 62],
      ['Apellidos y nombre, denominación o razón social', 'nombre', 'below', 0, 238],
      ['Clave', 'clave', 'below', 0, 10],
      ['Base imponible', 'base', 'below', 0, 63],
      ['Base imponible', 'hoja.base', 'below', -1, 63],
    ],
    // The corrections of earlier periods: other records than the operators of page 2.
    3: [
      ['Código país', 'rpais', 'below', 0, 23],
      ['NIF comunitario', 'rnif', 'below', 0, 62],
      ['Apellidos y nombre, denominación o razón social', 'rnombre', 'below', 0, 200],
      ['Clave', 'rclave', 'below', 0, 10],
      ['Ejercicio', 'rejercicio', 'below', 0, 30, 1],
      ['Período', 'rperiodo', 'below', 0, 15, 1],
      ['Base imponible rectificada', 'rbase', 'below', 0, 63],
      ['Base imponible rectificada', 'hoja.rbase', 'below', -1, 63],
      ['Base imponible declarada anteriormente', 'ranterior', 'below', 0, 63],
    ],
  },
};

/** Facsimiles whose words come cut in pieces (the 349 of 2010 sets every few letters apart). */
const JOIN = new Set(['349']);

/** The pieces of a word or a line printed one after the other as one text. */
function joinFragments(texts) {
  const out = [];
  const sorted = [...texts].sort((a, b) => b.y - a.y || a.x - b.x);
  for (const t of sorted) {
    const prev = out[out.length - 1];
    const gap = prev ? t.x - (prev.x + prev.w) : Infinity;
    if (
      prev &&
      !prev.rotated &&
      !t.rotated &&
      Math.abs(prev.y - t.y) < 0.3 &&
      Math.abs(prev.size - t.size) < 0.2 &&
      prev.bold === t.bold &&
      gap > -1.5 &&
      gap < t.size * 0.4
    ) {
      out[out.length - 1] = {
        ...prev,
        str: `${prev.str}${gap > t.size * 0.12 ? ' ' : ''}${t.str}`,
        w: t.x + t.w - prev.x,
      };
    } else out.push({ ...t });
  }
  return out;
}

/** The BOE's own header and footer, the annex captions and the Tax Agency's name, phone and site. */
const DROP = [
  /^BOLET[IÍ]N OFICIAL DEL ESTADO$/,
  /^N[uú]m\. \d+$/,
  /^(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo) \d+ de /,
  /^Sec\. I\.$/,
  /^P[aá]g\. \d+$/,
  /^cve: BOE-/,
  /^Verificable en/,
  /^ANEXO/,
  /^I$/,
  /^Modelo 303 de autoliquidaci[oó]n del Impuesto/,
  /^Agencia Tributaria$/,
  /^MINISTERIO/,
  /^DE ECONOM[IÍ]A$/,
  /^DE HACIENDA$/,
  /^Y HACIENDA$/,
  /^Y ADMINISTRACIONES$/,
  /^P[UÚ]BLICAS$/,
  /^Tel[eé]fono/,
  /^91 554 87 70/,
  /^901 33 55 33$/,
  /www\.agenciatributaria\.es/,
  /^https:\/\/sede\.agenciatributaria/,
];

/** Where the barcode goes on the official form, the preview says what it is instead. */
const REPLACE = [
  [
    /^Espacio reservado para (la )?(numeraci[oó]n por|n[uú]mero identificativo y) c[oó]digo de barras$/,
    'Vista previa: no sirve para presentar',
  ],
  // The «T» of «Total» is drawn as a shape on the 303, not as a letter.
  [/^otal /, (s) => `T${s}`],
  [/^ributaci[oó]n /, (s) => `T${s}`],
];

/**
 * Cells the detection misses (drawn with loose rules, or with a letter between number and cell),
 * measured by hand on the facsimile: model → page (1-based) → box → [x, y, width, height].
 */
const OVERRIDES = {
  303: {
    1: {
      150: [304.5, 357.2, 63.5, 8.3],
      25: [304.5, 235.3, 64.5, 8.3],
      28: [351.9, 196.3, 65, 8.5],
      29: [426.4, 196.3, 65, 8.5],
      40: [351.9, 142.6, 65, 8.5],
      44: [426.4, 115.5, 65, 8.5],
    },
    3: { 65: [202.5, 481.8, 34, 9] },
    4: {
      89: [135.9, 529.6, 31.5, 8.8],
      90: [218.2, 529.6, 31.5, 8.8],
      91: [294.9, 529.6, 31.5, 8.8],
      92: [375.6, 529.6, 31.5, 8.8],
      107: [473.8, 529.6, 31.5, 8.8],
    },
    6: { 72: [151.6, 645.8, 93.6, 11.1], 73: [195.3, 475.9, 93.6, 11.1] },
  },
  // The year and the period where the summaries and their sheets have their cell (not after the
  // title of their section, nor after «(con 4 cifras)»).
  190: { 1: { ejercicio: [474.5, 567.9, 33.5, 9.6] }, 2: { ejercicio: [176, 672, 32.5, 9.6] } },
  347: { 1: { ejercicio: [501, 551.2, 37.3, 10.9] }, 2: { ejercicio: [163.7, 634.8, 35, 10.3] } },
  349: {
    1: { ejercicio: [472.5, 576.4, 33, 9.6], periodo: [489.8, 557.3, 16, 9.6] },
    2: { ejercicio: [164.5, 667, 30, 8.6], periodo: [209, 667, 16, 8.6] },
    3: { ejercicio: [164.5, 667, 30, 8.6], periodo: [209, 667, 16, 8.6] },
  },
};

/**
 * The emblem, the ministry and the Tax Agency's logo, drawn with lines or set in pieces that the
 * lists above do not catch: model → page → area whose drawings and texts are left out.
 */
const LOGOS = {
  190: { 1: [60, 640, 125, 760] },
  349: { 1: [60, 640, 125, 760] },
  123: { 1: [55, 635, 200, 700] },
  309: { 1: [70, 640, 130, 700], 2: [70, 675, 130, 700] },
};

/**
 * Letters some facsimiles draw as outlines, not as text (the «O» of «Operaciones» on the 390, the
 * «N» of «NIF» on the 309 and the 123): model → [the text as read, the text as printed].
 */
const LETTERS = {
  390: [[/^peraciones/, 'Operaciones']],
  309: [
    [/^ehículos$/, 'Vehículos'],
    [/^º /, 'N.º '],
    [/^º contrucción\)$/, 'N.º construcción)'],
    [/^ombre$/, 'Nombre'],
    [/^IF(-IVA)?$/, (s) => `N${s}`],
    [/^ALOR AÑADIDO$/, 'VALOR AÑADIDO'],
    [/^Código IBA$/, 'Código IBAN'],
  ],
  123: [
    [/^ombre o Razón social$/, 'Nombre o Razón social'],
    [/^IF$/, 'NIF'],
    [/^úmero de rentas$/, 'Número de rentas'],
    [/^º de justificante$/, 'N.º de justificante'],
  ],
};

/**
 * Boxes whose cell the facsimile draws as a bare outline right after the number (the shares of
 * each territory, in %): model → page (1-based in the range) → box → width of the cell.
 */
const AFTER = {
  390: { 7: { 87: 28, 88: 28, 89: 28, 90: 28, 91: 28 } },
};

/**
 * Forms whose rows repeat one column of cells: a number left without a cell takes the cell of the
 * column its number is in (the 390 cuts some rules of its rows where the detection needs them whole).
 */
const COLUMNS = new Set(['390']);

/**
 * Box numbers the facsimile prints by mistake on top of the right ones: model → page (1-based) →
 * numbers. Page 32 of BOE-A-2026-7041 (page 12 of the Renta) prints «0543» over 1608, 0592, 0593,
 * 0594 and 0600; the 0543 is the average autonomic rate of page 22.
 */
const GHOSTS = { 100: { 32: ['0543'] } };

const round = (n) => Math.round(n * 10) / 10;

const [file, model, from, to] = process.argv.slice(2);
const frontend = process.cwd();
const require = createRequire(join(frontend, 'package.json'));
const pdfjs = await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);
const pdf = await pdfjs.getDocument({
  data: new Uint8Array(readFileSync(file)),
  isEvalSupported: false,
  verbosity: 0,
}).promise;
const OPS = pdfjs.OPS;

const colors = [];
const colorOf = (c) => {
  const key = c.join(',');
  let i = colors.findIndex((k) => k.join(',') === key);
  if (i < 0) i = colors.push(c) - 1;
  return i;
};

const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** The cells and rules of a page, with their fill and stroke, as the drawing operators paint them. */
async function graphicsOf(page) {
  const ops = await page.getOperatorList();
  const rects = [];
  const lines = [];
  let state = { ctm: [1, 0, 0, 1, 0, 0], fill: [0, 0, 0], stroke: [0, 0, 0], lw: 1 };
  const stack = [];
  let path = null;
  let z = 0;
  for (let i = 0; i < ops.fnArray.length; i++) {
    const f = ops.fnArray[i];
    const a = ops.argsArray[i];
    if (f === OPS.save) stack.push({ ...state });
    else if (f === OPS.restore) state = stack.pop() ?? state;
    else if (f === OPS.transform) state.ctm = mul(state.ctm, a);
    else if (f === OPS.setFillRGBColor) state.fill = [a[0], a[1], a[2]];
    else if (f === OPS.setStrokeRGBColor) state.stroke = [a[0], a[1], a[2]];
    else if (f === OPS.setFillGray) state.fill = [a[0] * 255, a[0] * 255, a[0] * 255];
    else if (f === OPS.setStrokeGray) state.stroke = [a[0] * 255, a[0] * 255, a[0] * 255];
    else if (f === OPS.setLineWidth) state.lw = a[0];
    else if (f === OPS.constructPath) {
      const [ops2, coords] = a;
      path = { rects: [], segs: [] };
      let k = 0;
      let at = null;
      for (const op of ops2) {
        if (op === OPS.rectangle) {
          const [x, y, w, h] = coords.slice(k, k + 4);
          k += 4;
          const [X, Y] = apply(state.ctm, x, y);
          const [X2, Y2] = apply(state.ctm, x + w, y + h);
          path.rects.push([Math.min(X, X2), Math.min(Y, Y2), Math.abs(X2 - X), Math.abs(Y2 - Y)]);
        } else if (op === OPS.moveTo) {
          at = apply(state.ctm, coords[k], coords[k + 1]);
          k += 2;
        } else if (op === OPS.lineTo) {
          const to2 = apply(state.ctm, coords[k], coords[k + 1]);
          k += 2;
          if (at) path.segs.push([...at, ...to2]);
          at = to2;
        } else if (op === OPS.curveTo) k += 6;
        else if (op === OPS.curveTo2 || op === OPS.curveTo3) k += 4;
      }
    } else if (path) {
      const filled = [OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke].includes(f);
      const stroked = [OPS.stroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeStroke].includes(f);
      if (filled || stroked) {
        // The order of painting: a white cell painted after a rule hides it on the facsimile.
        z++;
        const lw = round(state.lw * Math.abs(state.ctm[0] || state.ctm[1]));
        for (const r of path.rects) {
          // Hairlines drawn as thin filled rectangles are rules.
          rects.push([
            ...r.map(round),
            filled ? colorOf(state.fill.map(Math.round)) : -1,
            stroked ? colorOf(state.stroke.map(Math.round)) : -1,
            stroked ? lw : 0,
            z,
          ]);
        }
        if (stroked) {
          for (const s of path.segs)
            lines.push([...s.map(round), colorOf(state.stroke.map(Math.round)), lw, z]);
        }
      }
      if (f !== OPS.clip && f !== OPS.eoClip) path = null;
    }
  }
  return { rects, lines };
}

/** The printed texts of a page: place, size, weight, rotation and the width they take. */
async function textsOf(page) {
  const content = await page.getTextContent();
  const out = [];
  for (const item of content.items) {
    // The «fi» ligature comes out as «fi » («identifi cativa»): joined again.
    const str = item.str?.replace(/\s+/g, ' ').replace(/fi (?=[a-záéíóúñ])/g, 'fi');
    if (!str || !str.trim()) continue;
    const [a, b, , d, x, y] = item.transform;
    const rotated = Math.abs(a) < 0.01 && b > 0;
    const size = rotated ? b : Math.abs(d);
    let name = '';
    try {
      name = page.commonObjs.get(item.fontName).name ?? '';
    } catch {
      name = '';
    }
    const bold = /Bold|Black|Heavy|Semibold/i.test(name);
    out.push({ x, y, size, bold, rotated, str: str.trim(), w: item.width });
  }
  return out;
}

const pages = [];
// The pages: a range («21 26») or a list («21,23»: the summary and one inner sheet).
const list = from.includes(',')
  ? from.split(',').map(Number)
  : Array.from({ length: Number(to) - Number(from) + 1 }, (_, i) => Number(from) + i);
for (const [i, n] of list.entries()) {
  const k = i + 1;
  const page = await pdf.getPage(n);
  const { rects, lines } = await graphicsOf(page);
  const read = await textsOf(page);
  const texts = (JOIN.has(model) ? joinFragments(read) : read)
    .filter((t) => t.y < 750 && t.y > 64 && !DROP.some((re) => re.test(t.str)))
    .filter((t) => !(GHOSTS[model]?.[n] ?? []).includes(t.str))
    .flatMap((t) => {
      // «Período .....»: the word alone, so the reader finds the period typed after it.
      const m = /^(Ejercicio|Per[ií]odo)( ?\.+)$/.exec(t.str);
      if (!m) return [t];
      const share = (m[1].length / t.str.length) * t.w;
      return [
        { ...t, str: m[1], w: share },
        { ...t, x: t.x + share, str: m[2].trim(), w: t.w - share, bold: false },
      ];
    })
    .filter((t) => {
      const logo = LOGOS[model]?.[k];
      return !logo || !(t.x >= logo[0] && t.x <= logo[2] && t.y >= logo[1] && t.y <= logo[3]);
    })
    .map((t) => {
      const r = [...REPLACE, ...(LETTERS[model] ?? [])].find(([re]) => re.test(t.str));
      if (!r) return t;
      return { ...t, str: typeof r[1] === 'function' ? r[1](t.str) : r[1] };
    });
  // Dot leaders run under the cells on the facsimile (the cell is painted over them): here they
  // stop before the first cell or text of their line, so they never cross a box.
  for (const t of texts) {
    const dots = /\.+$/.exec(t.str)?.[0].length ?? 0;
    if (dots < 2 || t.rotated) continue;
    const sameLine = (y, h) => y <= t.y + t.size * 0.6 && y + h >= t.y;
    const stops = [
      ...texts.filter((o) => o !== t && Math.abs(o.y - t.y) < 2 && o.x > t.x + 4).map((o) => o.x),
      ...rects.filter((r) => r[4] >= 0 && r[0] > t.x + 4 && sameLine(r[1], r[3])).map((r) => r[0]),
    ].filter((x) => x < t.x + t.w);
    if (stops.length === 0) continue;
    const per = t.w / t.str.length;
    const keep = Math.max(t.str.length - dots, Math.floor((Math.min(...stops) - 2 - t.x) / per));
    t.w = per * keep;
    t.str = t.str.slice(0, keep).trimEnd();
  }
  const inside = (r, t) =>
    t.x >= r[0] - 0.5 && t.x <= r[0] + r[2] && t.y >= r[1] - 1 && t.y <= r[1] + r[3];
  const empty = (r) => !texts.some((t) => inside(r, t) && t.x > r[0] + 1);
  // Flat rules, the pieces of one rule drawn end to end joined (the 390 cuts the rule under a box
  // at its number).
  const flat = [];
  for (const l of lines
    .filter((l) => Math.abs(l[1] - l[3]) < 0.3)
    .map((l) => [Math.min(l[0], l[2]), l[1], Math.max(l[0], l[2]), l[3], ...l.slice(4)])
    .sort((p, q) => p[1] - q[1] || p[0] - q[0])) {
    const prev = flat[flat.length - 1];
    if (prev && Math.abs(prev[1] - l[1]) < 0.3 && l[0] <= prev[2] + 1)
      prev[2] = Math.max(prev[2], l[2]);
    else flat.push([...l]);
  }
  const upright = lines.filter((l) => Math.abs(l[0] - l[2]) < 0.3);
  const isNumber = (o) => !o.rotated && /^\d{2,4}$/.test(o.str);
  // The cell of a box: the empty cell that starts after its number (or holds it with room to its
  // right), or else the room between the rules of its row, up to the next rule or box of the line.
  const fieldOf = (t) => {
    const end = t.x + t.w;
    const overlaps = (r) => r[1] <= t.y + t.size * 0.6 && r[1] + r[3] >= t.y + t.size * 0.3;
    const clear = (x0, x1, y0, y1) =>
      !texts.some((o) => o !== t && o.x > x0 + 0.5 && o.x < x1 - 1 && o.y >= y0 - 0.5 && o.y <= y1);
    // A tall cell holds several rows (split by rules): the field takes the row of the number.
    const row = (y0, y1) => {
      const y = Math.max(y0, t.y - 2.6);
      return [y, Math.min(y1, t.y + t.size + 2.2) - y];
    };
    const cell = rects
      .filter((r) => r[3] >= 5 && r[3] <= 60 && overlaps(r))
      .filter((r) => r[0] >= t.x - 30 && r[0] <= end + 14 && r[0] + r[2] >= end + 20)
      .filter((r) => clear(Math.max(r[0], end), r[0] + r[2], r[1], r[1] + r[3]))
      .sort((p, q) => p[2] - q[2])[0];
    if (cell) {
      const x = Math.max(cell[0], end + 1.5);
      const [y, h] = row(cell[1], cell[1] + cell[3]);
      return [x, y, cell[0] + cell[2] - x - 1, h];
    }
    const spans = (l) => Math.min(l[0], l[2]) <= t.x && Math.max(l[0], l[2]) >= end + 20;
    const below = flat
      .filter((l) => spans(l) && l[1] <= t.y + 1 && l[1] >= t.y - 6)
      .sort((p, q) => q[1] - p[1])[0];
    const above = flat
      .filter((l) => spans(l) && l[1] >= t.y + t.size * 0.8 && l[1] <= t.y + 14)
      .sort((p, q) => p[1] - q[1])[0];
    if (!below || !above) return null;
    const stops = [
      Math.max(below[0], below[2]),
      ...upright
        .filter(
          (l) =>
            l[0] > end + 3 && Math.min(l[1], l[3]) <= t.y + 2 && Math.max(l[1], l[3]) >= t.y + 2
        )
        .map((l) => l[0]),
      ...texts
        .filter((o) => isNumber(o) && Math.abs(o.y - t.y) < 2 && o.x > end)
        .map((o) => o.x - 2),
    ];
    const right = Math.min(...stops);
    if (right - end < 15 || !clear(end, right, below[1], above[1])) return null;
    const [y, h] = row(below[1], above[1]);
    return [end + 1.5, y, right - end - 2.5, h];
  };
  const boxes = [];
  const columns = [];
  for (const t of texts) {
    if (!isNumber(t)) continue;
    const field = fieldOf(t);
    if (field) {
      boxes.push([t.str, ...field.map(round)]);
      columns.push([t.x, field[0], field[2]]);
    }
  }
  for (const t of texts) {
    if (!isNumber(t) || boxes.some((b) => b[0] === t.str)) continue;
    const after = AFTER[model]?.[k]?.[t.str];
    const column = COLUMNS.has(model) && columns.find(([x]) => Math.abs(x - t.x) < 1.5);
    if (after) boxes.push([t.str, ...[t.x + t.w + 2, t.y - 2.6, after, 9.6].map(round)]);
    else if (column) boxes.push([t.str, ...[column[1], t.y - 2.6, column[2], 9.6].map(round)]);
  }
  for (const [id, field] of Object.entries(OVERRIDES[model]?.[k] ?? {})) {
    if (!boxes.some((b) => b[0] === id)) boxes.push([id, ...field]);
  }
  // The cells of a record: under or after their label (the nearest drawn cell or rule).
  const slots = ROWS[model]?.[k];
  const cellNear = (t, at, width) => {
    if (at === 'right') {
      const end = t.x + t.w;
      const cell = rects
        .filter((r) => r[0] >= end - 1 && r[0] <= end + 25 && r[3] >= 5 && r[3] <= 20)
        .filter((r) => r[1] <= t.y + 2 && r[1] + r[3] >= t.y + 2)
        .sort((p, q) => p[0] - q[0])[0];
      if (cell) return [cell[0] + 1, cell[1], cell[2] - 2, cell[3]];
      // Or the rule the amount is written on, from the label to its end.
      const rule = flat
        .filter((l) => l[1] <= t.y + 1 && l[1] >= t.y - 4)
        .filter((l) => Math.min(l[0], l[2]) <= end + 8 && Math.max(l[0], l[2]) >= end + 20)
        .sort((p, q) => q[1] - p[1])[0];
      if (!rule) return null;
      const right = Math.max(rule[0], rule[2]);
      return [end + 2, rule[1] + 0.4, right - end - 3, 8];
    }
    const top = (r) => r[1] + r[3];
    const cell = rects
      .filter((r) => r[3] >= 5 && r[3] <= 20 && r[2] >= 8)
      .filter((r) => top(r) <= t.y + 1 && top(r) >= t.y - 16)
      .filter((r) => r[0] <= t.x + 12 && r[0] + r[2] >= t.x + 4)
      .sort((p, q) => top(q) - top(p))[0];
    if (cell) return [cell[0] + 1, cell[1], cell[2] - 2, cell[3]];
    if (!width) return null;
    return [t.x, t.y - 8.8, width, 7.6];
  };
  for (const [label, id, at, col = 0, width, skip = 0] of FIELDS[model]?.[k] ?? []) {
    const found = texts
      .filter((t) => t.str === label && !t.rotated)
      .sort((p, q) => (Math.abs(p.y - q.y) > 2 ? q.y - p.y : p.x - q.x));
    // Only the label of the column asked for on each line (the leftmost, or the last one: -1).
    const lines = [];
    for (const t of found) {
      const line = lines.find((l) => Math.abs(l[0].y - t.y) <= 2);
      if (line) line.push(t);
      else lines.push([t]);
    }
    const picked = lines
      .map((l) => l[col < 0 ? l.length + col : col])
      .filter(Boolean)
      .slice(skip);
    const page = id.startsWith('hoja.');
    // A total of the page is its last label; a field of a record, one per block.
    const used =
      page || !slots ? picked.slice(col < 0 ? -1 : 0).slice(0, 1) : picked.slice(0, slots);
    used.forEach((t, i) => {
      const cell = cellNear(t, at, width);
      if (!cell) throw new Error(`${model} p${n}: no cell for «${label}»`);
      boxes.push([slots && !page ? `${i + 1}.${id}` : id, ...cell.map(round)]);
    });
  }
  // Year and period: the cell after the word, or the dotted room up to the next text of the line.
  // The Renta prints its year: only the quarterly forms are given one to fill in.
  for (const word of model === '100' ? [] : ['Ejercicio', 'Período']) {
    if (boxes.some((b) => b[0] === (word === 'Ejercicio' ? 'ejercicio' : 'periodo'))) continue;
    // The 309 writes «Periodo» without the accent.
    const t = texts.find((o) => o.str === word || (word === 'Período' && o.str === 'Periodo'));
    if (!t) continue;
    const field = fieldOf(t);
    if (field) boxes.push([word === 'Ejercicio' ? 'ejercicio' : 'periodo', ...field.map(round)]);
    else {
      const end = t.x + t.w + 2;
      const after = texts
        .filter((o) => Math.abs(o.y - t.y) < 2 && o.x > end + 6 && !/^\.+$/.test(o.str))
        .sort((p, q) => p.x - q.x)[0];
      const width = Math.min(60, (after ? after.x - 4 : end + 40) - end);
      boxes.push([
        word === 'Ejercicio' ? 'ejercicio' : 'periodo',
        round(end),
        round(t.y - 2),
        round(width),
        9,
      ]);
    }
  }
  const logo = LOGOS[model]?.[k];
  const inLogo = (x, y, w, h) =>
    Boolean(logo) && x >= logo[0] && y >= logo[1] && x + w <= logo[2] && y + h <= logo[3];
  // Reading order: top to bottom, and left to right along a row.
  boxes.sort((p, q) => (Math.abs(p[2] - q[2]) > 3 ? q[2] - p[2] : p[1] - q[1]));
  pages.push({
    t: texts.map((t) => [
      round(t.x),
      round(t.y),
      round(t.size),
      (t.bold ? 1 : 0) | (t.rotated ? 2 : 0),
      t.str,
      round(t.w),
    ]),
    r: rects.filter((r) => r[1] < 750 && r[1] + r[3] < 760 && !inLogo(r[0], r[1], r[2], r[3])),
    l: lines.filter(
      (l) =>
        l[1] < 750 &&
        l[3] < 750 &&
        !inLogo(
          Math.min(l[0], l[2]),
          Math.min(l[1], l[3]),
          Math.abs(l[2] - l[0]),
          Math.abs(l[3] - l[1])
        )
    ),
    b: boxes,
    ...(slots ? { rows: slots } : {}),
  });
}

const out = join(frontend, 'src', 'modules', 'taxforms', 'data', `${model}.json`);
writeFileSync(out, `${JSON.stringify({ model, source: SOURCES[model], colors, pages })}\n`);
console.log(
  model,
  pages
    .map((p, i) => `p${i + 1}: ${p.t.length} texts, ${p.r.length} cells, ${p.b.length} boxes`)
    .join(' · ')
);
