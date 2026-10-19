import { PDFDocument, type PDFTextField } from 'pdf-lib';
import { buildFormPdf, type PreviewText } from '@modules/taxforms/application/formPdf';
import { boxesOf, loadLayout, type FormLayout } from '@modules/taxforms/domain/layout';
import { sampleForm } from '@modules/taxforms/domain/samples';
import type { FilledForm } from '@modules/taxforms/domain/values';

const TEXT: PreviewText = {
  banner: 'SIMULACIÓN ORIENTATIVA, NO OFICIAL · Finanverso',
  notice: 'Vista previa para copiar al modelo oficial.',
  legend: 'Casillas vacías: la app no las calcula.',
  pending: 'no calculada',
  page: 'Página {n} de {total}',
  title: 'Modelo 130 · 2026 3T',
};

const fieldsOf = async (bytes: Uint8Array) => {
  const doc = await PDFDocument.load(bytes);
  return Object.fromEntries(
    doc
      .getForm()
      .getFields()
      .map((f) => [f.getName(), (f as PDFTextField).getText() ?? ''])
  );
};

describe('The layouts measured on the BOE', () => {
  it('has the boxes of each form, in the order of its pages', async () => {
    const m130 = await loadLayout('130');
    expect(boxesOf(m130)).toEqual([
      'ejercicio',
      'periodo',
      ...Array.from({ length: 19 }, (_, i) => String(i + 1).padStart(2, '0')),
    ]);
    expect(boxesOf(await loadLayout('111'))).toHaveLength(32);
    expect(boxesOf(await loadLayout('115'))).toEqual([
      'ejercicio',
      'periodo',
      '01',
      '02',
      '03',
      '04',
      '05',
    ]);
    const m303 = await loadLayout('303');
    expect(m303.pages).toHaveLength(6);
    expect(boxesOf(m303)).toEqual(expect.arrayContaining(['01', '27', '46', '71', '112', '73']));
    const m100 = await loadLayout('100');
    expect(m100.pages).toHaveLength(25);
    expect(boxesOf(m100)).toEqual(expect.arrayContaining(['0003', '0435', '0595', '0670']));
    // The made-up Renta of the round trip has no period: its year is printed on the form.
    expect(sampleForm('100', m100).period).toBeNull();
  });

  it('keeps none of the Tax Agency branding', async () => {
    for (const model of ['130', '111', '115', '303', '100'] as const) {
      const texts = (await loadLayout(model)).pages.flatMap((p) => p.t.map((t) => t[4]));
      expect(
        texts.filter((t) => /^Agencia Tributaria$|agenciatributaria|^MINISTERIO/.test(t))
      ).toEqual([]);
    }
  });
});

describe('The PDF of a preview', () => {
  it('has a field in every box of the 130, with the figure typed in', async () => {
    const layout = await loadLayout('130');
    const form = sampleForm('130', layout);
    const fields = await fieldsOf(await buildFormPdf(layout, form, TEXT));
    expect(fields.ejercicio).toBe('2026');
    expect(fields.periodo).toBe('3T');
    expect(fields['casilla.01']).toBe('1.234,57');
    expect(fields['casilla.07']).toBe('-8.641,99');
    expect(Object.keys(fields)).toHaveLength(21);
  });

  it('leaves empty the boxes the app does not give', async () => {
    const layout = await loadLayout('111');
    const form: FilledForm = {
      model: '111',
      year: 2026,
      period: '1T',
      values: { '07': 2, '08': 3000, '09': 450 },
      pending: [],
    };
    const fields = await fieldsOf(await buildFormPdf(layout, form, TEXT));
    expect(fields['casilla.07']).toBe('2');
    expect(fields['casilla.09']).toBe('450,00');
    expect(fields['casilla.28']).toBe('');
  });

  it('draws a box printed twice with one field per cell and its value once', async () => {
    const layout: FormLayout = {
      model: 'x',
      source: 'test',
      // Pure black is drawn in the dark blue of the forms; texts on it in white.
      colors: [
        [0, 0, 0],
        [255, 255, 255],
      ],
      pages: [
        {
          t: [
            [100, 700, 8, 1, 'Sección − dark', 40],
            [90, 600, 7, 2, 'Turned', null],
            [300, 600, 7, 0, 'Light → text ✓', null],
            [100, 500, 6, 0, 'No cell under it', null],
          ],
          r: [
            [90, 690, 200, 20, 0, -1, 0, 2],
            [80, 590, 20, 40, 0, 0, 1, 1],
            [290, 590, 100, 20, 1, 0, 0.5, 3],
          ],
          l: [[50, 400, 500, 400, 0, 0.5, 0]],
          b: [
            ['0154', 400, 300, 60, 9],
            ['0154', 400, 280, 60, 9],
            ['0150', 400, 260, 60, 9],
            ['0151', 400, 240, 60, 9],
          ],
        },
      ],
    };
    const form: FilledForm = {
      model: '100',
      year: 2025,
      period: null,
      values: { '0154': 10 },
      pending: ['0150'],
    };
    const fields = await fieldsOf(await buildFormPdf(layout, form, TEXT));
    expect(fields).toEqual({
      'casilla.0154': '10,00',
      'casilla.0154_2': '',
      'casilla.0150': '',
      'casilla.0151': '',
    });
  });

  it('builds the 25 pages of the Renta', async () => {
    const layout = await loadLayout('100');
    const form: FilledForm = {
      model: '100',
      year: 2025,
      period: null,
      values: { '0003': 30000 },
      pending: ['0012'],
    };
    const doc = await PDFDocument.load(await buildFormPdf(layout, form, TEXT));
    expect(doc.getPageCount()).toBe(25);
    expect(doc.getForm().getTextField('casilla.0003').getText()).toBe('30.000,00');
    expect(doc.getTitle()).toBe('Modelo 130 · 2026 3T');
  }, 30000);
});
