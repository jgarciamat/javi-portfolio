/**
 * The files of the activities in módulos for the sede (DR131_2026.xlsx and page 2 of
 * DR303e26v101.xlsx), written and read back. Invented person and figures: the taxi of
 * objectiveModules.test.ts and vatSimplified.test.ts (hand calculations there).
 */
import {
  EMPTY_DECLARANT,
  buildSedeFile,
  needs,
  type Declarant,
  type SedeSource,
} from '@modules/finances/application/aeatFiles/models';
import {
  dpa131,
  epigrafeCode,
  lowIncomeCode,
} from '@modules/finances/application/aeatFiles/modules';
import { readSelfAssessment } from '@modules/finances/application/aeatFiles/selfAssessment';
import { NO_OBJECTIVE, instalments131 } from '@modules/finances/domain/objectiveModules';
import { vatActivityFor, vatSimplified } from '@modules/finances/domain/vatSimplified';

const person: Declarant = {
  ...EMPTY_DECLARANT,
  nif: '12345678z',
  surname: 'Pérez Núñez',
  name: 'Lucía',
};
const IBAN = 'ES91 2100 0418 4502 0005 1332';

const taxi = {
  ...NO_OBJECTIVE,
  activityId: 'm59',
  unitsStart: [0.5, 1, 45],
  staffLastYear: 0.5,
  specialIndex: 0.9,
};
const run = (withheld: number[]) =>
  instalments131(taxi, {
    year: 2026,
    quarter: 2,
    withheld,
    income: [0, 0, 0, 0],
    lastYearNet: 20000,
    depreciationAtStart: 0,
  })!;
const modules = {
  epigrafe: '721.2',
  aux: '',
  net: 8799.08,
  rate: 3,
  units: [0.5, 1, 45],
  amounts: [673.14, 7656.89, 2028.6],
  employment: 67.31,
  investment: 0,
  indices: [0.9, 1, 1, 1, 1] as [number, number, number, number, number],
  seasonLastYear: 0,
  ceutaMelilla: false,
  quarterDays: 0,
  lastYearNet: 20000,
};
const source131 = (q: 1 | 2, withheld = [0, 0, 0, 0]): SedeSource => ({
  model: '131',
  year: 2026,
  quarter: q,
  result: run(withheld).quarters[q - 1].result,
  modules,
});

describe('the file of the modelo 131', () => {
  it('writes the boxes, the activity and its modules, and reads them back', () => {
    const built = buildSedeFile(source131(1), person);
    expect(built.checks).toEqual([]);
    expect(built.kind).toBe('I');
    const file = built.file!;
    expect(file.fileName).toBe('12345678Z2026131T.131'.replace('131T', '1T'));
    const read = readSelfAssessment('131', file.text);
    expect(read).toMatchObject({ model: '131', year: 2026, period: '1T' });
    expect(read.values).toMatchObject({ '01': 8799.08, '02': 263.97, '07': 263.97, '15': 263.97 });
    const page = read.pages['01000'];
    expect(page.slice(109, 113)).toBe('7212');
    expect(page.slice(130, 135)).toBe('00300');
    expect(page.slice(555, 556)).toBe('0');
    const dpa = read.pages.DPA00;
    expect(dpa.slice(12, 16)).toBe('7212');
    // Module 2 (no salaried): 1.00 units and 7,656.89 €; index special 0.90.
    expect(dpa.slice(162, 172)).toBe('0000000100');
    expect(dpa.slice(172, 189)).toBe('00000000000765689');
    expect(dpa.slice(344, 348)).toBe('0090');
    expect(needs(source131(1))).toMatchObject({ iban: true });
  });

  it('pays by direct debit, deducts a negative quarter and asks for no account then', () => {
    const debit = buildSedeFile(source131(1), { ...person, iban: IBAN });
    expect(debit.kind).toBe('U');
    expect(readSelfAssessment('131', debit.file!.text).pages.DID00).toContain('ES9121000418');
    const negative = buildSedeFile(source131(1, [400, 0, 0, 0]), person);
    expect(negative.kind).toBe('B');
    expect(needs(source131(1, [400, 0, 0, 0])).iban).toBe(false);
  });

  it('codes the epígrafe and the reduction of box 09, and writes a negative net', () => {
    expect(epigrafeCode('721.1 y 3')).toBe('7211');
    expect(epigrafeCode('642.1, 2, 3 y 4')).toBe('6421');
    expect(epigrafeCode('675')).toBe('675');
    expect([null, 8000, 9500, 10500, 11500, 12500].map(lowIncomeCode)).toEqual([0, 1, 2, 3, 4, 0]);
    const noData = {
      ...source131(1),
      result: { ...run([0, 0, 0, 0]).quarters[0].result, boxes: [] },
    } as SedeSource;
    expect(
      readSelfAssessment('131', buildSedeFile(noData, person).file!.text).pages['01000'].slice(
        109,
        113
      )
    ).toBe('    ');
    const loss = buildSedeFile(
      { ...source131(1), modules: { ...modules, net: -10 } } as SedeSource,
      person
    );
    expect(loss.file!.text).toContain('N0000000000001000');
    expect(dpa131({ ...modules, aux: '1' })).toContainEqual([17, 1, '1']);
    expect(dpa131({ ...modules, ceutaMelilla: true })).toContainEqual([29, 1, 1]);
  });
});

