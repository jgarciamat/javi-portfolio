/**
 * Case bank: the solved examples of the AEAT manuals (docs/casos-practicos/oficiales.json) that the
 * app's engine can reproduce, run through it with the figures of the source. Each check names its
 * case; the cases with no automatic check are listed as todos with the reason. A known discrepancy
 * (discrepancias.json, «oficiales») passes while the engine still gives the recorded value.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  applyMinimum,
  applyScale,
  computeMinimum,
  computeRenta,
  deductionAmount,
  generalQuota,
  incomeFactor,
  lowPayDeduction,
  mergeMinimums,
  splitDeduction,
  type Child,
  type RentaInput,
} from '@modules/tools/domain/rentaCalc';
import type { Deduction, RentaCcaa } from '@modules/tools/domain/rentaData';
import { donationResult } from '@modules/tools/domain/rentaDonations';
import { emptyForm, rentalOf, toInput } from '@modules/tools/domain/rentaForm';
import {
  emptySavingsDetail,
  fifo,
  generalBaseOf,
  propertyGain,
  savingsOf,
} from '@modules/tools/domain/rentaGains';
import {
  emptyProperty,
  propertyResult,
  type PropertyForm,
} from '@modules/tools/domain/rentaRentals';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { aragon } from '@modules/tools/data/renta/ccaa/aragon';
import { cantabria } from '@modules/tools/data/renta/ccaa/cantabria';
import { comunitatValenciana } from '@modules/tools/data/renta/ccaa/comunitat-valenciana';
import { laRioja } from '@modules/tools/data/renta/ccaa/la-rioja';
import { madrid } from '@modules/tools/data/renta/ccaa/madrid';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';

const round2 = (n: number) => Math.round(n * 100) / 100;

const BANK = join(__dirname, '..', '..', '..', '..', 'docs', 'casos-practicos');
interface Case {
  id: string;
  modelo: string;
  apartado: string;
  reutilizable?: string;
  fuente: { oficial: boolean };
  resultados: { casilla: string | null; concepto: string; importe: number }[];
}
const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
const cases = read<{ casos: Case[] }>(join(BANK, 'oficiales.json')).casos;
const known = read<{ oficiales: { id: string; esperado: number; obtenido: number }[] }>(
  join(BANK, 'discrepancias.json')
).oficiales;

/** The figure of a case whose concept is `concept`, or starts with it (the source's own wording). */
const figure = (id: string, concept: string): number => {
  const c = cases.find((x) => x.id === id) as Case;
  const found =
    c.resultados.find((r) => r.concepto === concept) ??
    c.resultados.find((r) => r.concepto.startsWith(concept));
  return (found as Case['resultados'][0]).importe;
};
const deduction = (id: string) => rentaState.deductions.find((d) => d.id === id) as Deduction;

/** A return with work income only, in a community, for the checks that need the whole engine. */
function workReturn(
  over: Partial<ReturnType<typeof emptyForm>>,
  ccaa: RentaCcaa = cantabria
): RentaInput {
  return toInput(
    { ...emptyForm(''), ...over },
    {
      state: rentaState,
      ccaa,
      extras: rentaWorkExtras,
      property: rentaProperty,
      workReduction: workReductionOf(rentaState),
    }
  );
}

const RATES = { standard: 2, revised: 1.1 };
const parse = (t: string) => (t.trim() === '' ? NaN : Number(t));
/** One rented property worked out; `full` is the length of the year in the unit of `rentedDays`. */
const property = (p: Partial<PropertyForm>, full = 365) =>
  propertyResult({ ...emptyProperty(1), ...p }, rentaProperty, full, parse, RATES);
const family = (children: Child[], sharedChildren: boolean) => ({
  age: 40,
  disability: 0 as const,
  children,
  ascendants: [],
  sharedChildren,
});
const regional = (ccaa: RentaCcaa) => mergeMinimums(rentaState.minimums, ccaa.minimums);

