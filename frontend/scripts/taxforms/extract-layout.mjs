/**
 * Turns the official facsimile of a form, as the BOE publishes it, into the layout the previews of
 * the app draw: every printed text with its place and size, every cell and rule, and the box of
 * each numbered «casilla». Nothing of the PDF itself is kept: no images (logos, emblems, barcodes),
 * no fonts, and none of the Tax Agency's own branding texts.
 *
 *   node scripts/taxforms/extract-layout.mjs <boe.pdf> <model> <first page> <last page>
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
};

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
    /^Espacio reservado para (la )?numeraci[oó]n por c[oó]digo de barras$/,
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
};

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
for (let n = Number(from); n <= Number(to); n++) {
  const page = await pdf.getPage(n);
  const { rects, lines } = await graphicsOf(page);
  const texts = (await textsOf(page))
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
    .map((t) => {
      const r = REPLACE.find(([re]) => re.test(t.str));
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
  const flat = lines.filter((l) => Math.abs(l[1] - l[3]) < 0.3);
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
  for (const t of texts) {
    if (!isNumber(t)) continue;
    const field = fieldOf(t);
    if (field) boxes.push([t.str, ...field.map(round)]);
  }
  for (const [id, field] of Object.entries(OVERRIDES[model]?.[n - Number(from) + 1] ?? {})) {
    if (!boxes.some((b) => b[0] === id)) boxes.push([id, ...field]);
  }
  // Year and period: the cell after the word, or the dotted room up to the next text of the line.
  // The Renta prints its year: only the quarterly forms are given one to fill in.
  for (const word of model === '100' ? [] : ['Ejercicio', 'Período']) {
    const t = texts.find((o) => o.str === word);
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
    r: rects.filter((r) => r[1] < 750 && r[1] + r[3] < 760),
    l: lines.filter((l) => l[1] < 750 && l[3] < 750),
    b: boxes,
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