describe('the file of the 303 of the simplified regime', () => {
  const activity = vatActivityFor('m59', 2026)!;
  const base = {
    year: 2026,
    quarter: 1 as const,
    activity,
    unitsStart: [1.5, 45],
    unitsYear: [1.5, 45],
    reduction: 0,
    seasonDays: 0,
    shares: [1, 1, 1, 1] as [number, number, number, number],
    supported: 900,
    compensationsPaid: 0,
    refundsAbroad: 0,
    intraAcquisitions: 0,
    fixedAssetSales: 0,
    reverseCharge: 0,
    fixedAssets: 0,
    investmentAdjust: 0,
    toOffset: 0,
    refund: false,
  };
  const detail = {
    epigrafe: '721.2',
    aux: '',
    units: [1.5, 45],
    amounts: [1355.19, 395.1],
    seasonLastYear: 0,
    quarterDays: 0,
  };
  const of = (q: 1 | 4, more = {}): SedeSource => ({
    model: '303',
    year: 2026,
    quarter: q,
    simplified: vatSimplified({ ...base, quarter: q, ...more }),
    activity: detail,
  });

  it('writes page 2 with the ingreso a cuenta and says «only the simplified regime»', () => {
    const built = buildSedeFile(of(1), person);
    expect(built.checks).toEqual([]);
    const read = readSelfAssessment('303', built.file!.text);
    expect(read.values).toMatchObject({ '47': 87.51, '54': 87.51, '58': 87.51, '71': 87.51 });
    expect(read.pages['01000'].slice(110, 111)).toBe('1');
    expect(read.pages['01000'].slice(127, 128)).toBe('0');
    const page2 = read.pages['02000'];
    expect(page2.slice(208, 212)).toBe('7212');
    // F of the activity (445) and the % E (440).
    expect(page2.slice(439, 444)).toBe('00500');
    expect(page2.slice(444, 461)).toBe('00000000000008751');
  });

  it('writes the year in the 4T, exonerated of the 390, and the account of a refund', () => {
    const q4 = readSelfAssessment('303', buildSedeFile(of(4), person).file!.text);
    expect(q4.values).toMatchObject({ '48': 832.79, '49': 262.53, '50': 570.26 });
    expect(q4.pages['02000'].slice(537, 554)).toBe('00000000000083279');
    expect(q4.pages['01000'].slice(127, 128)).toBe('1');
    const refund = of(4, { supported: 0, fixedAssets: 2000, refund: true });
    expect(needs(refund).iban).toBe(true);
    const withIban = buildSedeFile(refund, { ...person, iban: IBAN });
    expect(withIban.kind).toBe('D');
    expect(readSelfAssessment('303', withIban.file!.text).pages.DID00).toContain('ES9121000418');
    // A negative result I is written with its sign.
    const negative = buildSedeFile(of(4, { supported: 5000 }), person);
    expect(negative.file!.text).toContain('N0000000000');
    expect(buildSedeFile(of(1, { fixedAssets: 500 }), person).kind).toBe('C');
    // 691.9 and 722 carry their mark (note 3 of page 2).
    const waste = { ...of(1), activity: { ...detail, epigrafe: '722', aux: '2' } } as SedeSource;
    expect(
      readSelfAssessment('303', buildSedeFile(waste, person).file!.text).pages['02000'].slice(
        208,
        213
      )
    ).toBe('722 2');
  });
});