const CHECKS: Record<string, () => void> = {
  'renta-c03-01': () => {
    // Pay of 10,100 € plus the 10,200 € of taxable severance reduced by 30 % (art. 18.2): 17,240 €.
    const r = computeRenta(
      workReturn({ gross: '17240', socialSecurity: '3600', disability: 33, savings: '5500' })
    );
    expect(r.otherExpenses).toBe(
      figure('renta-c03-01', 'Otros gastos') + figure('renta-c03-01', 'Incremento')
    );
    expect(r.netIncome).toBe(figure('renta-c03-01', 'Rendimiento neto'));
    expect(r.workReduction).toBe(figure('renta-c03-01', 'Reducción por obtención'));
    expect(r.netIncome - r.workReduction).toBe(figure('renta-c03-01', 'Rendimiento neto reducido'));
  },
  'renta-c04-01': () => {
    const rental = rentalOf(
      { ...emptyForm(''), rentalOn: true, rentalIncome: '11500', construction: '66228.6' },
      rentaProperty
    );
    expect(Math.round((rental?.amortization as number) * 100) / 100).toBe(
      figure('renta-c04-01', 'Amortización vivienda')
    );
  },
  'renta-c04-02': () => {
    // The Manual counts the year in months (9 of 12 let) and rounds the building's share of the
    // cadastral value to 63 % (29,120 / 46,200 = 63.03 %): both are given as the source does.
    const p = property(
      {
        rentedDays: '9',
        otherDays: '0',
        cadastral: '100',
        cadastralBuilding: '63',
        cost: '73000',
        income: '5850',
        expenses: {
          'intereses-financiacion': '200',
          // The repair of the façade has no date: prorated by the months let, 210 x 9/12 = 157.50.
          'reparacion-conservacion': '210',
          'tributos-tasas': '260',
          'comunidad-servicios-personales': '850',
          // Furniture of 6,900 € at 10 %: the engine prorates it by the time let (517.50).
          amortizacion: '690',
        },
        use: 'home',
        contract: 'after',
        tensioned: true,
        rentDrop: true,
      },
      12
    );
    expect(p.income).toBe(figure('renta-c04-02', 'Ingresos íntegros'));
    expect(p.repairsProrated).toBe(true);
    // Interest 200 x 9/12 + repair 210 x 9/12 (the Manual's 150 + 157.50).
    expect(p.capped).toBe(307.5);
    expect(p.amortization).toBe(figure('renta-c04-02', 'Amortización vivienda'));
    expect(p.reductionPercent).toBe(90);
    // Erratum of the source: it prints 388.13 for the furniture, 690 x 9/12 x 9/12 (prorated twice);
    // its own formula «10 % x 6.900 x 9/12» gives 517.50. So the net is 129.37 lower than its 3,287.09.
    expect(round2(figure('renta-c04-02', 'Rendimiento neto') - p.net)).toBe(129.37);
    expect(p.net).toBe(3157.72);
    // The imputed rent of the 90 days empty, by days (art. 85).
    expect(round2((46200 * RATES.revised * 90) / 365 / 100)).toBe(
      figure('renta-c04-02', 'Renta imputada')
    );
  },
  'renta-c04-03': () => {
    const p = property({
      cadastral: '13800',
      cadastralBuilding: '8970',
      revised: true,
      cost: '45000',
      income: '3600',
      expenses: {
        'intereses-financiacion': '4200',
        'tributos-tasas': '91',
        'comunidad-servicios-personales': '720',
        // The air conditioning of 1,500 € fitted on 1 July: 3 % x 1,500 x 6/12, typed by the person.
        amortizacion: '22.5',
      },
      use: 'home',
      contract: 'after',
      relative: true,
    });
    expect(p.cappedApplied).toBe(figure('renta-c04-03', 'Intereses deducibles'));
    expect(p.excessCarry).toBe(figure('renta-c04-03', 'Intereses pendientes'));
    expect(round2(p.amortization + 22.5)).toBe(figure('renta-c04-03', 'Amortización vivienda'));
    expect(round2(p.cappedApplied + p.otherExpenses + p.amortization)).toBe(
      figure('renta-c04-03', 'Total gastos deducibles')
    );
    expect(p.net).toBe(figure('renta-c04-03', 'Rendimiento neto'));
    expect(p.relativeMinimum).toBe(figure('renta-c04-03', '1,1 %'));
    expect(p.reducedNet).toBe(figure('renta-c04-03', 'Rendimiento a declarar'));
  },
  'renta-c04-04': () => {
    // Inherited: the value of the inheritance tax plus 2,000 € of expenses, 20 % of land.
    const p = property({ cadastral: '80000', cadastralBuilding: '64000', cost: '102000' });
    expect(p.amortizationBase).toBe(figure('renta-c04-04', 'Coste de adquisición sin suelo'));
    expect(p.amortization).toBe(figure('renta-c04-04', 'Amortización anual máxima'));
  },
  'renta-c04-06': () => {
    // The depreciation of each one is given by the source (3 % of the cadastral value): typed.
    const home = (income: string, repair: string, ibi: string, community: string, amort: string) =>
      property({
        income,
        expenses: {
          'reparacion-conservacion': repair,
          'tributos-tasas': ibi,
          'comunidad-servicios-personales': community,
          amortizacion: amort,
        },
        use: 'home',
        contract: 'after',
      });
    const one = home('6865', '2150', '500', '580', '200');
    const two = home('7980', '9210', '900', '1385', '300');
    const shop = property({
      income: '10230',
      expenses: {
        'reparacion-conservacion': '5890',
        'tributos-tasas': '350',
        'comunidad-servicios-personales': '540',
        amortizacion: '320',
      },
      use: 'business',
    });
    expect(one.net).toBe(figure('renta-c04-06', 'Rendimiento neto vivienda 1'));
    expect(two.net).toBe(figure('renta-c04-06', 'Rendimiento neto vivienda 2'));
    expect(shop.net).toBe(figure('renta-c04-06', 'Rendimiento neto local'));
    expect(one.reduction).toBe(figure('renta-c04-06', 'Reducción 50 %'));
    expect(two.reduction).toBe(0);
    expect(two.excessCarry).toBe(figure('renta-c04-06', 'Exceso reparación'));
    expect(round2(one.reducedNet + two.reducedNet + shop.reducedNet)).toBe(
      figure('renta-c04-06', 'Suma rendimientos netos reducidos')
    );
  },
  'renta-c05-01': () => {
    // Coupon 450 and account interest 37 (0027); dividends 1,502 (0029); the conversion (1,440) and
    // the preference shares (−1,900 and +2,400) are transmissions of financial assets (0031).
    const boxes = savingsOf(
      {
        ...emptySavingsDetail(),
        capital: {
          interest: 487,
          dividends: 1502,
          bills: 0,
          assets: 1940,
          insurance: 0,
          expenses: 90,
        },
      },
      2025
    ).boxes;
    expect(boxes['0036']).toBe(figure('renta-c05-01', 'Total ingresos íntegros'));
    expect(boxes['0041']).toBe(figure('renta-c05-01', 'Rendimiento neto base del ahorro'));
  },
  'renta-c10-01': () => {
    expect((40800 * rentaProperty.imputation.revisedRate) / 100).toBeCloseTo(
      figure('renta-c10-01', 'Imputación apartamento'),
      2
    );
  },
  'renta-c11-01': () => {
    const [sale] = fifo({
      name: 'Fondo',
      kind: 'fund',
      buys: [{ date: '2004-05-10', units: 100, cost: 15000 }],
      sells: [{ date: '2025-06-10', units: 100, proceeds: 15800 }],
    });
    expect(sale.gain).toBe(figure('renta-c11-01', 'Ganancia patrimonial'));
  },
  'renta-c11-02': () => {
    // Price 150,000 less the municipal tax; cost 90,000 + 8,000 less the depreciation of 1995-1996.
    const p = propertyGain({
      name: 'Piso',
      proceeds: 150000 - 1900,
      cost: 98000,
      amortization: 1620,
      exemption: 'none',
    });
    expect(p.gain).toBe(figure('renta-c11-02', 'Ganancia patrimonial'));
    // The reduction of the DT 9.ª (abatement coefficients) is not worked out: see its todo below.
  },
  'renta-c11-03': () => {
    // Sold at a loss and the homogeneous shares bought back the next month (dates inside the window).
    const [sale] = fifo({
      name: 'Acciones',
      kind: 'listed',
      buys: [
        { date: '2019-02-01', units: 1000, cost: 16800 },
        { date: '2025-06-12', units: 1000, cost: 16500 },
      ],
      sells: [{ date: '2025-05-20', units: 1000, proceeds: 12000 }],
    });
    expect(-sale.deferred).toBe(figure('renta-c11-03', 'Pérdida patrimonial no integrable'));
  },
  'renta-c11-06': () => {
    // The fully paid-up shares take the date of the old ones and share their cost (9,000 / 1,500).
    const sales = fifo({
      name: 'Acciones',
      kind: 'listed',
      buys: [
        { date: '2001-03-01', units: 900, cost: 9000 },
        { date: '2001-03-01', units: 600, cost: 0 },
        { date: '2011-05-01', units: 500, cost: 2500 },
      ],
      sells: [
        { date: '2025-04-01', units: 1500, proceeds: 15000 },
        { date: '2025-04-01', units: 100, proceeds: 1000 },
      ],
    });
    expect(sales[0].cost / 1500).toBe(figure('renta-c11-06', 'Coste unitario'));
    expect(sales[0].gain).toBe(figure('renta-c11-06', 'Ganancia lote 2001'));
    expect(sales[1].gain).toBe(figure('renta-c11-06', 'Ganancia lote 2011'));
  },
  'renta-c11-07': () => {
    const p = propertyGain({
      name: 'Vivienda',
      proceeds: 95000,
      cost: 60000,
      amortization: 0,
      exemption: 'reinvested',
      reinvested: 91000,
      pendingLoan: 4000,
    });
    expect(p.gain).toBe(figure('renta-c11-07', 'Ganancia patrimonial'));
    expect(p.exempt).toBe(figure('renta-c11-07', 'Ganancia exenta'));
    expect(p.taxable).toBe(figure('renta-c11-07', 'Ganancia sujeta'));
  },
  'renta-c12-01': () => {
    const s = savingsOf(
      {
        ...emptySavingsDetail(),
        capital: { interest: 0, dividends: 0, bills: 0, assets: -800, insurance: 0, expenses: 0 },
        otherGains: [5600, -1600],
        generalGains: [4500, -9600],
        pending: {
          gains: [
            { year: 2021, amount: 700 },
            { year: 2022, amount: 2100 },
          ],
          capital: [{ year: 2021, amount: 500 }],
          general: [{ year: 2021, amount: 600 }],
        },
      },
      2025
    );
    // Work 50,000, activity −5,000 and imputed rent 300 (box 0432).
    const income = 50000 - 5000 + 300;
    expect(income).toBe(figure('renta-c12-01', 'Saldo rendimientos'));
    const general = generalBaseOf(income, s.general, 2025);
    expect(general['0433'] + general['0434']).toBe(
      figure('renta-c12-01', 'Compensaciones base general')
    );
    expect(general.base).toBe(figure('renta-c12-01', 'Base imponible general'));
    expect(s.boxes['0424']).toBe(figure('renta-c12-01', 'Saldo G/P ahorro'));
    const b = s.boxes;
    expect(
      b['0436'] +
        b.pendingGainsOnGains +
        b.pendingCapitalOnGains +
        b['0446'] +
        b.pendingCapitalOnCapital
    ).toBe(figure('renta-c12-01', 'Compensaciones base ahorro'));
    expect(b['0460']).toBe(figure('renta-c12-01', 'Base imponible del ahorro'));
  },
  'renta-c13-01': () => {
    // The father: 1,500 € to his employment plan and 2,500 € from the company.
    const r = computeRenta(
      workReturn({
        gross: '60000',
        socialSecurity: '3800',
        pension: '1500',
        pensionEmployer: '2500',
      })
    );
    expect(r.pensionReduction).toBe(figure('renta-c13-01', 'Reducción plan de empleo'));
  },
  'renta-c14-01': () => {
    const children = [
      { age: 27, disability: 33 as const },
      { age: 22, disability: 0 as const },
      { age: 19, disability: 0 as const },
    ];
    const family = { age: 50, disability: 0 as const, children, ascendants: [] };
    expect(computeMinimum({ ...family, sharedChildren: true }, rentaState.minimums).total).toBe(
      figure('renta-c14-01', 'Total mínimo personal y familiar (individual')
    );
    expect(computeMinimum({ ...family, sharedChildren: false }, rentaState.minimums).total).toBe(
      figure('renta-c14-01', 'Total mínimo personal y familiar (conjunta')
    );
  },
  'renta-c14-02': () => {
    // The 6-year-old has 4,050 € and files a return (art. 58.1): in the individual returns he counts
    // for no one and the other two are shared. In the joint return of one parent with the minors he
    // counts whole for that parent (the third, 4,000 €); the 18 and 12-year-olds stay at half.
    const kids: Child[] = [
      { age: 18, disability: 0 },
      { age: 12, disability: 0 },
      { age: 6, disability: 0, income: 'ownReturn' },
    ];
    const individual = family(kids, true);
    const joint = { ...individual, jointUnder: 18 };
    expect(computeMinimum(individual, rentaState.minimums).total).toBe(
      figure('renta-c14-02', 'Total mínimo individual estatal')
    );
    expect(computeMinimum(individual, regional(comunitatValenciana)).total).toBe(
      figure('renta-c14-02', 'Total mínimo individual autonómico')
    );
    expect(computeMinimum(joint, rentaState.minimums).total).toBe(
      figure('renta-c14-02', 'Total mínimo conjunta estatal')
    );
    expect(computeMinimum(joint, regional(comunitatValenciana)).total).toBe(
      figure('renta-c14-02', 'Total mínimo conjunta autonómico')
    );
  },
  'renta-c14-03': () => {
    // A child adopted at 5 with 40 % of disability: the increase of the under-3 by the adoption.
    const adopted = family([{ age: 5, disability: 33, adopted: true }], false);
    const state = computeMinimum(adopted, rentaState.minimums);
    expect(rentaState.minimums.under3).toBe(figure('renta-c14-03', 'Incremento por adopción'));
    expect(state.total).toBe(figure('renta-c14-03', 'Total mínimo estatal'));
    expect(computeMinimum(adopted, regional(laRioja)).total).toBe(
      figure('renta-c14-03', 'Total mínimo autonómico')
    );
  },
  'renta-c15-01': () => {
    const savings = applyScale(rentaWorkExtras.savingsScale.state, 2800);
    expect(savings).toBe(figure('renta-c15-01', 'Gravamen ahorro'));
    expect(applyMinimum(rentaState.scale, 23900, 5550)).toBe(
      figure('renta-c15-01', 'Cuota íntegra general estatal')
    );
    expect(applyMinimum(aragon.scale as NonNullable<typeof aragon.scale>, 23900, 5550)).toBe(
      figure('renta-c15-01', 'Cuota íntegra general autonómica')
    );
    expect(applyMinimum(rentaState.scale, 23900, 5550) + savings).toBe(
      figure('renta-c15-01', 'Cuota íntegra estatal')
    );
  },
  'renta-c15-02': () => {
    // Maintenance of 12,000 € to the children: the scale apart, and the minimum + 1,980 € (art. 64
    // and 75). The regional quota uses the Valencian minimum of the taxpayer (6,105 €).
    const state = generalQuota(rentaState.scale, 63000, 5550, 12000);
    const valencian = comunitatValenciana.scale as NonNullable<typeof comunitatValenciana.scale>;
    const own = regional(comunitatValenciana).personal;
    const region = generalQuota(valencian, 63000, own, 12000);
    const savings = applyScale(rentaWorkExtras.savingsScale.state, 5000);
    expect(state).toBe(figure('renta-c15-02', 'Cuota general estatal'));
    expect(region).toBe(figure('renta-c15-02', 'Cuota general autonómica'));
    expect(round2(state + savings)).toBe(figure('renta-c15-02', 'Cuota íntegra estatal'));
    expect(round2(region + savings)).toBe(figure('renta-c15-02', 'Cuota íntegra autonómica'));
  },
  'renta-c16-01': () => {
    // 1,000 € to a new NGO and 1,000 € to a priority activity of a foundation given to in 2023 and
    // 2024 for as much or more: 80/40 % and 45 % + 5 points.
    const d = donationResult(
      { general: 1000, recurrent: 0, priority: 1000, priorityRecurrent: 1000, other: 0 },
      40000
    );
    expect(d.general).toBe(figure('renta-c16-01', 'Deducción ONG'));
    expect(d.priority).toBe(figure('renta-c16-01', 'Deducción fundación'));
    expect(d.general + d.priority).toBe(figure('renta-c16-01', 'Deducción por donativos'));
  },
  'renta-c16-03': () => {
    const d = deduction('estado-alquiler-transitorio');
    const got = deductionAmount(d, { on: true, amount: 6900 }, incomeFactor(d, 22100));
    // The maximum base goes down (2,835.17), not the deduction: before the fix the engine gave 217.48.
    expect(got).toBe(figure('renta-c16-03', 'Deducción (10,05 %)'));
    // Half in each box (0562 and 0563), the odd cent in the regional one so they add up.
    expect(splitDeduction(got, d.regionalShare as number)).toEqual({
      state: 142.46,
      regional: 142.47,
    });
  },
  'renta-c18-02': () => {
    const general = deductionAmount(deduction('estado-familia-numerosa'), { on: true, units: 1 });
    const extra = deductionAmount(deduction('estado-familia-numerosa-hijo-adicional'), {
      on: true,
      units: 1,
    });
    expect(general).toBe(figure('renta-c18-02', 'Deducción familia numerosa general'));
    expect(general + extra).toBe(figure('renta-c18-02', 'Total deducción'));
  },
  'renta-c18-01': () => {
    // Twins of 8 months each and the elder of 4, each with the 150 € of the 30 days in May.
    const d = deduction('estado-maternidad');
    const choice = { on: true, units: 3, months: 8 + 8 + 4, bonusUnits: 3 };
    const maternity = deductionAmount(d, choice);
    expect(deductionAmount(d, { ...choice, units: 1, months: 8, bonusUnits: 1 })).toBe(
      figure('renta-c18-01', 'Deducción por cada mellizo')
    );
    expect(deductionAmount(d, { ...choice, units: 1, months: 4, bonusUnits: 1 })).toBe(
      figure('renta-c18-01', 'Deducción hijo mayor')
    );
    expect(maternity).toBe(figure('renta-c18-01', 'Deducción por maternidad total'));
    // The nursery: 1,000 / 12 x 2 months (May and June), under the 2,290 € paid without aid.
    const nursery = deductionAmount(deduction('estado-guarderia'), { on: true, amount: 166.67 });
    expect(nursery).toBe(figure('renta-c18-01', 'Incremento por gastos de custodia'));
    expect(round2(1500 - maternity - nursery)).toBe(figure('renta-c18-01', 'Resultado'));
  },
  'renta-c18-03': () => {
    expect(lowPayDeduction(16500, 0)).toBe(figure('renta-c18-03', 'Importe máximo'));
    // Madrid: held to the whole quota, as all her income is from work.
    const r = computeRenta(workReturn({ gross: '16500', socialSecurity: '1200' }, madrid));
    expect(round2(r.stateQuota + r.regionalQuota)).toBe(figure('renta-c18-03', 'Límite'));
    expect(r.lowPay).toBe(figure('renta-c18-03', 'Límite'));
  },
};

