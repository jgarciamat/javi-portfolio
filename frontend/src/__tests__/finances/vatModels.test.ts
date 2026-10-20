import { readFileSync } from 'fs';
import { join } from 'path';
import {
  carryFrom390,
  parseTaxModelTokens,
  type PdfToken,
  type TaxModelPdf,
} from '@modules/finances/domain/taxModelPdf';
import { importModel } from '@modules/finances/ui/components/importFiles';
import { emptyManual } from '@modules/finances/ui/components/AutonomoManual';

/**
 * The VAT forms as the real pdf.js reads them (scripts/verify-tax-models.ts wrote the pieces): the
 * filled 303 (first quarter) and 390 of the Manual práctico de IVA 2025 of the AEAT, chapter 9, and
 * the example forms of docs/ejemplos-importacion. The official figures are the cases 303-01 and
 * 390-01/02 of docs/casos-practicos/oficiales.json.
 */
const FIXTURE = join(__dirname, 'fixtures', 'vatModelTokens.json');
const pages = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Record<string, PdfToken[][]>;
const BANK = join(__dirname, '..', '..', '..', '..', 'docs', 'casos-practicos', 'oficiales.json');
const official = (id: string) =>
  (
    JSON.parse(readFileSync(BANK, 'utf8')) as {
      casos: { id: string; resultados: { casilla: string | null; importe: number }[] }[];
    }
  ).casos.find((c) => c.id === id)?.resultados ?? [];

const read = (file: string): TaxModelPdf => {
  const parsed = parseTaxModelTokens(pages[file]);
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.data;
};

describe('The official filled forms of the Manual práctico de IVA 2025', () => {
  it('reads the 303 of the first quarter with every box of case 303-01', () => {
    const data = read('Cap_9_303_es_es.pdf');
    expect(data).toMatchObject({ model: '303', year: 2025, quarter: 1 });
    for (const r of official('303-01')) expect(data.boxes[r.casilla as string]).toBe(r.importe);
  });

  it('reads the 390 with the boxes of cases 390-01 and 390-02 (the year in four boxes)', () => {
    const data = read('Cap_9_390_resumen_anual_es_es.pdf');
    expect(data).toMatchObject({ model: '390', year: 2025, quarter: null });
    const figures = [...official('390-01'), ...official('390-02')].filter(
      // 105 is not printed in the form: it comes from the formula of the 108.
      (r) => r.casilla !== null && r.casilla !== '105'
    );
    for (const r of figures)
      expect([r.casilla, data.boxes[r.casilla as string]]).toEqual([r.casilla, r.importe]);
    // What the 390 hands to 2026: nothing of prorrata, and 2,226 + 2,106 € to offset.
    expect(carryFrom390(data.boxes)).toEqual({ prorrata: null, toOffset: 4332 });
  });
});

describe('The example forms of docs/ejemplos-importacion', () => {
  it('reads the 303, the 349 and the 390 of the trader with the EU', () => {
    expect(read('ejemplo-ue-modelo-303-2T-2026.pdf')).toMatchObject({
      model: '303',
      year: 2026,
      quarter: 2,
      boxes: { '07': 5000, '59': 1500, '60': 1000, '71': 672 },
    });
    expect(read('ejemplo-ue-modelo-349-2T-2026.pdf')).toEqual({
      model: '349',
      year: 2026,
      quarter: 2,
      boxes: {},
      operators: [
        { key: 'S', vatId: 'PT000000000', name: 'Consultoria Ficticia Lda', base: 1500 },
        { key: 'A', vatId: 'DE000000001', name: 'Lieferant Beispiel GmbH', base: 1200 },
        { key: 'I', vatId: 'IE0000000A', name: 'Example Software Ltd', base: 300 },
      ],
    });
    expect(read('ejemplo-ue-modelo-390-2026.pdf').boxes).toMatchObject({
      '86': 1622,
      '108': 31500,
    });
  });
});

const text = (t: string, x: number, y: number, more: Partial<PdfToken> = {}): PdfToken => ({
  text: t,
  x,
  y,
  field: false,
  ...more,
});

describe('Reading a 349 line by line', () => {
  const title = text('Declaración recapitulativa de operaciones intracomunitarias', 40, 800);
  it('takes the operators and the corrections, and skips the lines that are not one', () => {
    const parsed = parseTaxModelTokens([
      [
        title,
        text('Ejercicio', 40, 760),
        text('2025', 100, 760),
        text('Período', 175, 760),
        text('3T', 225, 760),
        // An operator, a correction of the 2T, and lines without a key, a VAT number or a base.
        text('fr 000.000.000.01', 40, 700),
        text('Client', 150, 700),
        text('E', 360, 700),
        text('1.000,00', 410, 700),
        text('NL000000000B01', 40, 680),
        text('Proveedor', 150, 680),
        text('A', 270, 680),
        text('2025', 305, 680),
        text('2T', 355, 680),
        text('2841,91', 400, 680),
        text('6297.16', 480, 680),
        text('PT000000000', 40, 660),
        text('500,00', 410, 660),
        text('Z', 360, 640),
        text('100,00', 410, 640),
        text('US123456', 40, 620),
        text('S', 360, 620),
        text('9,00', 410, 620),
      ],
    ]);
    if (!parsed.ok) throw new Error('no');
    expect(parsed.data.quarter).toBe(3);
    expect(parsed.data.operators).toEqual([
      { key: 'E', vatId: 'FR00000000001', name: 'Client', base: 1000 },
      {
        key: 'A',
        vatId: 'NL000000000B01',
        name: 'Proveedor',
        base: 2841.91,
        rectifies: { year: 2025, quarter: 2, previous: 6297.16 },
      },
    ]);
  });

  it('says there are no operators when it has none', () => {
    expect(parseTaxModelTokens([[title, text('Ejercicio', 40, 760)]])).toEqual({
      ok: false,
      reason: 'noBoxes',
    });
  });
});

