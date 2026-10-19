import { readFileSync } from 'fs';
import { join } from 'path';
import { prepareDraft, type DraftInputs, type DraftResult } from '@domain/services/autonomo';
import type { VatMovement } from '@domain/services/autonomo-vat';
import type { QuarterVat } from '@domain/services/autonomo-vat-data';
import type { ManualData } from '@domain/services/autonomo-expenses';

/**
 * The worked case of the Manual práctico de IVA 2025 (AEAT), chapter 9: a manufacturer whose four
 * modelos 303 of 2025 and modelo 390 come filled in the manual (Cap_9_303_es_es.pdf and
 * Cap_9_390_resumen_anual_es_es.pdf, read with pdf.js on 19-10-2026), and the modelo 349 case of the
 * same chapter. Every expected figure is read from docs/casos-practicos/oficiales.json (cases 303-01
 * to 303-04, 390-01, 390-02, 349-01 and 349-02), which copies those forms.
 */
interface Case {
  id: string;
  resultados: { casilla: string | null; concepto: string; importe: number }[];
}
const BANK = join(__dirname, '..', '..', '..', '..', 'docs', 'casos-practicos', 'oficiales.json');
const cases = (JSON.parse(readFileSync(BANK, 'utf8')) as { casos: Case[] }).casos;
const official = (id: string) => (cases.find((c) => c.id === id) as Case).resultados;

/** Movements of the manual's statement: sales with VAT, purchases, imports and intra-EU goods. */
const sale = (month: number, base: number, op?: VatMovement['op']): VatMovement => ({
  date: `2025-${String(month).padStart(2, '0')}-15`,
  type: 'INCOME',
  vatRate: op ? 0 : 21,
  amountCents: Math.round(base * (op ? 100 : 121)),
  ...(op ? { op } : {}),
});
const buy = (
  month: number,
  base: number,
  rate: 10 | 21,
  extra: Partial<VatMovement> = {}
): VatMovement => ({
  date: `2025-${String(month).padStart(2, '0')}-15`,
  type: 'EXPENSE',
  vatRate: rate,
  // Without Spanish VAT on the invoice (intra-EU, import), the amount is the base.
  amountCents: Math.round(base * (extra.op ? 100 : 100 + rate)),
  ...extra,
});

const movements: VatMovement[] = [
  // 1T: sales in Spain (24,000 of them to retailers in the surcharge) and exports.
  sale(2, 83000),
  sale(2, 12000, 'export'),
  buy(2, 47000, 21),
  buy(2, 12000, 21, { op: 'import' }),
  buy(2, 21000, 21, { op: 'intraGoods' }),
  // 2T: an intra-EU supply, exports, an investment good and a French lawyer (intra-EU service).
  sale(5, 91000),
  sale(5, 12000, 'intraEU'),
  sale(5, 9000, 'export'),
  buy(5, 57000, 21),
  buy(5, 5000, 21, { investment: true }),
  buy(5, 36000, 21, { op: 'import' }),
  buy(5, 15000, 21, { op: 'intraGoods' }),
  buy(5, 6000, 21, { op: 'intraServices' }),
  // 3T.
  sale(8, 94200),
  buy(8, 1200, 21),
  buy(8, 6000, 21, { op: 'import' }),
  buy(8, 12000, 21, { op: 'intraGoods' }),
  // 4T: purchases at 10 % and 21 %, exports and the exempt sale of a building (not the usual activity).
  sale(11, 102000),
  sale(11, 12000, 'export'),
  sale(11, 72000, 'exemptOccasional'),
  buy(11, 60000, 10),
  buy(11, 102000, 21),
];

const extras: QuarterVat[] = [
  { re: { r21: 24000 } },
  {
    re: { r21: 12000 },
    // The sale of 2024 that was resolved: it changes this year's VAT, not this year's volume.
    salesFix: { base: -12000, vat: -2520, priorYear: -12000 },
    // Goods sent back to the Dutch supplier: less VAT deducted on the intra-EU acquisition.
    intraFix: { base: -6000, vat: -1260 },
  },
  { re: { r21: 24000 }, salesFix: { base: -6000, vat: -1260 } },
  {
    re: { r21: 12000 },
    salesFix: { base: -3000, vat: -630 },
    deductionFix: { base: -18000, vat: -3780 },
  },
];

const manual: ManualData = {
  profile: {
    workArea: 0,
    homeArea: 0,
    vehicleExclusive: true,
    healthPeople: 0,
    healthDisability: false,
  },
  quarters: extras.map((vat) => ({
    income: { r21: 0, r10: 0, r4: 0, r0: 0 },
    expenses: [],
    vat,
  })) as unknown as ManualData['quarters'],
};

const inputs: DraftInputs = {
  quarters: [0, 1, 2, 3].map(() => ({
    withheld: 0,
    socialSecurity: 0,
    vatNotDeductible: 0,
  })) as DraftInputs['quarters'],
  hardToJustify: false,
  priorYearNet: null,
  exempt130: false,
  vatToOffset: 0,
  // The VAT extras of the quarters travel with the manual data; the movements are the manual's.
  manual,
  // 3,000 € left from the fourth quarter of 2024; in the third quarter the person chose not to apply
  // the 2,106 € to offset; agricultural regime income of the year for the volume of the 390.
  vat: { offsetStart: 3000, skipOffset: [2], reagpVolume: 64176 },
};

