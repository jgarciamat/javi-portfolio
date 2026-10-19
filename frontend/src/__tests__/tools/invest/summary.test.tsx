/**
 * The summary of an import and what it means for the Renta (the engine with and without it), with
 * made-up operations and figures worked out by hand.
 */
import { screen } from '@testing-library/react';
import { buildLedger } from '@modules/tools/domain/invest/ledger';
import { importedFrom } from '@modules/tools/domain/invest/sources';
import { importSummary, ledgerOf, rentaEffect } from '@modules/tools/domain/invest/summary';
import type { InvestOp } from '@modules/tools/domain/invest/types';
import { emptyForm, toInput, type RentaForm } from '@modules/tools/domain/rentaForm';
import {
  emptySavingsDetail,
  savingsOf,
  type ImportedSavings,
} from '@modules/tools/domain/rentaGains';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { loadCcaa } from '@modules/tools/data/renta';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';
import { InvestCard } from '@modules/tools/ui/renta/InvestCard';
import { InvestInResult, InvestSummary } from '@modules/tools/ui/renta/invest/InvestSummary';
import { renderWithProviders, tr } from '@test-utils/render';

jest.mock('@modules/tools/application/readPdf', () => ({ readPdf: jest.fn() }));

let n = 0;
const op = (o: Partial<InvestOp> & Pick<InvestOp, 'kind' | 'date' | 'asset'>): InvestOp => ({
  id: `m:${++n}`,
  format: 'test',
  account: 'Bróker',
  at: `${o.date}T12:00:00`,
  assetClass: 'crypto',
  units: 1,
  amount: null,
  currency: 'EUR',
  eur: null,
  fee: 0,
  feeCurrency: null,
  ...o,
});
const YEAR = rentaState.year;
const ops = [
  op({ kind: 'buy', date: `${YEAR - 1}-01-05`, asset: 'BTC', amount: 1000 }),
  op({ kind: 'sell', date: `${YEAR}-03-05`, asset: 'BTC', amount: 1500 }),
  op({ kind: 'buy', date: `${YEAR - 1}-01-05`, asset: 'US1', assetClass: 'shares', amount: 100 }),
  op({ kind: 'sell', date: `${YEAR}-03-05`, asset: 'US1', assetClass: 'shares', amount: 80 }),
  op({ kind: 'buy', date: `${YEAR - 1}-01-05`, asset: 'ES1', assetClass: 'fund', amount: 100 }),
  op({ kind: 'sell', date: `${YEAR}-03-05`, asset: 'ES1', assetClass: 'fund', amount: 130 }),
  op({
    kind: 'buy',
    date: `${YEAR - 1}-01-05`,
    asset: 'XAU',
    assetClass: 'commodity',
    amount: 100,
  }),
  op({ kind: 'sell', date: `${YEAR}-03-05`, asset: 'XAU', assetClass: 'commodity', amount: 110 }),
  op({
    kind: 'realized',
    date: `${YEAR}-04-05`,
    asset: 'CFD',
    assetClass: 'derivative',
    amount: 0,
    cost: 40,
  }),
  op({
    kind: 'realized',
    date: `${YEAR - 2}-04-05`,
    asset: 'CFD',
    assetClass: 'derivative',
    amount: 0,
    cost: 300,
  }),
  op({
    kind: 'realized',
    date: `${YEAR + 1}-04-05`,
    asset: 'CFD',
    assetClass: 'derivative',
    amount: 50,
    cost: 0,
  }),
  op({
    kind: 'dividend',
    date: `${YEAR}-05-05`,
    asset: 'US1',
    assetClass: 'shares',
    units: 0,
    amount: 25,
  }),
  op({
    kind: 'custody',
    date: `${YEAR}-06-05`,
    asset: 'US1',
    assetClass: 'shares',
    units: 0,
    amount: 5,
  }),
  op({ kind: 'reward', reward: 'airdrop', date: `${YEAR}-07-05`, asset: 'ABC', amount: 3 }),
];
const ledger = buildLedger(ops, { year: YEAR, rates: {} });
const imported = importedFrom(
  [{ file: 'f.csv', ops, certificate: [] }],
  { year: YEAR, professional: false },
  ['f.csv']
);