describe('Pieces of a number', () => {
  it('joins the pieces that touch, not the typed fields nor the ones apart', () => {
    const parsed = parseTaxModelTokens([
      [
        text('Impuesto sobre el Valor Añadido', 40, 800),
        text('Declaración-resumen anual', 40, 790),
        text('86', 426, 680),
        text('1', 478, 680, { w: 4 }),
        text('7', 482, 680, { w: 4 }),
        text('.', 486, 680, { w: 2 }),
        text('2', 488, 680, { w: 4 }),
        text('14,00', 492, 680),
        text('95', 426, 660),
        text('1', 478, 660, { w: 4 }),
        text('5,00', 500, 660, { w: 18 }),
        text('97', 426, 640),
        text('3', 478, 640, { w: 4, field: true }),
        text('3,00', 482, 640, { field: true }),
      ],
    ]);
    if (!parsed.ok) throw new Error('no');
    expect(parsed.data.boxes).toEqual({ '86': 17214, '95': 5, '97': 3 });
  });
});

describe('Importing a 349 or a 390 into the form', () => {
  const ok = (data: Partial<TaxModelPdf>) => ({
    ok: true as const,
    data: { model: '390' as const, year: 2025, quarter: null, boxes: {}, ...data },
  });

  it('puts the operators of a 349 in the intra-EU operations of its quarter', () => {
    const form = emptyManual();
    const applied = importModel(
      form,
      ok({
        model: '349',
        year: 2026,
        quarter: 2,
        operators: [
          { key: 'S', vatId: 'PT000000000', name: 'Lda', base: 1500 },
          {
            key: 'A',
            vatId: 'NL000000000B01',
            name: 'BV',
            base: 10,
            rectifies: { year: 2026, quarter: 1, previous: 20 },
          },
        ],
      }),
      2026,
      [2026]
    );
    expect(applied.period).toEqual({ year: 2026, quarter: 2 });
    expect(applied.lines[0]).toMatchObject({
      key: 'app.autonomo.model.done.349',
      values: { n: 2 },
    });
    expect(applied.form?.quarters[1].vat?.intra).toEqual([
      {
        key: 'S',
        vatId: 'PT000000000',
        name: 'Lda',
        base: '1500',
        rect: false,
        rectYear: '',
        rectQuarter: '',
        previous: '',
      },
      {
        key: 'A',
        vatId: 'NL000000000B01',
        name: 'BV',
        base: '10',
        rect: true,
        rectYear: '2026',
        rectQuarter: '1',
        previous: '20',
      },
    ]);
    // Without operators read, nothing is left there.
    expect(
      importModel(form, ok({ model: '349', year: 2026, quarter: 3 }), 2026, [2026]).form
        ?.quarters[2].vat?.intra
    ).toEqual([]);
  });

  it('reads the summaries and other forms the app previews, but does not import them', () => {
    for (const model of ['190', '180', '347', '123', '309'] as const) {
      const [line] = importModel(
        emptyManual(),
        ok({ model, boxes: { '01': 1 } }),
        2026,
        [2026]
      ).lines;
      expect(line).toMatchObject({
        tone: 'error',
        key: 'app.autonomo.model.error.informative',
        values: { model },
      });
    }
  });

  it('hands the VAT to offset and the prorrata of last year’s 390 to this year', () => {
    const applied = importModel(
      emptyManual(),
      ok({ boxes: { '97': 2226, '662': 2106, '118': 80 } }),
      2026,
      [2026]
    );
    expect(applied.carry).toEqual({ toOffset: '4332', provisional: '80' });
    expect(applied.form).toBeUndefined();
    expect(applied.lines.map((l) => l.key)).toEqual([
      'app.autonomo.model.done.390',
      'app.autonomo.model.note.prorrata',
    ]);
    // Nothing to offset and a whole prorrata: nothing carried.
    expect(importModel(emptyManual(), ok({ boxes: { '118': 100 } }), 2026, [2026]).carry).toEqual({
      toOffset: '',
      provisional: null,
    });
  });

  it('says what a 390 of this year or of another one is for', () => {
    expect(importModel(emptyManual(), ok({ year: 2026 }), 2026, [2026]).lines[0]).toMatchObject({
      tone: 'note',
      key: 'app.autonomo.model.m390.same',
    });
    expect(importModel(emptyManual(), ok({ year: 2020 }), 2026, [2026]).lines[0]).toMatchObject({
      tone: 'error',
      key: 'app.autonomo.model.m390.year',
    });
    // A 390 without its year is taken as the draft's.
    expect(importModel(emptyManual(), ok({ year: null }), 2026, [2026]).lines[0].key).toBe(
      'app.autonomo.model.m390.same'
    );
  });

  it('keeps the result of a 303 to reconcile the 390, with its sales without VAT', () => {
    const applied = importModel(
      emptyManual(),
      ok({
        model: '303',
        year: 2026,
        quarter: 3,
        boxes: { '07': 100, '59': 50, '71': 21, '14': -10 },
      }),
      2026,
      [2026]
    );
    expect(applied.form?.filed303).toEqual([null, null, 21, null]);
    expect(applied.form?.quarters[2].vat?.sales.intraEU).toBe('50');
    expect(applied.form?.quarters[2].vat?.salesFix).toEqual({
      base: '-10',
      vat: '',
      priorYear: '',
    });
  });
});
