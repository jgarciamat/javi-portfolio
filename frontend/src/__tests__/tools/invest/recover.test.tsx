/**
 * «¿Puedo recuperar ese dinero?»: losses of earlier years, until which Renta they can be offset
 * (LIRPF art. 49) and until when their own Renta can be corrected (LGT arts. 66, 67 and 120.3).
 * Made-up figures.
 */
import { fireEvent, screen } from '@testing-library/react';
import {
  correctionOf,
  lossesToRecover,
  recoverOptions,
} from '@modules/tools/domain/invest/recover';
import { importedFrom } from '@modules/tools/domain/invest/sources';
import type { InvestOp } from '@modules/tools/domain/invest/types';
import { emptyForm, toInput, type RentaForm } from '@modules/tools/domain/rentaForm';
import { emptySavingsDetail } from '@modules/tools/domain/rentaGains';
import { computeRenta } from '@modules/tools/domain/rentaCalc';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { loadCcaa } from '@modules/tools/data/renta';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';
import { InvestCard } from '@modules/tools/ui/renta/InvestCard';
import { RecoverPanel } from '@modules/tools/ui/renta/invest/InvestSummary';
import { ResultCard } from '@modules/tools/ui/renta/ResultStep';
import { descendantBreakdown } from '@modules/tools/domain/rentaCalc';
import { renderWithProviders, tr } from '@test-utils/render';

jest.mock('@modules/tools/application/readPdf', () => ({ readPdf: jest.fn() }));

const YEAR = rentaState.year;
const k = 'tools.invest.recover';
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

let n = 0;
const op = (o: Partial<InvestOp> & Pick<InvestOp, 'kind' | 'date' | 'asset'>): InvestOp => ({
  id: `r:${++n}`,
  format: 'test',
  account: 'Bróker',
  at: `${o.date}T12:00:00`,
  assetClass: 'crypto',
  units: 1,
  amount: null,
  currency: 'EUR',
  eur: 0,
  fee: 0,
  feeCurrency: null,
  ...o,
});
// A gain of 1,000 this year and a loss of 400 two years before.
const ops = [
  op({ kind: 'buy', date: `${YEAR - 3}-01-01`, asset: 'BTC', eur: 1000 }),
  op({ kind: 'sell', date: `${YEAR - 2}-01-01`, asset: 'BTC', eur: 600 }),
  op({ kind: 'buy', date: `${YEAR - 1}-01-01`, asset: 'ETH', eur: 1000 }),
  op({ kind: 'sell', date: `${YEAR}-03-01`, asset: 'ETH', eur: 2000 }),
];
const imported = importedFrom(
  [{ file: 'x.csv', ops, certificate: [] }],
  { year: YEAR, professional: false },
  ['x.csv']
);

describe('the losses of earlier years to look at', () => {
  it('one per year, from the files and typed, the larger of both', () => {
    expect(
      lossesToRecover(
        [
          { year: YEAR - 2, result: -400 },
          { year: YEAR - 1, result: 50 },
          { year: YEAR, result: -10 },
        ],
        [
          { year: YEAR - 2, amount: 300 },
          { year: YEAR - 3, amount: 80 },
          { year: YEAR - 4, amount: 0 },
          { year: YEAR, amount: 5 },
        ],
        YEAR
      )
    ).toEqual([
      { year: YEAR - 3, amount: 80 },
      { year: YEAR - 2, amount: 400 },
    ]);
  });
});

describe('what they can still give', () => {
  it('offset until year + 4, correct until four years after the end of the filing period', async () => {
    const input = await inputOf(formOf({ savingsDetail: { ...emptySavingsDetail(), imported } }));
    const [old, recent] = recoverOptions(
      [
        { year: YEAR - 6, amount: 100 },
        { year: YEAR - 2, amount: 400 },
      ],
      input,
      `${YEAR + 1}-10-19`
    );
    expect(old).toMatchObject({
      offsetUntil: YEAR - 2,
      offsettable: false,
      now: null,
      correctable: false,
    });
    // The Renta of YEAR − 2 is filed until 30 June of YEAR − 1 (or the day of its campaign).
    expect(recent.correctUntil.slice(0, 4)).toBe(String(YEAR + 3));
    expect(recent).toMatchObject({ offsetUntil: YEAR + 2, offsettable: true, correctable: true });
    // With the loss among the earlier ones, the 1,000 of gain is 400 lower: the engine says how much.
    const withLoss = computeRenta({
      ...input,
      savingsDetail: {
        ...(input.savingsDetail ?? emptySavingsDetail()),
        pending: { gains: [{ year: YEAR - 2, amount: 400 }], capital: [], general: [] },
      },
    }).result;
    expect(recent.now).toBe(Math.round((computeRenta(input).result - withLoss) * 100) / 100);
    expect(recent.now).toBeGreaterThan(0);
    // 400 at the savings scale (9.5 % + 9.5 %).
    expect(recent.correctUpTo).toBe(76);
    expect(
      recoverOptions([{ year: YEAR - 2, amount: 400 }], null, `${YEAR}-01-01`)[0]
    ).toMatchObject({
      now: null,
      correctUpTo: 0,
      offsettable: true,
    });
  });
});