const formOf = (over: Partial<RentaForm> = {}): RentaForm => ({
  ...emptyForm('30000'),
  ccaaId: 'madrid',
  socialSecurity: '1905',
  withheld: '4500',
  ...over,
});
const inputOf = async (form: RentaForm) =>
  toInput(form, {
    state: rentaState,
    ccaa: await loadCcaa(form.ccaaId),
    extras: rentaWorkExtras,
    property: rentaProperty,
    workReduction: workReductionOf(rentaState),
  });

describe('the summary of an import', () => {
  it('this year by kind, and the other years apart', () => {
    const s = importSummary(ledger, YEAR);
    // Crypto 500, shares −20, funds 30, CFD −40, gold 10 + airdrop 3, income 25 − 5.
    expect(s.byType).toEqual({
      crypto: 500,
      sharesEtf: -20,
      funds: 30,
      derivatives: -40,
      other: 13,
      income: 20,
    });
    expect(s.total).toBe(503);
    expect(s.years).toEqual([
      { year: YEAR - 2, result: -300, current: false },
      { year: YEAR, result: 503, current: true },
      { year: YEAR + 1, result: 50, current: false },
    ]);
    // Nothing of this year: its line is there, at 0.
    expect(importSummary(buildLedger([], { year: YEAR, rates: {} }), YEAR).years).toEqual([
      { year: YEAR, result: 0, current: true },
    ]);
  });

  it('can be rebuilt from what is in the Renta, not from an old import', () => {
    expect(ledgerOf(imported)?.sales).toHaveLength(4);
    expect(ledgerOf({ ...imported, sources: undefined })).toBeNull();
  });
});

describe('what it means for the Renta', () => {
  it('a gain adds the savings tax and makes the return worse by that much', async () => {
    const input = await inputOf(formOf());
    const e = rentaEffect(input, imported);
    expect(e.savingsBase).toBe(
      savingsOf({ ...emptySavingsDetail(), imported }, YEAR).boxes['0460']
    );
    expect(e.tax).toBeGreaterThan(0);
    expect(e.result).toBeGreaterThan(0);
    expect(e.carry).toEqual([]);
    expect(e.pendingUsed).toBe(0);
  });

  it('a loss adds no tax and is left for the next four years; earlier losses are used', async () => {
    const loss: ImportedSavings = importedFrom(
      [{ file: 'l.csv', ops: [ops[2], ops[3]], certificate: [] }],
      { year: YEAR, professional: false },
      ['l.csv']
    );
    const input = await inputOf(
      formOf({ savingsDetail: { ...emptySavingsDetail(), imported: loss } })
    );
    const e = rentaEffect(input, loss);
    expect(e.tax).toBe(0);
    expect(e.carry).toEqual([{ year: YEAR, amount: 20, until: YEAR + 4 }]);
    const pending = await inputOf(
      formOf({
        savingsDetail: {
          ...emptySavingsDetail(),
          pending: { gains: [{ year: YEAR - 1, amount: 100 }], capital: [], general: [] },
        },
      })
    );
    expect(rentaEffect(pending, imported).pendingUsed).toBe(100);
  });
});

