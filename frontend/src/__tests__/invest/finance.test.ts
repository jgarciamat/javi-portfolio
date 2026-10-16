import {
  bondNetReturn,
  bondPrice,
  irr,
  macaulayDuration,
  modifiedDuration,
  priceCurve,
  yieldFromPrice,
  yieldShock,
} from '@modules/invest/domain/bonds';
import {
  doublingYears,
  projectFund,
  MAX_FUND_YEARS,
  type FundInput,
} from '@modules/invest/domain/compound';
import {
  dcaSimulate,
  illustrativePath,
  leveragedPosition,
  parsePrices,
  type LeverageInput,
} from '@modules/invest/domain/crypto';
import { SAVINGS_SCALE, savingsTax, taxOnGain } from '@modules/invest/domain/taxes';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';

describe('savings tax', () => {
  it('adds the State and regional halves of the scale in the app data', () => {
    expect(SAVINGS_SCALE).toEqual([
      { from: 0, rate: 19 },
      { from: 6000, rate: 21 },
      { from: 50000, rate: 23 },
      { from: 200000, rate: 27 },
      { from: 300000, rate: 30 },
    ]);
    expect(rentaWorkExtras.savingsScale.state[0].rate * 2).toBe(SAVINGS_SCALE[0].rate);
  });

  it('taxes each band at its own rate', () => {
    expect(savingsTax(0)).toBe(0);
    expect(savingsTax(6000)).toBe(1140);
    expect(savingsTax(10000)).toBe(1980);
    expect(savingsTax(60000)).toBe(12680);
    expect(savingsTax(400000)).toBe(1140 + 9240 + 34500 + 27000 + 30000);
    expect(savingsTax(-5)).toBe(0);
    expect(savingsTax(NaN)).toBe(0);
  });

  it('taxes a gain on top of other savings income', () => {
    expect(taxOnGain(10000)).toEqual({
      gain: 10000,
      tax: 1980,
      net: 8020,
      averageRatePct: 19.8,
      marginalRatePct: 21,
    });
    expect(taxOnGain(1000, 6000).tax).toBe(210);
    expect(taxOnGain(1000, 6000).marginalRatePct).toBe(21);
    expect(taxOnGain(500, 5800).tax).toBe(Math.round((200 * 0.19 + 300 * 0.21) * 100) / 100);
  });

  it('pays nothing on a loss, a missing number or negative other income', () => {
    expect(taxOnGain(-300).tax).toBe(0);
    expect(taxOnGain(NaN)).toMatchObject({ gain: 0, tax: 0, net: 0 });
    expect(taxOnGain(1000, NaN).tax).toBe(190);
    expect(taxOnGain(1000, -50).tax).toBe(190);
    expect(taxOnGain(1000).marginalRatePct).toBe(19);
  });
});

const fund = (over: Partial<FundInput> = {}): FundInput => ({
  initial: 0,
  monthly: 200,
  years: 30,
  returnPct: 7,
  terPct: 0.2,
  inflationPct: 2,
  withTax: true,
  ...over,
});

describe('fund projection', () => {
  it('matches the reference figures of the chapters', () => {
    const r = projectFund(fund());
    expect(r.valid).toBe(true);
    expect(r.contributed).toBe(72000);
    expect(r.finalBalance).toBeCloseTo(224874.7, 0);
    expect(r.gain).toBeCloseTo(152874.7, 0);
    expect(r.feesPaid).toBeCloseTo(4670.19, 0);
    expect(r.tax).toBeCloseTo(taxOnGain(r.gain).tax, 2);
    expect(r.netAfterTax).toBeCloseTo(r.finalBalance - r.tax, 2);
    expect(r.realNet).toBeCloseTo(r.netAfterTax / Math.pow(1.02, 30), 0);
    expect(r.yearly).toHaveLength(30);
    expect(r.yearly[29].balance).toBe(r.finalBalance);
    expect(r.pessimistic[29].balance).toBeLessThan(r.finalBalance);
    expect(r.optimistic[29].balance).toBeGreaterThan(r.finalBalance);
  });

  it('shows what a higher fee costs', () => {
    const low = projectFund(fund());
    const high = projectFund(fund({ terPct: 1.5 }));
    expect(low.finalBalance - high.finalBalance).toBeGreaterThan(49000);
    expect(high.feeImpact).toBeGreaterThan(low.feeImpact);
    expect(projectFund(fund({ terPct: 0 })).feeImpact).toBe(0);
  });

  it('can leave the tax out and handles an initial amount alone', () => {
    const r = projectFund(
      fund({ withTax: false, initial: 5000, monthly: 0, years: 10, returnPct: 5, terPct: 0 })
    );
    expect(r.tax).toBe(0);
    expect(r.finalBalance).toBeCloseTo(8144.47, 1);
    expect(r.netAfterTax).toBe(r.finalBalance);
  });

  it('copes with a zero or negative return and negative inflation', () => {
    expect(projectFund(fund({ returnPct: 0, terPct: 0 })).gain).toBe(0);
    expect(projectFund(fund({ returnPct: -5 })).gain).toBeLessThan(0);
    expect(projectFund(fund({ returnPct: -5 })).tax).toBe(0);
    expect(projectFund(fund({ inflationPct: -2 })).realNet).toBeGreaterThan(
      projectFund(fund({ inflationPct: 0 })).netAfterTax
    );
  });

  it('never returns NaN for odd inputs', () => {
    const odd = projectFund(
      fund({
        initial: NaN,
        monthly: -5,
        years: 3.9,
        returnPct: NaN,
        terPct: NaN,
        inflationPct: NaN,
      })
    );
    expect(odd.valid).toBe(false);
    const ok = projectFund(
      fund({
        initial: 100,
        monthly: NaN,
        years: 3.9,
        returnPct: NaN,
        terPct: 50,
        inflationPct: NaN,
      })
    );
    expect(ok.yearly).toHaveLength(3);
    for (const v of Object.values(ok))
      if (typeof v === 'number') expect(Number.isNaN(v)).toBe(false);
  });

  it('rejects missing money or years and caps the years', () => {
    expect(projectFund(fund({ monthly: 0, initial: 0 })).valid).toBe(false);
    expect(projectFund(fund({ years: 0 })).valid).toBe(false);
    expect(projectFund(fund({ years: 500 })).yearly).toHaveLength(MAX_FUND_YEARS);
  });

  it('gives the years a sum takes to double', () => {
    expect(doublingYears(7)).toBeCloseTo(10.24, 1);
    expect(doublingYears(0)).toBe(Infinity);
  });
});