describe('how the Renta of that year is corrected', () => {
  it('a corrective return from the Renta 2024, a request for rectification up to the 2023', () => {
    // LGT art. 120.4 and RIRPF art. 67 bis from 2024; LGT art. 120.3 before (Manual Renta 2025).
    expect(correctionOf(2024)).toBe('rectificativa');
    expect(correctionOf(2025)).toBe('rectificativa');
    expect(correctionOf(2023)).toBe('rectificacion');
    expect(correctionOf(2022)).toBe('rectificacion');
    const [old, recent] = recoverOptions(
      [
        { year: 2023, amount: 100 },
        { year: 2024, amount: 100 },
      ],
      null,
      '2026-10-21'
    );
    expect([old.correctBy, recent.correctBy]).toEqual(['rectificacion', 'rectificativa']);
  });
});

describe('on the screen', () => {
  it('says what can still be done, and what cannot', () => {
    renderWithProviders(
      <RecoverPanel
        list={[
          {
            year: 2023,
            correctBy: 'rectificacion',
            loss: 400,
            offsetUntil: 2027,
            offsettable: true,
            correctUntil: '2028-07-01',
            correctable: true,
            now: 76,
            correctUpTo: 76,
          },
          {
            year: 2022,
            correctBy: 'rectificacion',
            loss: 50,
            offsetUntil: 2026,
            offsettable: true,
            correctUntil: '2027-06-30',
            correctable: true,
            now: 0,
            correctUpTo: 9.5,
          },
          {
            year: 2024,
            correctBy: 'rectificativa',
            loss: 10,
            offsetUntil: 2028,
            offsettable: true,
            correctUntil: '2029-06-30',
            correctable: true,
            now: null,
            correctUpTo: 0,
          },
          {
            year: 2019,
            correctBy: 'rectificacion',
            loss: 30,
            offsetUntil: 2023,
            offsettable: false,
            correctUntil: '2024-06-30',
            correctable: false,
            now: null,
            correctUpTo: 0,
          },
        ]}
      />,
      { authenticated: false }
    );
    expect(screen.getByText(tr(`${k}.title`))).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(tr(`${k}.now`, { amount: '76,00.€' }).slice(0, 20)))
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(tr(`${k}.nowNothing`).slice(0, 25)))).toBeInTheDocument();
    expect(screen.getByText(tr(`${k}.offsetGone`, { until: 2023 }))).toBeInTheDocument();
    expect(
      screen.getByText(tr(`${k}.gone`, { year: 2019, date: '30/06/2024' }))
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp('01/07/2028'))).toBeInTheDocument();
    // 2023 and 2022: the older system; 2024: the corrective return.
    expect(
      screen.getAllByText(new RegExp(tr(`${k}.correctOld`, { year: 2022 }).slice(0, 40)))
    ).toHaveLength(1);
    expect(
      screen.getByText(new RegExp(tr(`${k}.correct`, { year: 2024 }).slice(0, 60)))
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Solicitud de rectificación de autoliquidación/)).toHaveLength(2);
    expect(screen.getByText(tr(`${k}.nobody`))).toBeInTheDocument();
  });

  it('takes the losses to the earlier ones once the person says they were declared', async () => {
    const form = formOf({
      savingsDetail: {
        ...emptySavingsDetail(),
        imported,
        pending: {
          gains: [
            { year: YEAR - 2, amount: 1 },
            { year: YEAR - 3, amount: 2 },
          ],
          capital: [],
          general: [],
        },
      },
    });
    const input = await inputOf(form);
    const set = jest.fn();
    const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false);
    renderWithProviders(<InvestCard form={form} set={set} input={input} />, {
      authenticated: false,
    });
    const button = screen.getByRole('button', { name: tr('tools.invest.sum.toPending') });
    fireEvent.click(button);
    expect(set).not.toHaveBeenCalled();
    confirm.mockReturnValueOnce(true);
    fireEvent.click(button);
    expect(set.mock.calls[0][0].savingsDetail.pending.gains).toEqual([
      { year: YEAR - 3, amount: 2 },
      { year: YEAR - 2, amount: 400 },
    ]);
    confirm.mockRestore();
  });

  it('works from an empty planner too', () => {
    const set = jest.fn();
    jest.spyOn(window, 'confirm').mockReturnValueOnce(true);
    renderWithProviders(
      <InvestCard
        form={formOf({ savingsDetail: { ...emptySavingsDetail(), imported } })}
        set={set}
      />,
      {
        authenticated: false,
      }
    );
    fireEvent.click(screen.getByRole('button', { name: tr('tools.invest.sum.toPending') }));
    expect(set.mock.calls[0][0].savingsDetail.pending.gains).toEqual([
      { year: YEAR - 2, amount: 400 },
    ]);
  });
});

