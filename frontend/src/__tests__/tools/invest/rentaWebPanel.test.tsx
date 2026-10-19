import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { buildLedger } from '@modules/tools/domain/invest/ledger';
import type { InvestOp } from '@modules/tools/domain/invest/types';
import { forRentaWeb, RentaWebPanel } from '@modules/tools/ui/renta/invest/RentaWebPanel';
import { DeclarationTable } from '@modules/tools/ui/renta/invest/InvestTables';
import { declarationRows } from '@modules/tools/domain/invest/report';
import { renderWithProviders, tr } from '@test-utils/render';

const k = 'tools.invest.web';
let n = 0;
const op = (o: Partial<InvestOp> & Pick<InvestOp, 'kind' | 'date' | 'asset'>): InvestOp => ({
  id: `p:${++n}`,
  format: 'test',
  account: 'Fondos y valores (entidad española)',
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
const ledger = buildLedger(
  [
    op({ kind: 'buy', date: '2024-01-01', asset: 'BTC', units: 2, eur: 2000 }),
    op({ kind: 'sell', date: '2025-02-01', asset: 'BTC', eur: 1234.5 }),
    op({
      kind: 'buy',
      date: '2024-01-01',
      asset: 'ES0000000001',
      assetClass: 'fund',
      name: 'Fondo Ficticio',
      eur: 100,
    }),
    op({
      kind: 'sell',
      date: '2025-02-01',
      asset: 'ES0000000001',
      assetClass: 'fund',
      name: 'Fondo Ficticio',
      eur: 150,
    }),
    op({
      kind: 'buy',
      date: '2024-01-01',
      asset: 'US1',
      assetClass: 'shares',
      name: 'Ficticia Inc',
      eur: 100,
    }),
    op({
      kind: 'sell',
      date: '2025-02-01',
      asset: 'US1',
      assetClass: 'shares',
      name: 'Ficticia Inc',
      eur: 90,
    }),
  ],
  { year: 2025, rates: {} }
);

beforeEach(() => localStorage.clear());

describe('«Cópialo en Renta WEB»', () => {
  it('formats amounts as Renta WEB takes them', () => {
    expect(forRentaWeb(1234.5)).toBe('1234,50');
    expect(forRentaWeb(0)).toBe('0,00');
    expect(forRentaWeb('F - Moneda de curso legal')).toBe('F - Moneda de curso legal');
  });

  it('downloads the file and the checklist with their names', async () => {
    const create = jest.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: jest.fn() });
    const names: string[] = [];
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        names.push(this.download);
      });
    renderWithProviders(<RentaWebPanel ledger={ledger} />, { authenticated: false });
    expect(screen.getByText(tr(`${k}.warn.fiscalData`))).toBeInTheDocument();
    expect(screen.getByText(tr(`${k}.warn.carteraValores`))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Excel/ })).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: tr(`${k}.pdf`) }));
    });
    await waitFor(() => expect(names).toHaveLength(1));
    expect(names).toEqual(['Finanverso-Renta-2025-copiar-en-Renta-WEB.pdf']);
    click.mockRestore();
  });

  it('copies alta by alta, field by field, and remembers what is done', async () => {
    const writeText = jest.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderWithProviders(<RentaWebPanel ledger={ledger} />, { authenticated: false });
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.start`) }));
    // First the fund: how to open its window, with the help of the Tax Agency.
    expect(screen.getByText(new RegExp(tr(`${k}.maybeFiscal`).slice(0, 30)))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: tr(`${k}.help`) })).toBeInTheDocument();
    expect(screen.getByText(tr(`${k}.position`, { n: 1, total: 3, done: 0 }))).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: tr(`${k}.copyOf`, { label: 'Valor de transmisión (*)' }),
        })
      );
    });
    expect(writeText).toHaveBeenCalledWith('150,00');
    expect(
      screen.getByText(tr(`${k}.copied`, { label: 'Valor de transmisión (*)' }))
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.next`) }));
    // The shares: the issuer once, then its transaction.
    expect(screen.getByText('Entidad Emisora')).toBeInTheDocument();
    expect(screen.getByText('Transacción')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: tr(`${k}.copyOf`, { label: 'Entidad Emisora' }) })
      );
    });
    expect(writeText).toHaveBeenLastCalledWith('Ficticia Inc');
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.back`) }));
    expect(screen.getByText(new RegExp(tr(`${k}.doneMark`)))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.next`) }));
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.next`) }));
    // Crypto: no clipboard in this browser, the button does nothing wrong.
    Object.assign(navigator, { clipboard: undefined });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: tr(`${k}.copyOf`, { label: 'Gastos de la transmisión' }),
        })
      );
    });
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.next`) }));
    expect(screen.getByText(tr(`${k}.finished`))).toBeInTheDocument();
    expect(screen.getByRole('list', { name: tr(`${k}.totals`) })).toHaveTextContent('[1814]');
    expect(JSON.parse(localStorage.getItem('renta.invest.copied.2025') as string)).toEqual([
      'iic:1',
      'shares:1',
      'crypto:1',
    ]);
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.start`) }));
    expect(screen.queryByText(tr(`${k}.modeTitle`))).toBeNull();
  });

  it('says when sales were grouped and when the altas do not fit', () => {
    const ops = [
      op({ kind: 'buy', date: '2024-01-01', asset: 'ETH', units: 2, eur: 200 }),
      op({ kind: 'sell', date: '2025-01-01', asset: 'ETH', eur: 150 }),
      op({ kind: 'sell', date: '2025-01-02', asset: 'ETH', eur: 150 }),
      ...Array.from({ length: 61 }, (_, i) => [
        op({ kind: 'buy', date: '2024-01-01', asset: `F${i}`, assetClass: 'fund', eur: 10 }),
        op({ kind: 'sell', date: '2025-01-01', asset: `F${i}`, assetClass: 'fund', eur: 20 }),
      ]).flat(),
    ];
    const grouped = buildLedger(ops, { year: 2025, rates: {} });
    renderWithProviders(
      <>
        <RentaWebPanel ledger={grouped} />
        <DeclarationTable ledger={grouped} rows={declarationRows(grouped)} />
      </>,
      { authenticated: false }
    );
    expect(
      screen.getAllByText(new RegExp(tr('tools.invest.decl.sales', { count: 2 }))).length
    ).toBe(2);
    const section = (s: string) => tr(`tools.invest.section.${s}`);
    expect(
      screen.getByText(tr(`${k}.warn.grouped`, { sales: 2, altas: 1, section: section('crypto') }))
    ).toBeInTheDocument();
    expect(
      screen.getByText(tr(`${k}.warn.mergedSigns`, { section: section('iic'), limit: 60 }))
    ).toBeInTheDocument();
    expect(
      screen.getByText(tr(`${k}.warn.overLimit`, { section: section('iic'), limit: 60 }))
    ).toBeInTheDocument();
  });

  it('shows nothing without sales or income, and only the files with income alone', () => {
    const { container, rerender } = renderWithProviders(
      <RentaWebPanel ledger={buildLedger([], { year: 2025, rates: {} })} />,
      { authenticated: false }
    );
    expect(container).toBeEmptyDOMElement();
    rerender(
      <RentaWebPanel
        ledger={buildLedger(
          [op({ kind: 'interest', date: '2025-01-01', asset: 'C', units: 0, eur: 5 })],
          {
            year: 2025,
            rates: {},
          }
        )}
      />
    );
    expect(screen.getByRole('button', { name: tr(`${k}.pdf`) })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: tr(`${k}.start`) })).toBeNull();
  });
});