const draft = (q: 1 | 2 | 3 | 4): DraftResult => prepareDraft(2025, q, movements, inputs);
const boxes303 = (d: DraftResult) =>
  Object.fromEntries(
    [...d.vat.accrued, ...d.vat.deductible, ...d.vat.info, ...d.vat.settlement].map((b) => [
      b.box,
      b.amount,
    ])
  );

describe.each([
  ['303-01', 1],
  ['303-02', 2],
  ['303-03', 3],
  ['303-04', 4],
] as const)('caso oficial %s (Manual práctico de IVA 2025, cap. 9)', (id, q) => {
  const got = boxes303(draft(q));
  it.each(
    official(id)
      .filter((r) => r.casilla !== null)
      .map((r) => [r.casilla as string, r.concepto, r.importe] as const)
  )('casilla %s · %s = %d', (casilla, _concepto, importe) => {
    expect(got[casilla]).toBeCloseTo(importe, 2);
  });
});

describe('caso oficial 390-01 y 390-02 (resumen anual del mismo fabricante)', () => {
  const m390 = draft(4).m390 as NonNullable<DraftResult['m390']>;
  const got = Object.fromEntries(
    m390.sections.flatMap((s) => s.boxes).map((b) => [b.box, b.amount])
  );
  it.each(
    [...official('390-01'), ...official('390-02')]
      .filter((r) => r.casilla !== null)
      .map((r) => [r.casilla as string, r.concepto, r.importe] as const)
  )('casilla %s · %s = %d', (casilla, _concepto, importe) => {
    expect(got[casilla]).toBeCloseTo(importe, 2);
  });

  it('cuadra con las cuatro autoliquidaciones: 95 − 97 − 662 = 86, sin avisos', () => {
    expect(m390.warnings).toEqual([]);
    expect(m390.reconciliation.map((r) => r.computed)).toEqual([3288, -2106, 18258, -2226]);
    expect(m390.prorrata).toBe(100);
  });
});

describe('caso oficial 349-01 y 349-02 (declaración recapitulativa)', () => {
  const base: Omit<DraftInputs, 'manual'> = { ...inputs, vat: {} };
  const withIntra = (q: number, intra: NonNullable<QuarterVat['intra']>) => ({
    ...base,
    manual: {
      ...manual,
      quarters: manual.quarters.map((x, i) => ({
        ...x,
        vat: i === q ? { intra } : {},
      })) as unknown as ManualData['quarters'],
    },
  });
  it('agrupa por operador y clave: A del holandés, E, T y S del portugués', () => {
    const intra = [
      {
        key: 'A' as const,
        vatId: 'NL000000000B01',
        name: 'Proveedor holandés ficticio',
        base: 3455.25,
      },
      {
        key: 'A' as const,
        vatId: 'NL000000000B01',
        name: 'Proveedor holandés ficticio',
        base: 2841.91,
      },
      {
        key: 'E' as const,
        vatId: 'PT000000000',
        name: 'Cliente portugués ficticio',
        base: 3344.55,
      },
      {
        key: 'T' as const,
        vatId: 'PT000000000',
        name: 'Cliente portugués ficticio',
        base: 10609.31,
      },
      { key: 'S' as const, vatId: 'PT000000000', name: 'Cliente portugués ficticio', base: 5000 },
    ];
    const m349 = prepareDraft(2025, 2, [], withIntra(1, intra)).m349 as NonNullable<
      DraftResult['m349']
    >;
    const amounts = official('349-01').map((r) => r.importe);
    expect(m349.operators.map((o) => [o.vatId.slice(0, 2), o.key, o.base])).toEqual([
      ['NL', 'A', amounts[0]],
      ['PT', 'E', amounts[1]],
      ['PT', 'T', amounts[2]],
      ['PT', 'S', amounts[3]],
    ]);
    expect(m349.boxes.map((b) => b.amount)).toEqual([4, 25251.02, 0, 0]);
    expect(m349.monthly).toBe(false);
  });

  it('la rectificación del 3T da el nuevo total del 2T y lo declarado antes', () => {
    const [rectified, previous] = official('349-02').map((r) => r.importe);
    const intra = [
      {
        key: 'A' as const,
        vatId: 'NL000000000B01',
        name: 'Proveedor holandés ficticio',
        base: rectified,
        rectifies: { year: 2025, quarter: 2 as const, previous },
      },
    ];
    const m349 = prepareDraft(2025, 3, [], withIntra(2, intra)).m349 as NonNullable<
      DraftResult['m349']
    >;
    expect(m349.operators).toEqual([]);
    expect(m349.rectifications).toEqual([
      {
        key: 'A',
        vatId: 'NL000000000B01',
        name: 'Proveedor holandés ficticio',
        base: rectified,
        year: 2025,
        quarter: 2,
        previous,
      },
    ]);
    expect(m349.boxes.map((b) => b.amount)).toEqual([0, 0, 1, rectified]);
  });
});