describe('with nothing in the planner yet', () => {
  it('works the effect out without earlier losses typed', async () => {
    const input = await inputOf(formOf());
    expect(recoverOptions([{ year: YEAR - 1, amount: 10 }], input, `${YEAR}-01-01`)[0].now).toBe(0);
  });

  it('takes the losses found in a file just dropped to the planner', async () => {
    const { act } = await import('@testing-library/react');
    const { strToU8 } = await import('fflate');
    const csv = `Date(UTC),Pair,Side,Price,Executed,Amount,Fee
${YEAR - 2}-03-01 10:00:00,BTCEUR,BUY,30000,0.1BTC,3000EUR,0EUR
${YEAR - 2}-05-01 10:00:00,BTCEUR,SELL,20000,0.1BTC,2000EUR,0EUR`;
    const data = new Uint8Array(strToU8(csv)).buffer as ArrayBuffer;
    const file = Object.assign(new File([data], 'b.csv'), {
      arrayBuffer: async () => data,
      text: async () => csv,
    });
    const set = jest.fn();
    jest.spyOn(window, 'confirm').mockReturnValueOnce(true);
    renderWithProviders(<InvestCard form={formOf()} set={set} input={await inputOf(formOf())} />, {
      authenticated: false,
    });
    await act(async () => {
      fireEvent.change(screen.getByLabelText(tr('tools.invest.file')), {
        target: { files: [file] },
      });
    });
    fireEvent.click(screen.getByRole('button', { name: tr('tools.invest.sum.toPending') }));
    const last = set.mock.calls[set.mock.calls.length - 1][0];
    expect(last.savingsDetail.pending.gains).toEqual([{ year: YEAR - 2, amount: 1000 }]);
  });
});

describe('the result, as Renta WEB shows the pay', () => {
  it('starts with the gross pay, the total, the social security and the other expenses', async () => {
    const input = await inputOf(formOf());
    const result = computeRenta(input);
    const shown = { result, kids: descendantBreakdown(input.family, input.state.minimums) };
    const money = (x: number) => `${x}`;
    const { rerender } = renderWithProviders(
      <ResultCard shown={shown} money={money} input={input} />,
      {
        authenticated: false,
      }
    );
    expect(screen.getByText(tr('tools.renta.line.pay0003')).nextSibling).toHaveTextContent('30000');
    expect(screen.getByText(tr('tools.renta.line.pay0013')).nextSibling).toHaveTextContent('−1905');
    // A result saved before these lines existed, or with no pay: no lines.
    const old = { ...result } as Partial<typeof result>;
    delete old.workPay;
    rerender(<ResultCard shown={{ ...shown, result: old as typeof result }} money={money} />);
    expect(screen.queryByText(tr('tools.renta.line.pay0003'))).toBeNull();
    rerender(
      <ResultCard shown={{ ...shown, result: { ...result, workGross: 0 } }} money={money} />
    );
    expect(screen.queryByText(tr('tools.renta.line.pay0003'))).toBeNull();
  });
});
