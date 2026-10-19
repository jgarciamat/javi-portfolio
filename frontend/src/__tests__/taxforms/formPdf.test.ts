import { PDFDocument, type PDFTextField } from 'pdf-lib';
import { buildFormPdf, topOf, type PreviewText } from '@modules/taxforms/application/formPdf';
import {
  boxesOf,
  loadLayout,
  slotOf,
  type FormLayout,
  type FormModel,
} from '@modules/taxforms/domain/layout';
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
  });

  it('has the numbered boxes of the new forms and their sheets of records', async () => {
    const numbered = async (model: FormModel) =>
      boxesOf(await loadLayout(model)).filter((id) => /^\d+$/.test(id));
    expect(await numbered('131')).toEqual(
      Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, '0'))
    );
    for (const model of ['190', '180'] as const)
      expect(await numbered(model)).toEqual(['01', '02', '03']);
    expect(await numbered('347')).toEqual(['01', '02', '03', '04']);
    expect(await numbered('349')).toEqual(['01', '02', '03', '04']);
    expect(await numbered('123')).toHaveLength(14);
    expect(await numbered('309')).toHaveLength(27);
    // Some boxes of the 390 repeat (the prorrata of each activity, 114-118).
    const m390 = [...new Set(await numbered('390'))];
    expect(m390).toHaveLength(376);
    expect(m390).toEqual(expect.arrayContaining(['05', '06', '41', '87', '112', '665', '691']));
    // The blocks of a sheet: 3 payees of the 190, 8 landlords of the 180, 15 operators of the 349.
    const rows = async (model: FormModel) => (await loadLayout(model)).pages.map((p) => p.rows);
    expect(await rows('190')).toEqual([undefined, 3]);
    expect(await rows('180')).toEqual([undefined, 8]);
    expect(await rows('347')).toEqual([undefined, 3]);
    expect(await rows('349')).toEqual([undefined, 15, 10]);
    expect(boxesOf(await loadLayout('349')).filter((id) => slotOf(id)?.slot === 15)).toEqual([
      '15.pais',
      '15.nif',
      '15.nombre',
      '15.clave',
      '15.base',
    ]);
    // The layouts rebuilt from a scan say so.
    expect((await loadLayout('180')).approx).toBe(true);
    expect((await loadLayout('115')).approx).toBe(true);
    expect((await loadLayout('190')).approx).toBeUndefined();
  });

  it('keeps none of the Tax Agency branding', async () => {
    const models = ['130', '111', '115', '303', '131', '390', '349', '190', '180', '347'];
    for (const model of [...models, '309', '123'] as FormModel[]) {
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

  it('cuts the page just above the form, so the mark sits on it', async () => {
    const layout = await loadLayout('130');
    const doc = await PDFDocument.load(await buildFormPdf(layout, sampleForm('130', layout), TEXT));
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(595.28);
    // The top of the 130 (the cells of its header, 707.4) + 8 of gap + 30 of mark + 20 of margin.
    expect(topOf(layout.pages[0])).toBeCloseTo(707.4, 0);
    expect(height).toBeCloseTo(topOf(layout.pages[0]) + 58, 0);
  });

  it('writes the words of the records and says when the layout is approximate', async () => {
    const layout = await loadLayout('180');
    const form: FilledForm = {
      model: '180',
      year: 2026,
      period: null,
      values: { '01': 1, '1.base': 1000, '1.pct': 19 },
      texts: { '1.nif': '00000003A', '1.nombre': 'LOCAL DE PRUEBA' },
      pending: [],
    };
    const bytes = await buildFormPdf(layout, form, { ...TEXT, approx: 'Aproximada.' });
    const fields = await fieldsOf(bytes);
    expect(fields).toMatchObject({
      ejercicio: '2026',
      ejercicio_2: '2026',
      'casilla.01': '1',
      'casilla.1.nif': '00000003A',
      'casilla.1.nombre': 'LOCAL DE PRUEBA',
      'casilla.1.pct': '19,00',
      'casilla.hoja1.base': '1.000,00',
      'casilla.2.base': '',
    });
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
    // A yearly form (no period) with a box that repeats.
    const form: FilledForm = {
      model: '130',
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
});

describe('Where a page is cut', () => {
  it('counts the length of a turned text and never goes above the A4', () => {
    const page = { t: [], r: [], l: [], b: [] };
    expect(topOf({ ...page, t: [[50, 600, 6, 2, 'Turned', 40]] })).toBe(640);
    expect(topOf({ ...page, t: [[50, 600, 6, 2, 'Turned', null]] })).toBe(600);
    expect(topOf({ ...page, l: [[0, 500, 10, 520, 0, 1, 0]] })).toBe(520);
    expect(topOf({ ...page, r: [[0, 800, 10, 40, 0, -1, 0, 0]] })).toBeCloseTo(783.89);
  });
});
