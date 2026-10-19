import type { ImportedInvoice } from '@modules/finances/domain/invoiceLedger';
import { summary180, summary190, summary347 } from '@modules/finances/domain/annualSummaries';
import { form131 as module131 } from '@modules/finances/domain/module131';
import type { Draft349, Draft390 } from '@modules/finances/domain/types';
import type { WithholdingQuarter } from '@modules/finances/domain/withholdings';
import { buildFormPdf } from '@modules/taxforms/application/formPdf';
import { loadLayout } from '@modules/taxforms/domain/layout';
import {
  boxValue,
  form131,
  form180,
  form190,
  form347,
  form349,
  form390,
  kindOf,
  sheetsOf,
} from '@modules/taxforms/domain/values';
import { autonomoDraft } from '@test-utils/fixtures';
import { PDFDocument, type PDFTextField } from 'pdf-lib';

/** Every person, tax id and figure below is made up. */
let n = 0;
const invoice = (over: Partial<ImportedInvoice>): ImportedInvoice => {
  const base = over.base ?? 1000;
  const vat = over.vat ?? Math.round(base * 21) / 100;
  return {
    id: `i${++n}`,
    book: 'received',
    kind: 'other',
    excluded: false,
    date: '2026-02-10',
    quarter: 1,
    base,
    vatRate: 21,
    vat,
    total: base + vat,
    withheld: 0,
    concept: 'Proveedor inventado',
    ...over,
  };
};

const quarter = (over: Partial<WithholdingQuarter> = {}): WithholdingQuarter => ({
  staff: { people: 0, paid: 0, withheld: 0, kindPeople: 0, kindPaid: 0, kindWithheld: 0 },
  pros: { people: 0, paid: 0, withheld: 0 },
  rent: { people: 0, paid: 0, withheld: 0 },
  filed111: false,
  filed115: false,
  ...over,
});
const quarters = [0, 1, 2, 3].map(() => quarter());

