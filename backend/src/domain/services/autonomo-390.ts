/**
 * Modelo 390 (annual VAT summary) from the four 303 of the year, with the definitive prorrata, the
 * regularisations of the fourth quarter and the reconciliation with what was filed. Boxes of the 2025
 * design [DR390] and formulas of its instructions [I390] (autonomo-vat-data.ts): the 2026 design is
 * not published yet. Checked with the worked case of the Manual práctico de IVA 2025, chapter 9
 * (cases 390-01 and 390-02 of docs/casos-practicos/oficiales.json).
 */
import { VatRate } from '@domain/ports/repositories';
import type { VatOptions } from './autonomo-vat-data';
import type { Box, QuarterDetail, VatYear } from './autonomo-vat';

export interface Section390 {
  id: 'accrued' | 'deductible' | 'result' | 'liquidations' | 'volume' | 'specific' | 'prorrata';
  boxes: Box[];
}

export interface Reconciliation390 {
  quarter: 1 | 2 | 3 | 4;
  /** Box 71 worked out here and the one filed (null: not given). */
  computed: number;
  filed: number | null;
  difference: number;
}

export type Warning390 =
  | { code: 'filedDiffers'; quarter: number; difference: number }
  | { code: 'identity'; expected: number; got: number }
  | { code: 'exonerated' };