/** Why each case of the Renta has no check here (21-10-2026). */
const PENDING: Record<string, string> = {
  'renta-c04-05':
    'Usufructo temporal (coste / años, hasta los ingresos): el motor amortiza el 3 % de un inmueble, no un derecho.',
  'renta-c05-02':
    'Arrendamiento de negocio: capital mobiliario de la base general (0046-0060), que el motor no recoge.',
  'renta-c05-03':
    'Préstamo a vinculada con exceso a la base general (art. 46.a) y bonificadas: el motor no lo recoge.',
  'renta-c07-01':
    'Reproducido al céntimo (58.100 €) en finances/annualActivity.test.ts y tools/rentaFromAutonomo.test.ts.',
  'renta-c07-02':
    'Reducción del 30 % de actividades artísticas (novedad 2025): el motor no la calcula.',
  'renta-c08-01': 'Reproducido al céntimo (41.173,16 €) en finances/objectiveModules.test.ts.',
  'renta-c09-01':
    'Agraria con PAC repartida entre cultivos: pendiente de pasar por agrarianModules (siguiente oleada).',
  'renta-c11-04':
    'Coeficientes de abatimiento (DT 9.ª) y límite de 400.000 €: el motor no los calcula.',
  'renta-c11-05':
    'Coeficientes de abatimiento de acciones cotizadas (valor del IP 2005, DT 9.ª): el motor no los calcula.',
  'renta-c11-08':
    'Exención por reinversión en renta vitalicia de mayores de 65 (art. 38.3): solo hay una ficha informativa.',
  'renta-c13-02':
    'Excesos de años anteriores y cuadro del art. 52.1 (aportación del trabajador al plan de empleo): el motor no los pide.',
  'renta-c16-02':
    'Comprobación del aumento de patrimonio en la deducción por vivienda (régimen transitorio): la base la escribe la persona.',
};