const long = (over: Partial<LeverageInput> = {}): LeverageInput => ({
  side: 'long',
  margin: 1000,
  leverage: 10,
  entry: 100,
  exit: 105,
  feePct: 0.05,
  fundingPctPerDay: 0.01,
  days: 3,
  maintenancePct: 0.5,
  ...over,
});

describe('leveraged position', () => {
  it('computes a winning long with costs, liquidation and break-even', () => {
    const r = leveragedPosition(long());
    expect(r).toMatchObject({
      valid: true,
      notional: 10000,
      units: 100,
      priceMovePct: 5,
      pnlGross: 500,
      fees: 10.25,
      funding: 3,
      pnlNet: 486.75,
      equity: 1486.75,
      roiPct: 48.68,
      liquidationPrice: 90.5,
      liquidationDistancePct: 9.5,
      breakEvenPrice: 100.13,
      liquidated: false,
    });
  });

  it('liquidates a long that falls past the liquidation price', () => {
    const r = leveragedPosition(long({ exit: 90 }));
    expect(r.liquidated).toBe(true);
    expect(r.pnlNet).toBe(-1000);
    expect(r.equity).toBe(0);
    expect(r.roiPct).toBe(-100);
  });

  it('handles shorts both ways', () => {
    const win = leveragedPosition(long({ side: 'short', exit: 95 }));
    expect(win.pnlGross).toBe(500);
    expect(win.liquidated).toBe(false);
    expect(win.liquidationPrice).toBe(109.5);
    expect(win.breakEvenPrice).toBeLessThan(100);
    const lose = leveragedPosition(long({ side: 'short', exit: 112 }));
    expect(lose.liquidated).toBe(true);
    expect(lose.roiPct).toBe(-100);
  });

  it('can lose money without reaching the liquidation price', () => {
    const r = leveragedPosition(long({ exit: 96, feePct: 0, fundingPctPerDay: 0 }));
    expect(r.liquidated).toBe(false);
    expect(r.pnlNet).toBe(-400);
    expect(r.roiPct).toBe(-40);
  });

  it('liquidates when costs eat the whole margin', () => {
    const r = leveragedPosition(
      long({ leverage: 1, exit: 100, fundingPctPerDay: 5, days: 100, maintenancePct: 0 })
    );
    expect(r.liquidated).toBe(true);
  });

  it('works without leverage and keeps the maintenance margin below the margin', () => {
    const r = leveragedPosition(long({ leverage: 1, exit: 120, maintenancePct: 90 }));
    expect(r.liquidated).toBe(false);
    expect(r.pnlGross).toBe(200);
    expect(r.liquidationPrice).toBeLessThan(100);
  });

  it('rejects invalid input without NaN', () => {
    for (const bad of [
      { margin: 0 },
      { margin: NaN },
      { entry: -1 },
      { exit: 0 },
      { leverage: 0.5 },
      { leverage: 200 },
      { leverage: NaN },
    ]) {
      const r = leveragedPosition(long(bad));
      expect(r.valid).toBe(false);
      expect(r.pnlNet).toBe(0);
    }
    const sloppy = leveragedPosition(
      long({ feePct: NaN, fundingPctPerDay: -1, days: NaN, maintenancePct: NaN })
    );
    expect(sloppy.valid).toBe(true);
    expect(Number.isNaN(sloppy.pnlNet)).toBe(false);
  });
});

