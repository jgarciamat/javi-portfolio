/**
 * The round trip of the previews: every form is drawn with made-up figures in every box, the PDF is
 * read back with the real pdf.js (its Node build) and the app's own reader of filed forms, and each
 * box must come back with the same figure: `npm run taxforms:verify`. With `FIXTURES=1` it also writes
 * the pieces of text of each PDF as the fixture of the Jest tests; with `OUT=<dir>` it saves the PDFs.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { join } from 'path';
import { pathToFileURL } from 'url';
import {
  tokensFromPdf,
  type PdfDocument,
} from '../../src/modules/finances/application/taxModelPdf';
import { parseTaxModelTokens, type PdfToken } from '../../src/modules/finances/domain/taxModelPdf';
import { buildFormPdf, type PreviewText } from '../../src/modules/taxforms/application/formPdf';
import { loadLayout, type FormModel } from '../../src/modules/taxforms/domain/layout';
import { expected349, readableBoxes, YEARLY } from '../../src/modules/taxforms/domain/roundTrip';
import { sampleForm } from '../../src/modules/taxforms/domain/samples';

const frontend = process.cwd();
const FIXTURE = join(frontend, 'src', '__tests__', 'taxforms', 'fixtures', 'formTokens.json');

const TEXT: PreviewText = {
  banner: 'SIMULACIÓN ORIENTATIVA, NO OFICIAL · Finanverso',
  notice: 'Vista previa para copiar al modelo oficial. Revísala con un gestor colegiado.',
  legend: 'Casillas vacías: la app no las calcula.',
  pending: 'no calculada',
  page: 'Página {n} de {total}',
  title: 'Vista previa',
};

const MODELS: FormModel[] = [
  ...['130', '303', '111', '115', '131', '390', '349', '190', '180', '347'],
  ...['309', '123', '100'],
] as FormModel[];

void (async () => {
  const require = createRequire(join(frontend, 'package.json'));
  const pdfjs = await import(
    pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href
  );
  const fixtures: Record<string, PdfToken[][]> = {};
  let failures = 0;
  for (const model of MODELS) {
    const layout = await loadLayout(model);
    const form = sampleForm(model, layout);
    const bytes = await buildFormPdf(layout, form, TEXT);
    if (process.env.OUT) {
      mkdirSync(process.env.OUT, { recursive: true });
      writeFileSync(join(process.env.OUT, `modelo-${model}.pdf`), bytes);
    }
    const pdf = await pdfjs.getDocument({ data: bytes, isEvalSupported: false, verbosity: 0 })
      .promise;
    // The fields one by one, by name: the figure typed in each box must be the one of the app.
    const typed: Record<string, string> = {};
    for (let n = 1; n <= pdf.numPages; n++) {
      for (const a of await (await pdf.getPage(n)).getAnnotations()) {
        if (a.fieldName && typeof a.fieldValue === 'string' && a.fieldValue !== '') {
          typed[a.fieldName] = a.fieldValue;
        }
      }
    }
    const wanted = [...Object.keys(form.values), ...Object.keys(form.texts ?? {})];
    const readable = readableBoxes(form);
    const fieldMisses = wanted.filter((id) => !(`casilla.${id}` in typed));
    let line = `${model}: ${pdf.numPages} págs., ${wanted.length} casillas rellenadas, ${
      wanted.length - fieldMisses.length
    } campos releídos`;
    if (fieldMisses.length > 0) {
      failures++;
      line += ` · FALTAN ${fieldMisses.join(' ')}`;
    }
    const pages = await tokensFromPdf(pdf as unknown as PdfDocument);
    // The Renta has 25 pages: its fixture keeps its first page (the title the reader knows it by)
    // and, on every page, the typed fields and the numbers of the boxes, all its reading needs.
    const kept = (tokens: PdfToken[], page: number) =>
      model === '100' && page > 0
        ? tokens.filter((t) => t.field || /^\d{4}$/.test(t.text.trim()))
        : tokens;
    fixtures[model] = pages.map((tokens, page) =>
      kept(tokens, page).map((t) => ({
        ...t,
        x: Math.round(t.x * 10) / 10,
        y: Math.round(t.y * 10) / 10,
        ...(t.w !== undefined ? { w: Math.round(t.w * 10) / 10 } : {}),
        ...(t.h !== undefined ? { h: Math.round(t.h * 10) / 10 } : {}),
      }))
    );
    const read = parseTaxModelTokens(pages);
    if (!read.ok) {
      failures++;
      line += ` · LECTOR: ${read.reason}${'periods' in read ? ` ${read.periods.join(', ')}` : ''}`;
    } else {
      const { boxes, year, quarter, operators } = read.data;
      if (model === '349') {
        const want = JSON.stringify(expected349(form));
        const got = JSON.stringify(operators);
        if (want !== got) {
          failures++;
          line += ` · OPERADORES MAL: ${got}`;
        } else line += ` · ${operators?.length} operadores iguales`;
      }
      const same = readable.filter((id) => boxes[id] === form.values[id]);
      const wrong = readable.filter((id) => id in boxes && boxes[id] !== form.values[id]);
      const unread = readable.filter((id) => !(id in boxes));
      const extra = Object.keys(boxes).filter((id) => !(id in form.values));
      line += ` · lector: modelo ${read.data.model}, ${year} ${quarter ?? '-'}T, ${
        same.length
      } iguales`;
      if (unread.length) line += `, sin leer ${unread.join(' ')}`;
      if (
        unread.length ||
        wrong.length ||
        extra.length ||
        read.data.model !== model ||
        year !== form.year ||
        quarter !== (YEARLY.includes(model) ? null : 3)
      ) {
        failures++;
        line += ` · MAL ${wrong.map((id) => `${id}=${boxes[id]}≠${form.values[id]}`).join(' ')}`;
        line += ` · DE MÁS ${extra.join(' ')}`;
      }
    }
    console.log(line);
  }
  if (process.env.FIXTURES) {
    const { '100': renta, ...rest } = fixtures;
    writeFileSync(FIXTURE, `${JSON.stringify(rest)}\n`);
    writeFileSync(FIXTURE.replace('.json', '100.json'), `${JSON.stringify(renta)}\n`);
  }
  process.exit(failures > 0 ? 1 : 0);
})();