export interface Draft390 {
  sections: Section390[];
  /** Definitive prorrata of the year (100 without exempt sales). */
  prorrata: number;
  reconciliation: Reconciliation390[];
  warnings: Warning390[];
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const euros = (cents: number): number => round2(cents / 100);
const box = (code: string, label: string, cents: number): Box => ({
  box: code,
  label,
  amount: euros(cents),
});
type Money = { base: number; vat: number };
const add = (a: Money, b: Money): Money => ({ base: a.base + b.base, vat: a.vat + b.vat });
const zero = (): Money => ({ base: 0, vat: 0 });

/** The same figure of the four quarters added up. */
function over(details: QuarterDetail[], pick: (d: QuarterDetail) => Money): Money {
  return details.reduce((m, d) => add(m, pick(d)), zero());
}
const overN = (details: QuarterDetail[], pick: (d: QuarterDetail) => number): number =>
  details.reduce((s, d) => s + pick(d), 0);

/** Base and fee boxes of one line of the 390 (e.g. 05 and 06 for the 21 % sales). */
const pair = (base: string, fee: string, label: string, m: Money): Box[] => [
  box(base, `${label}: base imponible`, m.base),
  box(fee, `${label}: cuota`, m.vat),
];

/** By rate: [base box, fee box] of each rate 4, 10 and 21 %, then the totals of the line. */
type RateBoxes = { 4: [string, string]; 10: [string, string]; 21: [string, string] };

function byRateLines(
  details: QuarterDetail[],
  label: string,
  boxes: RateBoxes,
  pick: (d: QuarterDetail, r: VatRate) => Money,
  totals?: [string, string]
): { boxes: Box[]; total: Money } {
  const out: Box[] = [];
  let all = zero();
  for (const r of [4, 10, 21] as const) {
    const m = over(details, (d) => pick(d, r));
    all = add(all, m);
    out.push(...pair(boxes[r][0], boxes[r][1], `${label} al ${r} %`, m));
  }
  if (totals) out.push(...pair(totals[0], totals[1], `Total ${label}`, all));
  return { boxes: out, total: all };
}

/** The 390 of a year from its four quarters (the fourth one already regularised). */
export function draft390(vat: VatYear, options: VatOptions): Draft390 {
  const d = vat.quarters.map((q) => q.detail);
  // 5. Régimen general — IVA devengado [DR390, page 1; I390 casillas 01-34].
  const r0 = over(d, (x) => x.ordinary[0]);
  const ordinary = byRateLines(
    d,
    'Régimen ordinario',
    { 4: ['01', '02'], 10: ['03', '04'], 21: ['05', '06'] },
    (x, r) => x.ordinary[r]
  );
  const cash = byRateLines(
    d,
    'Régimen especial del criterio de caja',
    { 4: ['643', '644'], 10: ['645', '646'], 21: ['647', '648'] },
    (x, r) => (r === 0 ? zero() : x.cash[r as 4 | 10 | 21])
  );
  const aib = byRateLines(
    d,
    'Adquisiciones intracomunitarias de bienes',
    { 4: ['21', '22'], 10: ['23', '24'], 21: ['25', '26'] },
    (x, r) => x.intraGoods[r]
  );
  const ais = byRateLines(
    d,
    'Adquisiciones intracomunitarias de servicios',
    { 4: ['545', '546'], 10: ['547', '548'], 21: ['551', '552'] },
    (x, r) => x.intraServices[r]
  );
  const aib0 = over(d, (x) => x.intraGoods[0]);
  const ais0 = over(d, (x) => x.intraServices[0]);
  const reverse = over(d, (x) => x.reverse);
  const fix = over(d, (x) => x.salesFix);
  // 33 and 34 add every base and fee of the regimes, modified by 29-30 [I390].
  const t33 =
    r0.base +
    ordinary.total.base +
    cash.total.base +
    aib0.base +
    aib.total.base +
    ais0.base +
    ais.total.base +
    reverse.base +
    fix.base;
  const t34 =
    ordinary.total.vat + cash.total.vat + aib.total.vat + ais.total.vat + reverse.vat + fix.vat;
  const re = {
    r05: overN(d, (x) => x.re.r05),
    r14: overN(d, (x) => x.re.r14),
    r52: overN(d, (x) => x.re.r52),
    r175: overN(d, (x) => x.re.r175),
  };
  const fee = (base: number, pct: number): number => Math.round((base * pct) / 100);
  const reFix = over(d, (x) => x.reFix);
  const reFees = fee(re.r05, 0.5) + fee(re.r14, 1.4) + fee(re.r52, 5.2) + fee(re.r175, 1.75);
  // 47 = 34 + 664 + 692 + 36 + 666 + 694 + 600 + 602 + 42 + 44 + 46 [I390].
  const t47 = t34 + reFees + reFix.vat;
  const accrued: Box[] = [
    ...pair('700', '701', 'Régimen ordinario al 0 %', r0),
    ...ordinary.boxes,
    ...cash.boxes,
    ...pair('716', '717', 'Adquisiciones intracomunitarias de bienes al 0 %', aib0),
    ...aib.boxes,
    ...pair('720', '721', 'Adquisiciones intracomunitarias de servicios al 0 %', ais0),
    ...ais.boxes,
    ...pair('27', '28', 'IVA devengado en otros supuestos de inversión del sujeto pasivo', reverse),
    ...pair('29', '30', 'Modificación de bases y cuotas', fix),
    box('33', 'Total bases imponibles', t33),
    box('34', 'Total cuotas', t34),
    box('35', 'Recargo de equivalencia al 0,5 %: base imponible', re.r05),
    box('36', 'Recargo de equivalencia al 0,5 %: cuota', fee(re.r05, 0.5)),
    box('599', 'Recargo de equivalencia al 1,4 %: base imponible', re.r14),
    box('600', 'Recargo de equivalencia al 1,4 %: cuota', fee(re.r14, 1.4)),
    box('601', 'Recargo de equivalencia al 5,2 %: base imponible', re.r52),
    box('602', 'Recargo de equivalencia al 5,2 %: cuota', fee(re.r52, 5.2)),
    box('41', 'Recargo de equivalencia al 1,75 %: base imponible', re.r175),
    box('42', 'Recargo de equivalencia al 1,75 %: cuota', fee(re.r175, 1.75)),
    ...pair('43', '44', 'Modificación del recargo de equivalencia', reFix),
    box('47', 'Total cuotas de IVA y recargo de equivalencia', t47),
  ];

  // IVA deducible [DR390, pages 2-2 bis; I390].
  const ded =
    (channel: keyof QuarterDetail['deducted'], kind: 'current' | 'investment') =>
    (x: QuarterDetail, r: VatRate): Money =>
      x.deducted[channel][kind][r];
  // A correction of an intra-EU acquisition is netted with it, as the worked case of the manual does.
  const intraFixRate = (x: QuarterDetail, r: VatRate): Money => {
    const f = x.intraFix;
    const pct = f.base !== 0 ? Math.round((f.vat * 100) / f.base) : 21;
    const at = ([4, 10, 21] as const).find((v) => v === pct) ?? 21;
    return at === r ? f : zero();
  };
  const interiorCurrent = byRateLines(
    d,
    'Operaciones interiores corrientes',
    { 4: ['190', '191'], 10: ['603', '604'], 21: ['605', '606'] },
    ded('interior', 'current'),
    ['48', '49']
  );
  const interiorInvest = byRateLines(
    d,
    'Operaciones interiores con bienes de inversión',
    { 4: ['196', '197'], 10: ['611', '612'], 21: ['613', '614'] },
    ded('interior', 'investment'),
    ['50', '51']
  );
  const importCurrent = byRateLines(
    d,
    'Importaciones de bienes corrientes',
    { 4: ['202', '203'], 10: ['619', '620'], 21: ['621', '622'] },
    ded('import', 'current'),
    ['52', '53']
  );
  const importInvest = byRateLines(
    d,
    'Importaciones de bienes de inversión',
    { 4: ['208', '209'], 10: ['623', '624'], 21: ['625', '626'] },
    ded('import', 'investment'),
    ['54', '55']
  );
  const aibCurrent = byRateLines(
    d,
    'Adquisiciones intracomunitarias de bienes corrientes',
    { 4: ['214', '215'], 10: ['627', '628'], 21: ['629', '630'] },
    (x, r) => add(x.deducted.intraGoods.current[r], intraFixRate(x, r)),
    ['56', '57']
  );
  const aibInvest = byRateLines(
    d,
    'Adquisiciones intracomunitarias de bienes de inversión',
    { 4: ['220', '221'], 10: ['631', '632'], 21: ['633', '634'] },
    ded('intraGoods', 'investment'),
    ['58', '59']
  );
  const aisDed = byRateLines(
    d,
    'Adquisiciones intracomunitarias de servicios',
    { 4: ['587', '588'], 10: ['635', '636'], 21: ['637', '638'] },
    ded('intraServices', 'current'),
    ['597', '598']
  );
  const deductionFix = over(d, (x) => x.deductionFix);
  const c61 = overN(d, (x) => x.reagp);
  const c63 = overN(d, (x) => x.box43);
  const c522 = overN(d, (x) => x.box44);
  // 64 = 49 + 513 + 51 + 521 + 53 + 55 + 57 + 59 + 598 + 61 + 661 + 62 + 652 + 63 + 522 [DR390].
  const t64 =
    interiorCurrent.total.vat +
    interiorInvest.total.vat +
    importCurrent.total.vat +
    importInvest.total.vat +
    aibCurrent.total.vat +
    aibInvest.total.vat +
    aisDed.total.vat +
    c61 +
    deductionFix.vat +
    c63 +
    c522;
  const t65 = t47 - t64;
  const deductible: Box[] = [
    ...interiorCurrent.boxes,
    ...interiorInvest.boxes,
    ...importCurrent.boxes,
    ...importInvest.boxes,
    ...aibCurrent.boxes,
    ...aibInvest.boxes,
    ...aisDed.boxes,
    box('61', 'Compensaciones del régimen especial de agricultura, ganadería y pesca', c61),
    box('639', 'Rectificación de deducciones: base imponible', deductionFix.base),
    box('62', 'Rectificación de deducciones: cuota', deductionFix.vat),
    box('63', 'Regularización de bienes de inversión', c63),
    box('522', 'Regularización por aplicación del porcentaje definitivo de prorrata', c522),
    box('64', 'Suma de deducciones', t64),
    box('65', 'Resultado régimen general (47 − 64)', t65),
  ];

  // 7. Resultado de la liquidación anual [I390].
  const c658 = overN(d, (x) => x.art80);
  const t84 = t65 + c658;
  const c659 = overN(d, (x) => x.importDeferred);
  const c85 = overN(d, (x) => x.fromPriorYears);
  const t86 = t84 + c659 - c85;
  const result: Box[] = [
    box('658', 'Regularización de cuotas del art. 80.Cinco.5.ª LIVA', c658),
    box('84', 'Suma de resultados (65 + 83 + 658)', t84),
    box('659', 'IVA a la importación liquidado por la Aduana (con diferimiento)', c659),
    box('85', 'Compensación de cuotas del ejercicio anterior', c85),
    box('86', 'Resultado de la liquidación (84 + 659 − 85)', t86),
  ];

  // 9. Resultado de las liquidaciones [I390].
  const c95 = overN(d, (x) => Math.max(0, x.result71));
  const last = d[3];
  const c662 = overN(d.slice(0, 3), (x) => x.pendingAtYearEnd);
  const liquidations: Box[] = [
    box('95', 'Total resultados a ingresar en las autoliquidaciones del ejercicio', c95),
    box('97', 'Resultado del último periodo a compensar', last.box72),
    box('98', 'Resultado del último periodo a devolver', last.box73),
    box(
      '662',
      'Cuotas pendientes de compensación generadas en el ejercicio, distintas de la 97',
      c662
    ),
  ];

  // 10. Volumen de operaciones (art. 121 LIVA) [I390].
  const o = (k: keyof QuarterDetail['other']): number => overN(d, (x) => x.other[k]);
  // Changes of the operations of earlier years do not touch this year's volume.
  const c99 = r0.base + ordinary.total.base + fix.base - overN(d, (x) => x.salesFixPriorYear);
  const c653 = overN(d, (x) => x.cashInvoiced.base);
  const c105 = o('exempt') + o('exemptOccasional');
  const c106 = o('exemptOccasional');
  const c101 = Math.round((options.reagpVolume ?? 0) * 100);
  // 108 = 99 + 653 + 103 + 104 + 105 + 110 + 100 + 101 + 102 + 125 + 126 + 127 + 128 + 227 + 228 − 106 − 107.
  const t108 =
    c99 +
    c653 +
    o('intraEU') +
    o('export') +
    c105 +
    o('notSubject') +
    c101 +
    o('reverse') +
    o('oss') +
    o('ossSubject') -
    c106;
  const volume: Box[] = [
    box('99', 'Operaciones en régimen general', c99),
    box('653', 'Operaciones en régimen especial del criterio de caja', c653),
    box('103', 'Entregas intracomunitarias de bienes y servicios', o('intraEU')),
    box('104', 'Exportaciones y otras operaciones exentas con derecho a deducción', o('export')),
    box('105', 'Operaciones exentas sin derecho a deducción', c105),
    box(
      '110',
      'Operaciones no sujetas por reglas de localización (salvo las de la 126)',
      o('notSubject')
    ),
    box('125', 'Operaciones sujetas con inversión del sujeto pasivo', o('reverse')),
    box('126', 'Operaciones no sujetas acogidas a la ventanilla única', o('oss')),
    box('127', 'Operaciones sujetas y acogidas a la ventanilla única', o('ossSubject')),
    box('101', 'Operaciones en régimen especial de la agricultura, ganadería y pesca', c101),
    box('106', 'Entregas de bienes inmuebles y operaciones financieras no habituales', c106),
    box('108', 'Total volumen de operaciones', t108),
  ];

  // 11. Operaciones específicas [I390].
  const specific: Box[] = [
    box(
      '232',
      'Bases imponibles del IVA soportado no deducible',
      overN(d, (x) => x.nonDeductibleBase)
    ),
    box(
      '523',
      'Servicios localizados en España por inversión del sujeto pasivo',
      ais.total.base + ais0.base
    ),
    ...pair(
      '654',
      '655',
      'Criterio de caja: entregas',
      over(d, (x) => x.cashInvoiced)
    ),
  ];

  // 12. Prorrata (art. 104 LIVA).
  const prorrata: Box[] =
    vat.definitive < 100 || vat.prorrataBase.total > vat.prorrataBase.withRight
      ? [
          box('115', 'Importe total de las operaciones', vat.prorrataBase.total),
          box(
            '116',
            'Importe de las operaciones con derecho a deducción',
            vat.prorrataBase.withRight
          ),
          { box: '118', label: '% de prorrata definitivo', amount: vat.definitive },
        ]
      : [];

  // Reconciliation: each quarter against the 303 filed, and the identity of the results [I390].
  const reconciliation: Reconciliation390[] = d.map((x, i) => {
    const filed = options.filed?.[i] ?? null;
    const computed = euros(x.result71);
    return {
      quarter: (i + 1) as 1 | 2 | 3 | 4,
      computed,
      filed,
      difference: filed === null ? 0 : round2(computed - filed),
    };
  });
  const warnings: Warning390[] = reconciliation
    .filter((r) => r.difference !== 0)
    .map((r) => ({ code: 'filedDiffers', quarter: r.quarter, difference: r.difference }));
  // 86 must be what was paid minus what is left to offset or to be refunded.
  const expected = c95 - last.box72 - last.box73 - c662;
  if (expected !== t86)
    warnings.push({ code: 'identity', expected: euros(expected), got: euros(t86) });
  if (options.regime === 'simplified') warnings.push({ code: 'exonerated' });

  return {
    sections: [
      { id: 'accrued', boxes: accrued },
      { id: 'deductible', boxes: deductible },
      { id: 'result', boxes: result },
      { id: 'liquidations', boxes: liquidations },
      { id: 'volume', boxes: volume },
      { id: 'specific', boxes: specific },
      { id: 'prorrata', boxes: prorrata },
    ],
    prorrata: vat.definitive,
    reconciliation,
    warnings,
  };
}
