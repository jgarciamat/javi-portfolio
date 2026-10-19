import { parseTaxModelTokens, type PdfToken } from '@modules/finances/domain/taxModelPdf';
import { loadLayout, type FormModel } from '@modules/taxforms/domain/layout';
import { expected349, readableBoxes, YEARLY } from '@modules/taxforms/domain/roundTrip';
import { sampleForm } from '@modules/taxforms/domain/samples';
import fixtures from './fixtures/formTokens.json';
import renta from './fixtures/formTokens100.json';

/**
 * The PDFs of the previews, read with the real pdf.js by `npm run taxforms:verify` (FIXTURES=1):
 * the app's own reader of filed forms must find the model, the period and every box it knows with
 * the figure the preview typed in.
 */
const tokens = fixtures as Record<string, PdfToken[][]>;

const MODELS: FormModel[] = [
  ...['130', '111', '115', '303', '131', '390', '349', '190', '180', '347', '309', '123'],
] as FormModel[];

describe.each(MODELS)('The preview of the %s, read back', (model) => {
  it('gives the same boxes, the year and the quarter', async () => {
    const form = sampleForm(model, await loadLayout(model));
    const read = parseTaxModelTokens(tokens[model]);
    if (!read.ok) throw new Error(read.reason);
    expect(read.data.model).toBe(model);
    expect(read.data.year).toBe(2026);
    // The summaries of a year print no quarter.
    expect(read.data.quarter).toBe(YEARLY.includes(model) ? null : 3);
    // Every box read has the figure typed in, and none is read that was not typed.
    for (const [id, value] of Object.entries(read.data.boxes)) expect(form.values[id]).toBe(value);
    // Every box comes back, the page of the prorrata of the 303 (500-524, 700-735) included; its
    // page 4 says «exonerados de la Declaración-resumen anual» and it is still read as a 303. The
    // rates the 390 prints by some boxes («1,75» by the 41) do not take the place of the figure.
    expect(Object.keys(read.data.boxes).length).toBe(readableBoxes(form).length);
  });
});

describe('The preview of the 349, read back', () => {
  it('gives every operator and every correction, over two inner sheets of each', async () => {
    const form = sampleForm('349', await loadLayout('349'));
    const read = parseTaxModelTokens(tokens['349']);
    if (!read.ok) throw new Error(read.reason);
    // 15 operators and 10 corrections fill a sheet each; the sample adds one more of each.
    expect(read.data.operators).toHaveLength(27);
    expect(read.data.operators).toEqual(expected349(form));
    expect(expected349({ ...form, texts: undefined })).toEqual([]);
    expect(read.data.operators?.[16]).toMatchObject({
      vatId: 'DE100001111',
      name: 'OPERADOR RECTIFICADO 1',
      rectifies: { year: 2025, quarter: 2 },
    });
  });
});

describe('The preview of the Renta (modelo 100), read back', () => {
  it('gives every four-digit box with its figure, and the year printed on the form', async () => {
    const form = sampleForm('100', await loadLayout('100'));
    const read = parseTaxModelTokens(renta as PdfToken[][]);
    if (!read.ok) throw new Error(read.reason);
    expect(read.data.model).toBe('100');
    expect(read.data.year).toBe(2025);
    expect(read.data.quarter).toBeNull();
    for (const [id, value] of Object.entries(read.data.boxes)) expect(form.values[id]).toBe(value);
    expect(Object.keys(read.data.boxes)).toHaveLength(readableBoxes(form).length);
    expect(readableBoxes(form)).toHaveLength(840);
  });
});
