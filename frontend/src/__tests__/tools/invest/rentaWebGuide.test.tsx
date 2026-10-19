/**
 * «Qué tienes que copiar en Renta WEB»: the block after importing (how many rows in each window,
 * the totals to see, the three steps, the way to the window and one row worked out), the grouping
 * of «otros elementos», and the PDF with its «Empieza aquí» page and coloured zones.
 */
import { act, fireEvent, screen } from '@testing-library/react';
import { buildLedger } from '@modules/tools/domain/invest/ledger';
import type { InvestOp } from '@modules/tools/domain/invest/types';
import { copyPlan, reportTables } from '@modules/tools/domain/invest/report';
import { rentaWebKit, WINDOWS } from '@modules/tools/domain/invest/rentaWeb';
import { reportPdfBytes } from '@modules/tools/application/reportPdf';
import { hasRentaWebCopy, RentaWebPanel } from '@modules/tools/ui/renta/invest/RentaWebPanel';
import { ResultAmount, resultLabel, resultTone } from '@modules/tools/ui/renta/shared';
import { renderWithProviders, tr } from '@test-utils/render';

const k = 'tools.invest.web';
let n = 0;
const op = (o: Partial<InvestOp> & Pick<InvestOp, 'kind' | 'date' | 'asset'>): InvestOp => ({
  id: `g:${++n}`,
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
const ledgerOf = (ops: InvestOp[]) => buildLedger(ops, { year: 2025, rates: {} });

/** A closed CFD position: opened on the 1st, closed on `day` of `month`, with its result. */
const cfd = (month: number, day: number, gain: number) =>
  op({
    kind: 'realized',
    date: `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    acquired: `2025-${String(month).padStart(2, '0')}-01`,
    asset: 'SOL/USDT',
    assetClass: 'derivative',
    amount: Math.max(0, gain),
    cost: Math.max(0, -gain),
  });

// Five positions: in January +3 and −1; in February +2, −4 and +1.
const positions = ledgerOf([
  cfd(1, 10, 3),
  cfd(1, 12, -1),
  cfd(2, 3, 2),
  cfd(2, 5, -4),
  cfd(2, 9, 1),
]);
const other = (grouping: 'position' | 'month' | 'sign') =>
  rentaWebKit(positions, { other: grouping }).windows[0];

beforeEach(() => localStorage.clear());

describe('«otros elementos»: one row per position, per month or per sign', () => {
  it('gives the same totals with fewer rows, dated from the first opening to the last closing', () => {
    expect(other('position').altas).toHaveLength(5);
    expect(
      other('month').altas.map((a) => [a.values.bought, a.values.sold, a.gain, a.loss])
    ).toEqual([
      ['01/01/2025', '10/01/2025', 3, 0],
      ['01/01/2025', '12/01/2025', 0, 1],
      ['01/02/2025', '09/02/2025', 3, 0],
      ['01/02/2025', '05/02/2025', 0, 4],
    ]);
    expect(other('sign').altas.map((a) => [a.values.bought, a.values.sold, a.sales])).toEqual([
      ['01/01/2025', '09/02/2025', 3],
      ['01/01/2025', '05/02/2025', 2],
    ]);
    for (const g of ['position', 'month', 'sign'] as const)
      expect(other(g).totals).toEqual({ gains: 6, losses: 5 });
    // Each position knows its alta, also in the detail of the file.
    expect(rentaWebKit(positions, { other: 'sign' }).altaOfDirect).toEqual([1, 2, 1, 2, 1]);
    const detail = reportTables(positions).find((t) => t.name === '7 Detalle por operación');
    expect(detail?.rows.slice(1).map((r) => r[4])).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('what there is to copy, in a few numbers', () => {
  it('counts the rows, the time and works out the first row field by field', () => {
    const plan = copyPlan(rentaWebKit(positions));
    expect(plan.rows).toBe(5);
    expect(plan.minutes).toBe(13);
    expect(plan.windows).toEqual([
      {
        section: 'other',
        title: WINDOWS.other.title,
        tab: '5 Otros elementos (1624)',
        rows: 5,
        gains: { box: '0386', amount: 6 },
        losses: { box: '0385', amount: 5 },
      },
    ]);
    expect(plan.example?.fields.map((f) => f.value)).toEqual([
      WINDOWS.other.typeValue,
      'Sí',
      '10/01/2025',
      '01/01/2025',
      '3,00',
      '0,00',
      '0,00',
      '0,00',
      '0,00',
    ]);
    // A fund without NIF: the field is left empty, and the example says so.
    const fund = ledgerOf([
      op({ kind: 'buy', date: '2024-01-01', asset: 'F1', assetClass: 'fund', eur: 10 }),
      op({ kind: 'sell', date: '2025-01-01', asset: 'F1', assetClass: 'fund', eur: 12 }),
    ]);
    expect(copyPlan(rentaWebKit(fund)).example?.fields[0].value).toBe('(vacío)');
    expect(copyPlan(rentaWebKit(ledgerOf([])))).toEqual({
      windows: [],
      rows: 0,
      minutes: 0,
      example: null,
    });
  });
});

describe('the file to copy: «Empieza aquí» and a section per window with its zones', () => {
  it('starts with how many rows, where, the totals, the three steps and one row worked out', () => {
    const [start, window] = reportTables(positions);
    expect(start).toMatchObject({ name: '0 Empieza aquí', kind: 'start' });
    expect(start.title).toBe('Empieza aquí: qué copiar en Renta WEB (Renta 2025)');
    expect(start.steps).toHaveLength(3);
    expect(start.steps?.[1]).toMatch(/columna amarilla «Copiar»/);
    expect(start.caption).toMatch(/la fila 1 de la sección «5 Otros elementos \(1624\)»/);
    expect(start.zones).toEqual(['plain', 'copy']);
    expect(start.rows[1]).toEqual(['Tipo de elemento patrimonial', WINDOWS.other.typeValue]);
    // The window: what to copy (yellow), what to check (grey) and «Hecho».
    expect(window.title).toBe(`Copia estas 5 filas en la ventana “${WINDOWS.other.title}”`);
    expect(window.intro?.[0]).toMatch(/^Dónde: Renta WEB > /);
    expect(window.window).toMatchObject({ rows: 5, gains: { box: '0386', amount: 6 } });
    expect(window.zones).toEqual([
      'plain',
      ...WINDOWS.other.fields.map(() => 'copy'),
      'check',
      'check',
      'check',
      'done',
    ]);
    expect(window.money).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  it('says «fila» for one, and with income alone lists the boxes to write', () => {
    const one = ledgerOf([
      op({ kind: 'buy', date: '2024-01-01', asset: 'BTC', eur: 100 }),
      op({ kind: 'sell', date: '2025-02-01', asset: 'BTC', eur: 150 }),
    ]);
    const [start, window] = reportTables(one);
    expect(start.kind).toBe('start');
    expect(window.title).toMatch(/^Copia esta fila en la ventana “/);
    const income = reportTables(
      ledgerOf([op({ kind: 'interest', date: '2025-01-01', asset: 'C', units: 0, eur: 5 })])
    )[0];
    expect(income.zones).toEqual(['plain', 'plain', 'copy']);
    expect(income.caption).toMatch(/cada uno en su casilla/);
    expect(income.rows[1]).toEqual(['0027', expect.stringContaining('Intereses'), 5]);
  });

  it('makes a PDF with each window on its own page, also with a very long text', async () => {
    const sheets = reportTables(positions);
    sheets[0] = { ...sheets[0], intro: Array.from({ length: 60 }, (_, i) => `Línea ${i}`) };
    const bytes = await reportPdfBytes(
      { title: 'Renta 2025', year: 2025, plan: copyPlan(rentaWebKit(positions)), sheets },
      { compress: false }
    );
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });
});

describe('the block in the app', () => {
  it('shows the rows and the totals, the big button first, the steps, the way and one row', async () => {
    renderWithProviders(<RentaWebPanel ledger={positions} />, { authenticated: false });
    expect(screen.getByRole('heading', { name: tr(`${k}.title`) })).toBeInTheDocument();
    expect(screen.getByText(tr(`${k}.lead`, { rows: 5, minutes: 13 }))).toBeInTheDocument();
    expect(
      screen.getByText(tr(`${k}.window`, { title: WINDOWS.other.title, rows: 5 }))
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        tr(`${k}.windowTotals`, {
          gainsBox: '0386',
          gains: '6,00 €',
          lossesBox: '0385',
          losses: '5,00 €',
        }).replace(/\s/g, ' '),
        { normalizer: (s) => s.replace(/\s/g, ' ') }
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: tr(`${k}.start`) })).toHaveClass('btn-primary');
    expect(screen.getByRole('button', { name: tr(`${k}.pdf`) })).toHaveClass('btn-primary');
    expect(screen.getByText(tr(`${k}.filesHint`))).toBeInTheDocument();
    expect(screen.getByText(tr(`${k}.step3`))).toBeInTheDocument();
    expect(screen.getByText(tr(`${k}.route.title`))).toBeInTheDocument();
    expect(screen.getByRole('table')).toHaveTextContent('Fecha de transmisión10/01/2025');
    expect(hasRentaWebCopy(null)).toBe(false);
  });

  it('groups «otros elementos» as the person picks, and remembers it', () => {
    renderWithProviders(<RentaWebPanel ledger={positions} />, { authenticated: false });
    const g = `${k}.group`;
    expect(screen.getByRole('radio', { name: tr(`${g}.position`, { rows: 5 }) })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: tr(`${g}.month`, { rows: 4 }) }));
    expect(screen.getByText(tr(`${k}.lead`, { rows: 4, minutes: 11 }))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: tr(`${g}.sign`, { rows: 2 }) }));
    expect(localStorage.getItem('renta.invest.otherGrouping')).toBe('"sign"');
    expect(
      screen.getByText(tr(`${g}.hint`, { gainsBox: '0386', lossesBox: '0385' }))
    ).toBeInTheDocument();
    // What is marked as copied goes with the grouping.
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.start`) }));
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.next`) }));
    expect(JSON.parse(localStorage.getItem('renta.invest.copied.2025.sign') as string)).toEqual([
      'other:1',
    ]);
  });

  it('at the end of the assistant: the numbers and the two buttons', async () => {
    const one = ledgerOf([
      op({ kind: 'buy', date: '2024-01-01', asset: 'BTC', eur: 100 }),
      op({ kind: 'sell', date: '2025-02-01', asset: 'BTC', eur: 150 }),
    ]);
    renderWithProviders(<RentaWebPanel ledger={one} compact />, { authenticated: false });
    expect(screen.getByText(tr(`${k}.leadOne`, { minutes: 7 }))).toBeInTheDocument();
    expect(
      screen.getByText(tr(`${k}.windowOne`, { title: WINDOWS.crypto.title }))
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: tr(`${k}.pdf`) })).toHaveClass('btn-primary');
    expect(screen.getByRole('button', { name: tr(`${k}.start`) })).toBeInTheDocument();
    expect(screen.queryByText(tr(`${k}.filesHint`))).toBeNull();
    expect(screen.queryByText(tr(`${k}.stepsTitle`))).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
    await act(async () => undefined);
  });

  it('with income alone, says there are only boxes', () => {
    renderWithProviders(
      <RentaWebPanel
        ledger={ledgerOf([
          op({ kind: 'interest', date: '2025-01-01', asset: 'C', units: 0, eur: 5 }),
        ])}
      />,
      { authenticated: false }
    );
    expect(screen.getByText(tr(`${k}.onlyBoxes`))).toBeInTheDocument();
  });
});

describe('the colour of the result', () => {
  it('red to pay, green to be refunded, neutral at zero, always with the words', () => {
    expect([resultTone(817.1), resultTone(-20), resultTone(0.001)]).toEqual([
      'pay',
      'refund',
      'zero',
    ]);
    expect([resultLabel(1), resultLabel(-1), resultLabel(0)]).toEqual([
      'tools.renta.toPay',
      'tools.renta.refund',
      'tools.renta.zeroResult',
    ]);
    renderWithProviders(<ResultAmount result={-817.1} money={(v) => `${v} €`} />, {
      authenticated: false,
    });
    expect(screen.getByText('817.1 €')).toHaveClass('renta-amount', 'renta-amount--refund');
  });
});
