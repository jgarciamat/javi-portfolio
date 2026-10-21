import {
  abate,
  abatementPercent,
  daysOf,
  generatedBefore,
  permanenceYears,
  qualifies,
  reductionOf,
} from '@modules/tools/domain/rentaAbatement';
import {
  emptySavingsDetail,
  fifo,
  propertyGain,
  savingsOf,
} from '@modules/tools/domain/rentaGains';

// Hand calculations with the LIRPF DT 9.ª (BOE-A-2006-20764, checked 22-10-2026): years up to
// 31-12-1996 rounded up, 11.11 / 25 / 14.28 % per year over two, 100 % above 10 / 5 / 8 years.
describe('the abatement coefficients of the DT 9.ª', () => {
  it('counts the years up to 31-12-1996 rounded up', () => {
    expect(permanenceYears('1994-12-20')).toBe(3);
    expect(permanenceYears('1991-05-31')).toBe(6);
    // Bought on 31 December: whole years, nothing to round.
    expect(permanenceYears('1991-12-31')).toBe(5);
  });

  it('gives a percent per year over two, and 100 % above the years of each kind', () => {
    expect(abatementPercent('property', 2)).toBe(0);
    expect(abatementPercent('property', 10)).toBe(88.88);
    expect(abatementPercent('property', 11)).toBe(100);
    expect(abatementPercent('listed', 5)).toBe(75);
    expect(abatementPercent('listed', 6)).toBe(100);
    expect(abatementPercent('other', 8)).toBe(85.68);
    expect(abatementPercent('other', 9)).toBe(100);
  });

  it('applies only to assets bought before 31-12-1994 and sold later', () => {
    expect(qualifies('1994-12-30', '2025-01-01')).toBe(true);
    expect(qualifies('1994-12-31', '2025-01-01')).toBe(false);
    expect(qualifies('', '2025-01-01')).toBe(false);
    expect(qualifies('1990-01-01', '1989-01-01')).toBe(false);
  });

  it('takes the part of the gain up to 19-01-2006 by days, or with the value of 2005', () => {
    const base = { kind: 'listed' as const, acquired: '1990-01-01', sold: '2025-01-01' };
    // 1-1-1990 to 19-1-2006, both inclusive: 5,863 days of the 12,784 held.
    expect(daysOf(base.acquired, base.sold)).toEqual({ before: 5863, held: 12784 });
    expect(generatedBefore({ ...base, kind: 'other', proceeds: 10000, gain: 1000 })).toBe(458.62);
    // Rule 2.ª: sold above the 2005 value, the part up to it; below it, all of it; never a loss.
    const ip = { ...base, proceeds: 10000, gain: 4000, cost: 6000 };
    expect(generatedBefore({ ...ip, ip2005: 8000 })).toBe(2000);
    expect(generatedBefore({ ...ip, ip2005: 12000 })).toBe(4000);
    expect(generatedBefore({ ...ip, ip2005: 5000 })).toBe(0);
    expect(generatedBefore({ ...ip, gain: -100 })).toBe(0);
    // No acquisition value given: the whole 2005 value, up to the gain.
    expect(generatedBefore({ ...base, proceeds: 10000, gain: 4000, ip2005: 3000 })).toBe(3000);
  });

  it('shares out the 400,000 € in the order of the sales, after the years before', () => {
    const item = (sold: string, proceeds: number) => ({
      kind: 'property' as const,
      acquired: '1985-03-01',
      sold,
      proceeds,
      gain: proceeds / 2,
    });
    // Sold in March for 300,000 (all within the limit) and in January for 150,000 (first).
    const [march, january] = abate([item('2025-03-01', 300000), item('2025-01-10', 150000)], 0);
    expect(january).toMatchObject({ percent: 100, counted: 150000 });
    expect(january.reducible).toBe(january.before);
    // 250,000 left of 300,000: 5/6 of the part before 2006.
    expect(march.reducible).toBe(Math.round(march.before * (250000 / 300000) * 100) / 100);
    // The years before used it all: no reduction.
    const [none] = abate([item('2025-03-01', 300000)], 450000);
    expect(none.reduction).toBe(0);
    // A later purchase or a sale for nothing: no reduction and nothing counted.
    expect(abate([{ ...item('2025-01-01', 1000), acquired: '2001-01-01' }])[0].counted).toBe(0);
    expect(reductionOf({ ...item('2025-01-01', 0) }, 100, 0).counted).toBe(0);
  });
});