describe('periodic purchase', () => {
  it('parses prices separated by commas, spaces or semicolons', () => {
    expect(parsePrices('100, 95;110 120.5\n130')).toEqual([100, 95, 110, 120.5, 130]);
    expect(parsePrices('')).toEqual([]);
    expect(parsePrices('abc, -4, 0, 7')).toEqual([7]);
  });

  it('builds a repeatable illustrative path', () => {
    expect(illustrativePath()).toHaveLength(24);
    expect(illustrativePath(5, 6)).toHaveLength(6);
    expect(illustrativePath(5, 6)).toEqual(illustrativePath(5, 6));
    expect(illustrativePath().every((p) => p > 0)).toBe(true);
  });

  it('compares buying every period with buying everything at the start', () => {
    const r = dcaSimulate([100, 50, 100, 200], 100);
    expect(r.valid).toBe(true);
    expect(r.invested).toBe(400);
    expect(r.units).toBeCloseTo(1 + 2 + 1 + 0.5, 6);
    expect(r.value).toBe(900);
    expect(r.averagePrice).toBe(88.89);
    expect(r.profit).toBe(500);
    expect(r.roiPct).toBe(125);
    expect(r.lumpSumValue).toBe(800);
    expect(r.lumpSumRoiPct).toBe(100);
  });

  it('is not valid with fewer than two prices or no amount', () => {
    expect(dcaSimulate([100], 100).valid).toBe(false);
    expect(dcaSimulate([100, 90], 0).valid).toBe(false);
    expect(dcaSimulate([100, NaN, -3, 90], 50)).toMatchObject({ valid: true, invested: 100 });
  });
});

describe('bonds', () => {
  const base = { couponPct: 3, yieldPct: 3, years: 10 };

  it('prices at par when coupon and yield match, below when yields rise', () => {
    expect(bondPrice(base)).toBe(100);
    expect(bondPrice({ ...base, yieldPct: 4 })).toBeCloseTo(91.8891, 3);
    expect(bondPrice({ ...base, yieldPct: 2 })).toBeCloseTo(108.9826, 3);
    expect(bondPrice({ couponPct: 0, yieldPct: 3, years: 1 })).toBeCloseTo(97.0874, 3);
  });

  it('cleans odd values', () => {
    expect(bondPrice({ couponPct: NaN, yieldPct: NaN, years: NaN })).toBe(100);
    expect(bondPrice({ couponPct: 500, yieldPct: 500, years: 500 })).toBeGreaterThan(0);
    expect(bondPrice({ couponPct: -3, yieldPct: -80, years: 0 })).toBeGreaterThan(0);
  });

  it('measures duration', () => {
    expect(macaulayDuration(base)).toBeGreaterThan(8);
    expect(modifiedDuration(base)).toBeCloseTo(8.5302, 3);
    expect(modifiedDuration({ ...base, years: 2 })).toBeLessThan(2);
  });

  it('shows the effect of a change of yield, exactly and with the duration', () => {
    const up = yieldShock(base, 1);
    expect(up.fromPrice).toBe(100);
    expect(up.changePct).toBeCloseTo(-8.11, 2);
    expect(up.durationEstimatePct).toBeCloseTo(-8.53, 2);
    expect(yieldShock(base, -1).changePct).toBeCloseTo(8.98, 2);
    expect(yieldShock(base, NaN).changePct).toBe(0);
  });

  it('finds the internal rate of return', () => {
    expect(irr([-100, 5, 5, 105])).toBeCloseTo(5, 2);
    expect(yieldFromPrice(100, 3, 10)).toBeCloseTo(3, 2);
    expect(yieldFromPrice(91.8891, 3, 10)).toBeCloseTo(4, 1);
    expect(yieldFromPrice(NaN, 3, 10)).toBeCloseTo(3, 2);
  });

  it('computes the return after Spanish tax when held to maturity', () => {
    const letra = bondNetReturn(97.0874, 0, 1, 10000);
    expect(letra.valid).toBe(true);
    expect(letra.grossYieldPct).toBeCloseTo(3, 1);
    expect(letra.grossProfit).toBeCloseTo(300, 0);
    expect(letra.tax).toBeCloseTo(57, 0);
    expect(letra.netYieldPct).toBeLessThan(letra.grossYieldPct);
    expect(letra.netProfit).toBeCloseTo(letra.grossProfit - letra.tax, 2);
    const bond = bondNetReturn(100, 3, 10, 10000, 6000);
    expect(bond.tax).toBeGreaterThan(bondNetReturn(100, 3, 10, 10000).tax);
  });

  it('does not tax a loss at maturity and rejects bad input', () => {
    const premium = bondNetReturn(110, 3, 5, 10000);
    expect(premium.valid).toBe(true);
    expect(premium.tax).toBeGreaterThan(0);
    expect(bondNetReturn(0, 3, 5, 100).valid).toBe(false);
    expect(bondNetReturn(NaN, 3, 5, 100).valid).toBe(false);
    expect(bondNetReturn(100, 3, 5, -1).valid).toBe(false);
    expect(bondNetReturn(100, 3, 5, NaN).valid).toBe(false);
  });

  it('builds the price curve of a bond', () => {
    const curve = priceCurve(3, 10, [2, 3, 4]);
    expect(curve.map((c) => c.yieldPct)).toEqual([2, 3, 4]);
    expect(curve[0].price).toBeGreaterThan(curve[1].price);
    expect(curve[1].price).toBe(100);
  });
});
