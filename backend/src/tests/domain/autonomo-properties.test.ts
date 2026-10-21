import { prepareDraft, type DraftInputs, type QuarterExtras } from '@domain/services/autonomo';
import type { VatMovement } from '@domain/services/autonomo-vat';
import type { VatRate } from '@domain/ports/repositories';

/**
 * Property checks of the modelo 130 and the modelo 303 over many invented years (fixed seeds, so
 * every run is the same). Each property is a formula of the instructions, not a figure:
 * - Modelo 130, instructions of the AEAT (checked 2026-10-21):
 *   https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-130-irpf______esionales-estimacion-directa-fraccionado_/instrucciones.html
 *   03 = 01 − 02; 04 = 20 % of 03 when positive, else 0; 05 = the positive 07 of the earlier quarters
 *   of the year; 07 = 04 − 05 − 06; 12 = 07 + 11, 0 when negative; 13 by the net income of last
 *   year (≤ 9,000: 100; ≤ 10,000: 75; ≤ 11,000: 50; ≤ 12,000: 25; art. 110.3.c RIRPF);
 *   14 = 12 − 13 (may be negative); 15 only when 14 > 0, the negative 19 not yet deducted, never
 *   above 14; 17 = 14 − 15 − 16; 19 = 17 − 18. A negative 19 only comes from the reduction of 13.
 * - Modelo 303, record design and instructions of 2026 (DR303): 27 = 152 + 03 + 06 + 09 + 11 + 13
 *   + 15 + 158 + 170 + 21 + 24 + 26; 45 = 29 + 31 + 33 + 35 + 37 + 39 + 41 + 42 + 43 + 44;
 *   46 = 27 − 45; 64 = 46 + 76; 66 = 64 × 100 %; 69 = 66 + 77 − 78; 71 = 69; 87 = 110 − 78; the
 *   VAT to offset of a quarter is the 87 plus the 72 of the one before (art. 99.Cinco LIVA).
 */

/** A small deterministic generator (LCG of Numerical Recipes): the same seed, the same year. */
function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const RATES: VatRate[] = [0, 4, 10, 21];
/** The same rules in 2023, 2024 and 2025 (the temporary 5 % and 2 % rates of 2023-2024 are not taken). */
const YEARS = [2023, 2024, 2025];
const zero: QuarterExtras = { withheld: 0, socialSecurity: 0, vatNotDeductible: 0 };

/** An invented year: sales and purchases at the four rates, withholdings and fees by quarter. */
function yearOf(seed: number, year = YEARS[seed % YEARS.length]) {
  const next = random(seed);
  const amount = (max: number) => Math.round(next() * max * 100);
  const movements: VatMovement[] = [];
  for (let month = 1; month <= 12; month++) {
    const date = `${year}-${String(month).padStart(2, '0')}-15`;
    const rate = (): VatRate => RATES[Math.floor(next() * RATES.length)];
    // Some months sell nothing and buy a lot, so quarters with losses and VAT to offset come up.
    if (next() > 0.25)
      movements.push({ date, type: 'INCOME', amountCents: amount(6000), vatRate: rate() });
    movements.push({ date, type: 'EXPENSE', amountCents: amount(4000), vatRate: rate() });
    if (next() > 0.8)
      movements.push({ date, type: 'EXPENSE', amountCents: amount(9000), vatRate: 21 });
  }
  const quarters = [0, 1, 2, 3].map(() => ({
    ...zero,
    withheld: next() > 0.5 ? Math.round(next() * 40000) / 100 : 0,
    socialSecurity: Math.round(next() * 90000) / 100,
  })) as DraftInputs['quarters'];
  const priors = [
    null,
    -2000,
    0,
    8999.99,
    9000,
    9000.01,
    10000,
    10500,
    11000.01,
    12000,
    12000.01,
    30000,
  ];
  const inputs: DraftInputs = {
    quarters,
    hardToJustify: next() > 0.5,
    priorYearNet: priors[Math.floor(next() * priors.length)],
    exempt130: false,
    vatToOffset: 0,
    vat: {
      offsetStart: next() > 0.6 ? Math.round(next() * 300000) / 100 : 0,
      refund: next() > 0.5,
    },
  };
  return { movements, inputs, year };
}

const at = (boxes: { box: string; amount: number }[], id: string): number =>
  boxes.find((b) => b.box === id)?.amount ?? 0;
const cents = (n: number) => Math.round(n * 100);
const isCents = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
const SEEDS = Array.from({ length: 150 }, (_, i) => 1000 + i * 7919);

/** Box 13 by the net income of last year (art. 110.3.c RIRPF; instructions of the 130, box 13). */
const reductionOf = (net: number | null) =>
  net === null
    ? 0
    : net <= 9000
      ? 100
      : net <= 10000
        ? 75
        : net <= 11000
          ? 50
          : net <= 12000
            ? 25
            : 0;