describe('the abatement in the sales of the year', () => {
  const sale = { date: '2025-06-01', units: 100, proceeds: 20000 };
  it('works out unlisted shares by days and leaves the lots bought later out', () => {
    const [s] = fifo({
      name: 'Familiar SL',
      kind: 'unlisted',
      buys: [
        { date: '1990-01-01', units: 50, cost: 2000 },
        { date: '2010-01-01', units: 50, cost: 6000 },
      ],
      sells: [sale],
    });
    expect(s.pre1995).toEqual([
      {
        kind: 'other',
        acquired: '1990-01-01',
        sold: '2025-06-01',
        proceeds: 10000,
        gain: 8000,
        cost: 2000,
      },
    ]);
    expect(s.needsIp2005).toBeUndefined();
  });

  it('asks for the 2005 value of listed shares and funds, and takes ETFs and funds at 14.28 %', () => {
    const lot = { date: '1993-04-01', units: 100, cost: 5000 };
    const listed = fifo({ name: 'A', kind: 'listed', buys: [lot], sells: [sale] })[0];
    expect(listed.needsIp2005).toBe(true);
    expect(listed.pre1995).toBeUndefined();
    const etf = fifo({
      name: 'ETF',
      kind: 'listed',
      section: 'etf',
      buys: [{ ...lot, ip2005: 9000 }],
      sells: [sale],
    })[0];
    expect(etf.pre1995?.[0]).toMatchObject({ kind: 'other', ip2005: 9000 });
    const fund = fifo({ name: 'F', kind: 'fund', buys: [{ ...lot, ip2005: 9000 }], sells: [sale] });
    expect(fund[0].pre1995?.[0].kind).toBe('other');
    expect(
      fifo({ name: 'C', kind: 'crypto', buys: [lot], sells: [sale] })[0].pre1995
    ).toBeUndefined();
    // In the savings base: 9,000 − 5,000 = 4,000 before 2006, 4 years at 14.28 % = 28.56 %.
    const s = savingsOf(
      {
        ...emptySavingsDetail(),
        assets: [{ name: 'F', kind: 'fund', buys: [{ ...lot, ip2005: 9000 }], sells: [sale] }],
      },
      2025
    );
    expect(s.sales[0].reduction).toBe(1142.4);
    expect(s.boxes['0424']).toBe(13857.6);
  });

  it('reduces only the part of a property that is not exempt, and counts only that value', () => {
    // Main home bought in 1990, half the price reinvested: half the gain exempt; 7 years: 55.55 %.
    const p = propertyGain({
      name: 'Casa',
      proceeds: 200000,
      cost: 100000,
      amortization: 0,
      exemption: 'reinvested',
      reinvested: 100000,
      acquired: '1990-01-01',
      sold: '2025-01-01',
    });
    // 50,000 not exempt, × 5,863 / 12,784 = 22,931.01 before 2006; × 55.55 % = 12,738.18.
    expect(p).toMatchObject({ gain: 100000, exempt: 50000, before: 22931.01 });
    expect(p.reduction).toBe(12738.18);
    expect(p.taxable).toBe(37261.82);
    // Sold at 65 or more: all exempt, nothing to reduce.
    const over65 = propertyGain({
      name: 'Casa',
      proceeds: 200000,
      cost: 100000,
      amortization: 0,
      exemption: 'homeOver65',
      acquired: '1990-01-01',
      sold: '2025-01-01',
    });
    expect(over65).toMatchObject({ exempt: 100000, reduction: 0, taxable: 0 });
  });
});
