import { CCAA_OPTIONS, loadCcaa } from '@modules/tools/data/renta';
import { rentaState } from '@modules/tools/data/renta/state';
import type { Deduction, TaxBracket } from '@modules/tools/domain/rentaData';

const GROUPS = ['family', 'housing', 'health', 'education', 'donations', 'other'];
const KINDS = ['fixed', 'percent', 'special'];

function expectValidScale(scale: TaxBracket[]) {
  expect(scale.length).toBeGreaterThan(2);
  expect(scale[0].from).toBe(0);
  scale.forEach((bracket, i) => {
    expect(bracket.rate).toBeGreaterThan(0);
    expect(bracket.rate).toBeLessThan(40);
    if (i > 0) {
      expect(bracket.from).toBeGreaterThan(scale[i - 1].from);
      expect(bracket.rate).toBeGreaterThanOrEqual(scale[i - 1].rate);
    }
  });
}

function expectValidDeduction(d: Deduction) {
  const where = d.id;
  expect({ where, ok: /^[a-z0-9-]+$/.test(d.id) }).toEqual({ where, ok: true });
  expect(GROUPS).toContain(d.group);
  expect(KINDS).toContain(d.kind);
  expect(d.title.trim().length).toBeGreaterThan(5);
  expect({ where, len: d.summary.length <= 220 }).toEqual({ where, len: true });
  expect({ where, len: d.requirements.length <= 280 }).toEqual({ where, len: true });
  expect(d.summary.trim().length).toBeGreaterThan(10);
  expect({ where, url: d.url.startsWith('https://') }).toEqual({ where, url: true });
  if (d.advance) {
    expect({ where, model: /^\d{3}$/.test(d.advance.model) }).toEqual({ where, model: true });
    expect({ where, url: d.advance.url.startsWith('https://') }).toEqual({ where, url: true });
  }
  if (d.kind === 'fixed') {
    expect({ where, has: d.amount !== undefined || (d.perChild?.length ?? 0) > 0 }).toEqual({
      where,
      has: true,
    });
  }
  if (d.kind === 'percent') {
    expect({ where, percent: typeof d.percent === 'number' && d.percent > 0 }).toEqual({
      where,
      percent: true,
    });
  }
  for (const value of [d.amount, d.percent, d.limit, d.baseLimit, ...(d.perChild ?? [])]) {
    if (value !== undefined) expect(value).toBeGreaterThanOrEqual(0);
  }
}

describe('income tax data of the State', () => {
  it('has the scales, minimums and deductions of the tax year', () => {
    expect(rentaState.year).toBe(2025);
    expectValidScale(rentaState.scale);
    expectValidScale(rentaState.defaultRegionalScale);
    expect(rentaState.minimums.personal).toBe(5550);
    expect(rentaState.minimums.descendants).toEqual([2400, 2700, 4000, 4500]);
    expect(rentaState.deductions.length).toBeGreaterThan(15);
    rentaState.deductions.forEach(expectValidDeduction);
    const ids = rentaState.deductions.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('estado-maternidad');
  });
});

describe('income tax data of the communities', () => {
  it('lists every community once, in alphabetical order, with the foral ones marked', () => {
    const names = CCAA_OPTIONS.map((o) => o.name);
    expect(new Set(CCAA_OPTIONS.map((o) => o.id)).size).toBe(CCAA_OPTIONS.length);
    expect(CCAA_OPTIONS).toHaveLength(19);
    expect(names.filter((n) => n.includes('foral'))).toHaveLength(2);
  });

  it.each(CCAA_OPTIONS.map((o) => [o.id, o.name]))(
    '%s (%s) is complete and consistent',
    async (id) => {
      const ccaa = await loadCcaa(id);
      expect(ccaa.id).toBe(id);
      expect(ccaa.name.length).toBeGreaterThan(3);
      expect(ccaa.source.startsWith('https://')).toBe(true);
      if (ccaa.regime === 'foral') {
        expect(ccaa.scale).toBeUndefined();
        expect(ccaa.deductions).toEqual([]);
        return;
      }
      if (ccaa.scale) {
        expectValidScale(ccaa.scale);
        expect(ccaa.scaleSource?.startsWith('https://')).toBe(true);
      } else {
        // Ceuta and Melilla use the State's default scale and have no deductions of their own.
        expect(['ceuta', 'melilla']).toContain(id);
        expect(ccaa.deductions).toEqual([]);
      }
      ccaa.deductions.forEach(expectValidDeduction);
      const ids = ccaa.deductions.map((d) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
      ids.forEach((deductionId) => expect(deductionId.startsWith(`${id}-`)).toBe(true));
      if (!['ceuta', 'melilla'].includes(id)) expect(ccaa.deductions.length).toBeGreaterThan(10);
    }
  );

  it('keeps ids unique across the State and every community', async () => {
    const all = await Promise.all(CCAA_OPTIONS.map((o) => loadCcaa(o.id)));
    const ids = [...rentaState.deductions, ...all.flatMap((c) => c.deductions)].map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('refuses an unknown community', async () => {
    await expect(loadCcaa('atlantida')).rejects.toThrow('Unknown community');
  });
});