const TEXT = {
  banner: 'SIMULACIÓN ORIENTATIVA, NO OFICIAL · Finanverso',
  notice: 'Vista previa.',
  legend: 'Casillas vacías.',
  pending: 'no calculada',
  page: 'Página {n} de {total}',
  title: 'Vista previa',
  approx: 'Maquetación aproximada.',
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

describe('The 190 and the 180 of a year, from the invoices', () => {
  const invoices = [
    invoice({ concept: 'Ana Diseño', nif: '00000001R', base: 1200, retention: 180 }),
    invoice({ concept: 'Luis Código', base: 500, retention: 35 }),
    invoice({ concept: 'Local', nif: '00000003A', kind: 'rent', base: 400, retention: 76 }),
  ];

  it('writes one block per payee with its key, subkey and figures', () => {
    const form = form190(summary190(2026, invoices, quarters), 2026);
    // 01: two payees; 02: 1,200 + 500; 03: 180 + 35.
    expect(form.values).toMatchObject({ '01': 2, '02': 1700, '03': 215 });
    expect(form.texts).toEqual({
      '1.nif': '00000001R',
      '1.nombre': 'Ana Diseño',
      '1.clave': 'G',
      '1.subclave': '01',
      '2.nombre': 'Luis Código',
      '2.clave': 'G',
      '2.subclave': '03',
    });
    expect(form.values['1.integra']).toBe(1200);
    expect(form.values['2.retenciones']).toBe(35);
    expect(form.period).toBeNull();
  });

  it('writes the pay in kind of the employees typed by hand, with no subkey', () => {
    const typed = [
      quarter({
        staff: {
          ...quarter().staff,
          paid: 2000,
          kindPaid: 100,
          withheld: 300,
          kindWithheld: 10,
          people: 1,
          kindPeople: 1,
        },
      }),
      ...quarters.slice(1),
    ];
    const form = form190(summary190(2026, [], typed), 2026);
    expect(form.values).toMatchObject({
      '1.integra': 2000,
      '1.especie': 100,
      '1.retenciones': 310,
    });
    expect(form.texts).toEqual({ '1.clave': 'A' });
  });

  it('writes one landlord per block of the 180, with the rate of its last invoice', () => {
    const form = form180(summary180(2026, invoices, quarters), 2026);
    expect(form.values).toEqual({
      '01': 1,
      '02': 400,
      '03': 76,
      '1.base': 400,
      '1.pct': 19,
      '1.retenciones': 76,
    });
    expect(form.texts).toEqual({ '1.nif': '00000003A', '1.nombre': 'Local' });
    expect(kindOf('180', '1.pct')).toBe('percent');
    // Rent typed by hand has the rate of the year and no person.
    const typed = [
      quarter({ rent: { people: 1, paid: 1000, withheld: 190 } }),
      ...quarters.slice(1),
    ];
    const hand = form180(summary180(2026, [], typed), 2026);
    expect(hand.texts).toEqual({});
    expect(hand.values['1.pct']).toBe(19);
  });

  it('adds the totals of each inner sheet, the pay in kind included', async () => {
    const layout = await loadLayout('190');
    const form = form190(summary190(2026, [], quarters), 2026);
    form.values = {
      ...form.values,
      '1.integra': 100,
      '1.especie': 5,
      '3.retenciones': 7,
      '4.integra': 50,
    };
    const sheets = sheetsOf(layout, form);
    expect(sheets).toHaveLength(3);
    expect(sheets[1].totals).toEqual({ 'hoja1.percepciones': 105, 'hoja1.retenciones': 7 });
    expect(sheets[2].totals).toEqual({ 'hoja2.percepciones': 50 });
    expect(sheets[2].boxes.map((b) => b[0])).toContain('6.nif');
    const fields = await fieldsOf(await buildFormPdf(layout, form, TEXT));
    expect(fields['casilla.hoja1.percepciones']).toBe('105,00');
    expect(fields['casilla.hoja2.retenciones']).toBe('');
    expect(fields['casilla.4.integra']).toBe('50,00');
  });

  it('draws one empty inner sheet when there are no payees', async () => {
    const layout = await loadLayout('180');
    const form = form180(summary180(2026, [], quarters), 2026);
    expect(sheetsOf(layout, form)).toHaveLength(2);
    expect(sheetsOf(layout, { ...form, texts: undefined })).toHaveLength(2);
    expect(boxValue(form, 'hoja1.base')).toBeNull();
    const doc = await PDFDocument.load(await buildFormPdf(layout, form, TEXT));
    expect(doc.getPageCount()).toBe(2);
  });
});

describe('The 347 of a year', () => {
  it('writes each person with its key, the quarters and the marks of rent and reverse charge', () => {
    const invoices = [
      invoice({ concept: 'Local SL', nif: 'B00000000', kind: 'rent', base: 3000 }),
      invoice({
        concept: 'Obra SL',
        op: 'reverse',
        base: 4000,
        vat: 0,
        quarter: 2,
        date: '2026-05-01',
      }),
      invoice({
        book: 'issued',
        concept: 'Cliente SA',
        nif: 'A00000000',
        base: 5000,
        quarter: 3,
        date: '2026-08-01',
      }),
    ];
    const form = form347(summary347(2026, invoices), 2026);
    // 3,000 × 1.21 = 3,630; 4,000; 5,000 × 1.21 = 6,050.
    expect(form.values).toMatchObject({ '01': 3, '02': 13680, '1.total': 3630, '1.t1': 3630 });
    expect(form.values['2.t2']).toBe(4000);
    expect(form.texts).toMatchObject({
      '1.nif': 'B00000000',
      '1.clave': 'A',
      '1.local': 'X',
      '2.nombre': 'Obra SL',
      '2.isp': 'X',
      '3.clave': 'B',
    });
    expect(form.texts?.['2.nif']).toBeUndefined();
  });
});

describe('The 349, the 390 and the 131 of a quarter', () => {
  const m349: Draft349 = {
    required: true,
    monthly: false,
    operators: [{ key: 'E', vatId: 'FR12345678901', name: 'Client Paris', base: 1500 }],
    rectifications: [
      {
        key: 'S',
        vatId: 'DE123456789',
        name: 'Kunde',
        base: 800,
        year: 2026,
        quarter: 1,
        previous: 700,
      },
    ],
    boxes: [
      { box: 'operadores', label: 'Operadores', amount: 1 },
      { box: 'importe', label: 'Importe', amount: 1500 },
      { box: 'operadoresRect', label: 'Operadores rect.', amount: 1 },
      { box: 'importeRect', label: 'Importe rect.', amount: 800 },
      { box: 'otra', label: 'Sin casilla', amount: 9 },
    ],
    warnings: [],
  };

  it('writes the 349 with the country apart from the VAT number', () => {
    const form = form349(autonomoDraft({ quarter: 2, m349 }));
    expect(form?.values).toEqual({
      '01': 1,
      '02': 1500,
      '03': 1,
      '04': 800,
      '1.base': 1500,
      '1.rbase': 800,
      '1.ranterior': 700,
    });
    expect(form?.texts).toEqual({
      '1.pais': 'FR',
      '1.nif': '12345678901',
      '1.nombre': 'Client Paris',
      '1.clave': 'E',
      '1.rpais': 'DE',
      '1.rnif': '123456789',
      '1.rnombre': 'Kunde',
      '1.rclave': 'S',
      '1.rejercicio': '2026',
      '1.rperiodo': '1T',
    });
    expect(form?.period).toBe('2T');
    expect(form349(autonomoDraft({ m349: { ...m349, required: false } }))).toBeNull();
    expect(form349(autonomoDraft())).toBeNull();
  });

  it('repeats the sheet of operators as needed, and leaves one of corrections empty', async () => {
    const operators = Array.from({ length: 16 }, (_, i) => ({
      key: 'E' as const,
      vatId: `FR${10000000000 + i}`,
      name: `CLIENTE ${i + 1}`,
      base: 100,
    }));
    const form = form349(autonomoDraft({ m349: { ...m349, operators, rectifications: [] } }));
    const sheets = sheetsOf(await loadLayout('349'), form as NonNullable<typeof form>);
    expect(sheets).toHaveLength(4);
    expect(sheets[2].boxes.map((b) => b[0])).toContain('16.nif');
    expect(sheets[2].totals).toEqual({ 'hoja2.base': 100 });
    expect(sheets[3].totals).toEqual({});
  });

  it('writes every box of the sections of the 390 for the year', () => {
    const m390: Draft390 = {
      sections: [
        { id: 'accrued', boxes: [{ box: '05', label: 'Base 21 %', amount: 10000 }] },
        { id: 'result', boxes: [{ box: '86', label: 'Resultado', amount: 2100 }] },
      ],
      prorrata: 100,
      reconciliation: [],
      warnings: [],
    };
    expect(form390(autonomoDraft({ quarter: 4, m390 }))).toEqual({
      model: '390',
      year: 2026,
      period: null,
      values: { '05': 10000, '86': 2100 },
      pending: [],
    });
    expect(form390(autonomoDraft())).toBeNull();
  });

  it('writes the 131 that module131 works out', () => {
    const result = module131({
      year: 2026,
      quarter: 1,
      activities: [{ net: 10000, staffUnits: 0 }],
      withheld: 0,
      lastYearNet: null,
      pendingNegative: 0,
    });
    const form = form131(result as NonNullable<typeof result>, 2026, 1);
    // 02: 2 % of 10,000 with no employees; 09: the cut for no income last year (100); 15: 200 − 100.
    expect(form.values).toMatchObject({ '01': 10000, '02': 200, '09': 100, '15': 100 });
    expect(form.period).toBe('1T');
  });
});