describe('Modelo 130: properties over 150 invented years (2023-2025)', () => {
  it('follows the formulas of every box, quarter by quarter, with the accumulated payments', () => {
    const seen = { loss: 0, negative19: 0, box15: 0, box05: 0 };
    for (const seed of SEEDS) {
      const { movements, inputs, year } = yearOf(seed);
      let paid = 0;
      let withheld = 0;
      let negatives = 0;
      for (const q of [1, 2, 3, 4] as const) {
        const b = prepareDraft(year, q, movements, inputs).irpf.boxes;
        const box = (id: string) => at(b, id);
        withheld = Math.round((withheld + inputs.quarters[q - 1].withheld) * 100) / 100;
        for (const x of b) expect(isCents(x.amount)).toBe(true);
        expect(cents(box('03'))).toBe(cents(box('01')) - cents(box('02')));
        expect(box('04')).toBe(Math.round(Math.max(0, box('03')) * 20) / 100);
        expect(box('05')).toBeCloseTo(paid, 2);
        expect(box('06')).toBeCloseTo(withheld, 2);
        expect(cents(box('07'))).toBe(cents(box('04')) - cents(box('05')) - cents(box('06')));
        expect(box('12')).toBe(Math.max(0, box('07')));
        expect(box('13')).toBe(reductionOf(inputs.priorYearNet));
        expect(cents(box('14'))).toBe(cents(box('12')) - cents(box('13')));
        const offset = box('14') > 0 ? Math.min(box('14'), negatives) : 0;
        expect(box('15')).toBeCloseTo(offset, 2);
        expect(cents(box('17'))).toBe(cents(box('14')) - cents(box('15')));
        expect(box('19')).toBe(box('17'));
        // A negative result only comes from the low-income reduction, and never beyond it.
        if (box('19') < 0) expect(-box('19')).toBeLessThanOrEqual(box('13'));
        seen.loss += box('03') < 0 ? 1 : 0;
        seen.negative19 += box('19') < 0 ? 1 : 0;
        seen.box15 += box('15') > 0 ? 1 : 0;
        seen.box05 += box('05') > 0 ? 1 : 0;
        paid += Math.max(0, box('07'));
        negatives = box('19') < 0 ? negatives - box('19') : negatives - offset;
      }
    }
    // The invented years reach every branch: losses, negative results, their offset and payments.
    for (const count of Object.values(seen)) expect(count).toBeGreaterThan(0);
  });

  it('applies the reduction of box 13 at the edges of each step', () => {
    const { movements, inputs } = yearOf(7, 2025);
    const box13 = (net: number | null) =>
      at(prepareDraft(2025, 1, movements, { ...inputs, priorYearNet: net }).irpf.boxes, '13');
    expect(
      [-500, 0, 9000, 9000.01, 10000, 10000.01, 11000, 11000.01, 12000, 12000.01, null].map(box13)
    ).toEqual([100, 100, 100, 75, 75, 50, 50, 25, 25, 0, 0]);
  });
});

describe('Modelo 303: properties over 150 invented years (2023-2025)', () => {
  const ACCRUED = ['152', '03', '06', '09', '11', '13', '15', '158', '170', '21', '24', '26'];
  const DEDUCTIBLE = ['29', '31', '33', '35', '37', '39', '41', '42', '43', '44'];

  it('adds up 27, 45, 46 and the result, and carries the VAT to offset from quarter to quarter', () => {
    const seen = { pay: 0, offset: 0, refund: 0, applied: 0 };
    for (const seed of SEEDS) {
      const { movements, inputs, year } = yearOf(seed);
      let pending = cents(inputs.vat?.offsetStart ?? 0);
      for (const q of [1, 2, 3, 4] as const) {
        const v = prepareDraft(year, q, movements, inputs).vat;
        const all = [...v.accrued, ...v.deductible, ...v.settlement];
        const c = (id: string) => cents(at(all, id));
        for (const x of all) expect(isCents(x.amount)).toBe(true);
        expect(c('27')).toBe(ACCRUED.reduce((s, id) => s + c(id), 0));
        expect(c('45')).toBe(DEDUCTIBLE.reduce((s, id) => s + c(id), 0));
        expect(c('46')).toBe(c('27') - c('45'));
        expect(c('64')).toBe(c('46') + c('76'));
        expect(c('66')).toBe(c('64'));
        expect(c('110')).toBe(pending);
        expect(c('78')).toBeLessThanOrEqual(c('110'));
        expect(c('87')).toBe(c('110') - c('78'));
        expect(c('69')).toBe(c('66') + c('77') - c('78'));
        expect(c('71')).toBe(c('69'));
        const refund = q === 4 && Boolean(inputs.vat?.refund);
        // Without a refund, the offset applied never goes beyond the positive result.
        if (!refund) expect(c('78')).toBeLessThanOrEqual(Math.max(0, c('66') + c('77')));
        expect(c('72')).toBe(c('71') < 0 && !refund ? -c('71') : 0);
        expect(c('73')).toBe(c('71') < 0 && refund ? -c('71') : 0);
        expect(v.amountDue).toBe(at(all, '71'));
        seen.pay += c('71') > 0 ? 1 : 0;
        seen.offset += c('72') > 0 ? 1 : 0;
        seen.refund += c('73') > 0 ? 1 : 0;
        seen.applied += c('78') > 0 ? 1 : 0;
        pending = c('87') + c('72');
      }
    }
    for (const count of Object.values(seen)) expect(count).toBeGreaterThan(0);
  });

  it('works out each rate at 4, 10 and 21 % on the base, to the cent', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const { movements, inputs, year } = yearOf(seed);
      const v = prepareDraft(year, 2, movements, inputs).vat;
      for (const [base, rate, fee] of [
        ['01', 4, '03'],
        ['04', 10, '06'],
        ['07', 21, '09'],
      ] as const) {
        // Each sale is split on its own (splitVat), so the sum of cuotas is within a cent per sale.
        const expected = (at(v.accrued, base) * rate) / 100;
        expect(Math.abs(at(v.accrued, fee) - expected)).toBeLessThanOrEqual(0.03);
      }
    }
  });
});