describe('the summary panel and the result', () => {
  const summary = importSummary(ledger, YEAR);
  const k = 'tools.invest.sum';

  it('shows the year, the kinds, the other years and what it means for the Renta', () => {
    const { rerender } = renderWithProviders(
      <InvestSummary
        summary={summary}
        year={YEAR}
        effect={{
          savingsBase: 503,
          tax: 95,
          result: 95,
          carry: [{ year: YEAR, amount: 7, until: YEAR + 4 }],
          pendingUsed: 12,
        }}
      />,
      { authenticated: false }
    );
    expect(screen.getByText(tr(`${k}.type.crypto`))).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(tr(`${k}.otherYear`))).length).toBe(2);
    expect(screen.getByText(tr(`${k}.worse`))).toBeInTheDocument();
    expect(screen.getByText(tr(`${k}.pendingUsed`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(String(YEAR + 4)))).toBeInTheDocument();
    expect(screen.getByText(/en tus archivos/)).toBeInTheDocument();
    expect(screen.getByText(tr(`${k}.whatTitle`))).toBeInTheDocument();
    rerender(
      <InvestSummary
        summary={{ ...summary, years: [{ year: YEAR, result: -10, current: true }] }}
        year={YEAR}
        effect={{ savingsBase: 0, tax: 0, result: -5, carry: [], pendingUsed: 0 }}
      />
    );
    expect(screen.getByText(tr(`${k}.better`))).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(tr(`${k}.loss`, { amount: '.*', until: YEAR + 4 }).slice(0, 25)))
    ).toBeInTheDocument();
    rerender(
      <InvestSummary
        summary={summary}
        year={YEAR}
        effect={{ savingsBase: 0, tax: 0, result: 0, carry: [], pendingUsed: 0 }}
      />
    );
    expect(screen.getByText(tr(`${k}.same`))).toBeInTheDocument();
    rerender(
      <InvestSummary
        summary={{
          ...summary,
          years: [
            { year: YEAR - 3, result: 40, current: false },
            { year: YEAR, result: 0, current: true },
            { year: YEAR + 1, result: -9, current: false },
          ],
        }}
        year={YEAR}
        effect={null}
      />
    );
    expect(screen.queryByText(/en tus archivos/)).toBeNull();
    rerender(<InvestSummary summary={summary} year={YEAR} effect={null} />);
    expect(screen.queryByText(tr(`${k}.inRenta`))).toBeNull();
  });

  it('in the result: the investments and the income, the loss of the year and earlier ones', () => {
    const lossy = savingsOf({ ...emptySavingsDetail(), otherGains: [-50] }, YEAR);
    const { rerender } = renderWithProviders(
      <InvestInResult breakdown={lossy} imported={imported} year={YEAR} />,
      { authenticated: false }
    );
    expect(screen.getByText(tr(`${k}.gains`))).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(tr(`${k}.loss`, { amount: '.*', until: YEAR + 4 }).slice(0, 25)))
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${YEAR - 2}: `))).toBeInTheDocument();
    rerender(<InvestInResult breakdown={savingsOf(emptySavingsDetail(), YEAR)} year={YEAR} />);
    expect(screen.queryByText(new RegExp(`${YEAR - 2}: `))).toBeNull();
    rerender(
      <InvestInResult
        breakdown={savingsOf(emptySavingsDetail(), YEAR)}
        imported={{ ...imported, sources: undefined }}
        year={YEAR}
      />
    );
    expect(screen.queryByText(new RegExp(`${YEAR - 2}: `))).toBeNull();
  });

  it('the card shows the summary of what is in the Renta, with its effect when it can', async () => {
    const form = formOf({ savingsDetail: { ...emptySavingsDetail(), imported } });
    const input = await inputOf(form);
    const { unmount } = renderWithProviders(
      <InvestCard form={form} set={jest.fn()} input={input} />,
      {
        authenticated: false,
      }
    );
    expect(screen.getByText(tr(`${k}.inRenta`))).toBeInTheDocument();
    unmount();
    renderWithProviders(<InvestCard form={form} set={jest.fn()} />, { authenticated: false });
    expect(screen.getByText(tr(`${k}.title`))).toBeInTheDocument();
    expect(screen.queryByText(tr(`${k}.inRenta`))).toBeNull();
  });
});