/** Why a case has no automatic check (by model, or by the part of the return). */
function reasonOf(c: Case): string {
  if (PENDING[c.id]) return PENDING[c.id];
  // The VAT of the general regime is worked out by the backend and checked there to the cent; the
  // rest of the models of the self-employed, in casosOficialesAutonomos.test.ts.
  if (['303', '349', '390'].includes(c.modelo) && c.reutilizable !== 'estructura')
    return `Modelo ${c.modelo}: lo comprueba backend/src/tests/domain/autonomo-vat-official.test.ts al céntimo.`;
  if (c.modelo !== '100')
    return `Modelo ${c.modelo}: se comprueba en casosOficialesAutonomos.test.ts.`;
  return `Apartado «${c.apartado}»: el motor no calcula este supuesto con los datos de la fuente.`;
}

describe('casos oficiales del Manual práctico (Renta 2025)', () => {
  it('el catálogo tiene al menos 40 casos', () => {
    expect(cases.length).toBeGreaterThanOrEqual(40);
  });
  it('cada discrepancia oficial conocida es de un caso del catálogo', () => {
    // A fixed one is removed from discrepancias.json (renta-c16-03 was, on 19-10-2026).
    for (const k of known) expect(cases.map((c) => c.id)).toContain(k.id);
  });
  for (const c of cases) {
    const check = CHECKS[c.id];
    if (check) it(`${c.id} · ${c.apartado}`, check);
    else it.todo(`${c.id} · ${c.apartado} — PENDIENTE: ${reasonOf(c)}`);
  }
});
