import {
  parseTaxModelTokens,
  quarterFrom111,
  quarterFrom115,
  type PdfToken,
  type TaxModelParse,
} from '@modules/finances/domain/taxModelPdf';
import { emptyManual, type ManualForm } from '@modules/finances/ui/components/AutonomoManual';
import { importModel } from '@modules/finances/ui/components/importFiles';
import { withholdingsOfForm } from '@modules/finances/ui/components/withholdingForm';
import type { ImportedInvoice } from '@modules/finances/domain/invoiceLedger';

const text = (t: string, x: number, y: number): PdfToken => ({ text: t, x, y, field: false });
const typed = (t: string, x: number, y: number): PdfToken => ({ text: t, x, y, field: true });

/** A form as the templates of the app print it: the title, the period and a box per line. */
const page = (title: string[], boxes: Record<string, string>): PdfToken[] => [
  ...title.map((line, i) => text(line, 40, 800 - i * 13)),
  text('Ejercicio', 40, 740),
  typed('2026', 100, 740),
  text('Período', 175, 740),
  typed('2T', 225, 740),
  ...Object.entries(boxes).flatMap(([box, amount], i) => [
    text(box, 405, 600 - i * 22),
    typed(amount, 432, 600 - i * 22),
  ]),
];

const TITLE_111 = [
  'Modelo 111 · plantilla de Finanverso',
  'Retenciones e ingresos a cuenta. Rendimientos del trabajo y de actividades económicas,',
  'premios y determinadas ganancias patrimoniales e imputaciones de renta · Autoliquidación',
];
const TITLE_115 = [
  'Modelo 115 · plantilla de Finanverso',
  'Retenciones e ingresos a cuenta. Rentas o rendimientos procedentes del',
  'arrendamiento o subarrendamiento de inmuebles urbanos · Autoliquidación',
];

describe('Reading a filed modelo 111 or 115', () => {
  it('knows each one by its title and reads its boxes', () => {
    const m111 = parseTaxModelTokens([
      page(TITLE_111, { '01': '2', '02': '7.500,00', '03': '750,00', '09': '26,00', '30': '776' }),
    ]);
    expect(m111).toEqual({
      ok: true,
      data: {
        model: '111',
        year: 2026,
        quarter: 2,
        boxes: { '01': 2, '02': 7500, '03': 750, '09': 26, '30': 776 },
      },
    });
    const m115 = parseTaxModelTokens([page(TITLE_115, { '01': '1', '03': '76,00', '06': '5' })]);
    // 06 is no box of the 115.
    expect(m115.ok && m115.data).toMatchObject({ model: '115', boxes: { '01': 1, '03': 76 } });
  });

  it('still takes the modelo 130 for what it is, though it speaks of withholdings too', () => {
    const m130 = parseTaxModelTokens([
      page(
        [
          'Modelo 130 · Pago fraccionado',
          'Actividades económicas en estimación directa',
          'Retenciones e ingresos a cuenta soportados',
          'Rendimientos del trabajo',
        ],
        { '01': '100,00' }
      ),
    ]);
    expect(m130.ok && m130.data.model).toBe('130');
  });

  it('gives the employees and professionals of the 111, and the rent of the 115', () => {
    expect(
      quarterFrom111({ '01': 2, '02': 7500, '03': 750, '05': 300, '07': 2, '09': 26, '15': 4 })
    ).toEqual({
      staff: {
        people: 2,
        paid: 7500,
        withheld: 750,
        kindPeople: 0,
        kindPaid: 300,
        kindWithheld: 0,
      },
      pros: { people: 2, paid: 0, withheld: 26 },
      ignored: ['15'],
    });
    expect(quarterFrom115({ '01': 1, '02': 400, '03': 76 })).toEqual({
      people: 1,
      paid: 400,
      withheld: 76,
    });
  });
});

const ok = (model: '111' | '115', boxes: Record<string, number>, quarter = 2): TaxModelParse => ({
  ok: true,
  data: { model, year: 2026, quarter: quarter as 1 | 2 | 3 | 4, boxes },
});

const gestoria: ImportedInvoice = {
  id: 'g2',
  book: 'received',
  kind: 'management',
  excluded: false,
  date: '2026-05-10',
  quarter: 2,
  base: 150,
  vatRate: 21,
  vat: 31.5,
  total: 181.5,
  withheld: 0,
  retention: 22.5,
  concept: 'Gestoría Pérez',
};

describe('Importing a filed modelo 111 or 115', () => {
  it('fills the employees and professionals of its quarter: the invoices no longer add', () => {
    const form: ManualForm = { ...emptyManual(), invoices: [gestoria] };
    const applied = importModel(
      form,
      ok('111', { '01': 2, '02': 7500, '03': 750, '07': 2, '08': 200, '09': 26, '12': 3 }),
      2026,
      [2026]
    );
    expect(applied.period).toEqual({ year: 2026, quarter: 2 });
    expect(applied.lines).toEqual([
      { tone: 'done', key: 'app.autonomo.model.done.111', values: { year: 2026, quarter: 2 } },
      { tone: 'note', key: 'app.autonomo.model.note.filed', values: { quarter: 2 } },
      { tone: 'note', key: 'app.autonomo.model.note.ignored111', values: { boxes: '12' } },
    ]);
    const next = applied.form as ManualForm;
    expect(next.withholdings?.[1]).toMatchObject({
      staff: { people: '2', paid: '7500', withheld: '750', kindPeople: '' },
      pros: { people: '2', paid: '200', withheld: '26' },
      filed111: true,
      filed115: false,
    });
    // 750 + 26 = 776: the gestoría's 22.50 is in the filed figures already.
    expect(withholdingsOfForm(next, 2026, 2).m111.due).toBe(776);
  });

  it('fills the rent of its quarter, without a note when no invoice is replaced', () => {
    const form: ManualForm = { ...emptyManual(), invoices: [gestoria] };
    const applied = importModel(form, ok('115', { '01': 1, '02': 400, '03': 76 }, 4), 2026, [2026]);
    expect(applied.lines).toEqual([
      { tone: 'done', key: 'app.autonomo.model.done.115', values: { year: 2026, quarter: 4 } },
    ]);
    expect((applied.form as ManualForm).withholdings?.[3]).toMatchObject({
      rent: { people: '1', paid: '400', withheld: '76' },
      filed115: true,
    });
    // The fourth quarter can be imported: it is not handed to a next one, like the 130.
    expect(applied.period).toEqual({ year: 2026, quarter: 4 });
  });

  it('notes the invoices it replaces only when they are of its quarter and its form', () => {
    const rent: ImportedInvoice = {
      ...gestoria,
      id: 'r2',
      kind: 'rent',
      concept: 'Local',
      base: 400,
      retention: 76,
    };
    const others = [
      { ...rent, id: 'x1', excluded: true },
      { ...rent, id: 'x2', quarter: 1 as const },
      { ...rent, id: 'x3', book: 'issued' as const },
      { ...rent, id: 'x4', retention: 0 },
    ];
    const lines = (invoices: ImportedInvoice[]) =>
      importModel({ ...emptyManual(), invoices }, ok('115', { '03': 76 }), 2026, [2026]).lines.map(
        (l) => l.key
      );
    expect(lines(others)).toEqual(['app.autonomo.model.done.115']);
    expect(lines([...others, rent])).toEqual([
      'app.autonomo.model.done.115',
      'app.autonomo.model.note.filed',
    ]);
  });
});
