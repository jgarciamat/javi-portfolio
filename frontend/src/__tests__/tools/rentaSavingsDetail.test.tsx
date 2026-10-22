import { useState } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { emptyForm, type RentaForm } from '@modules/tools/domain/rentaForm';
import type { SavingsDetail } from '@modules/tools/domain/rentaGains';
import { SavingsDetailSection } from '@modules/tools/ui/renta/SavingsDetail';
import { renderWithProviders, tr } from '@test-utils/render';

const k = 'tools.renta.gains';
let last: RentaForm;

function Harness({ detail }: { detail?: SavingsDetail }) {
  const [form, setForm] = useState<RentaForm>({ ...emptyForm(''), savingsDetail: detail });
  last = form;
  return <SavingsDetailSection form={form} set={(patch) => setForm((f) => ({ ...f, ...patch }))} />;
}

const money = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
    .format(n)
    .replace(/\s/g, ' ');
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const statusText = () => (screen.getByRole('status').textContent ?? '').replace(/\s/g, ' ');

describe('Renta: the savings in detail', () => {
  it('turns on and off, and takes the capital income with its expenses', () => {
    renderWithProviders(<Harness />);
    const toggle = screen.getByLabelText(tr(`${k}.on`));
    fireEvent.click(toggle);
    expect(last.savingsDetail).toBeDefined();
    type(screen.getByLabelText(tr(`${k}.capital.interest`)), '1000,50');
    type(screen.getByLabelText(tr(`${k}.capital.expenses`)), 'x');
    expect(last.savingsDetail?.capital).toMatchObject({ interest: 1000.5, expenses: 0 });
    expect(statusText()).toContain(money(1000.5));
    fireEvent.click(toggle);
    expect(last.savingsDetail).toBeUndefined();
  });

  it('matches the sales with the purchases and warns of what is missing', () => {
    renderWithProviders(<Harness detail={undefined} />);
    fireEvent.click(screen.getByLabelText(tr(`${k}.on`)));
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.addAsset`) }));
    const asset = screen.getByRole('group', { name: tr(`${k}.asset`, { n: 1 }) });
    const box = within(asset);
    type(box.getByLabelText(tr(`${k}.name`)), 'Acciones X');
    fireEvent.change(box.getByLabelText(tr(`${k}.kind`)), { target: { value: 'crypto' } });
    fireEvent.click(box.getByRole('button', { name: tr(`${k}.addBuy`) }));
    fireEvent.click(box.getByRole('button', { name: tr(`${k}.addSell`) }));
    const dates = box.getAllByLabelText(tr(`${k}.date`));
    const units = box.getAllByLabelText(tr(`${k}.units`));
    type(dates[0], '2024-01-10');
    type(units[0], '10');
    type(box.getByLabelText(tr(`${k}.cost`)), '1000');
    type(dates[1], '2025-03-01');
    type(units[1], '12');
    type(box.getByLabelText(tr(`${k}.proceeds`)), '1500');
    // 12 sold, 10 bought: the gain counts the 10 and the warning asks for the rest.
    expect(screen.getByText(tr(`${k}.unmatched`, { name: 'Acciones X' }))).toBeInTheDocument();
    expect(statusText()).toContain(money(500));
    expect(last.savingsDetail?.assets[0].kind).toBe('crypto');
    // Removing the purchase, the sale and the asset.
    fireEvent.click(box.getAllByRole('button', { name: tr(`${k}.remove`) })[0]);
    expect(last.savingsDetail?.assets[0].buys).toEqual([]);
    fireEvent.click(box.getAllByRole('button', { name: tr(`${k}.remove`) })[0]);
    expect(last.savingsDetail?.assets[0].sells).toEqual([]);
    fireEvent.click(box.getByRole('button', { name: tr(`${k}.removeAsset`) }));
    expect(last.savingsDetail?.assets).toEqual([]);
  });

  it('shows a deferred loss and a repurchase to check', () => {
    const detail: SavingsDetail = {
      capital: { interest: 0, dividends: 0, bills: 0, assets: 0, insurance: 0, expenses: 0 },
      assets: [
        {
          name: 'Cotizada',
          kind: 'listed',
          buys: [
            { date: '2025-01-10', units: 10, cost: 1000 },
            { date: '2025-03-01', units: 10, cost: 800 },
          ],
          sells: [{ date: '2025-02-15', units: 10, proceeds: 700 }],
        },
        {
          name: 'Moneda',
          kind: 'crypto',
          buys: [
            { date: '2025-01-10', units: 1, cost: 1000 },
            { date: '2025-02-20', units: 1, cost: 600 },
          ],
          sells: [{ date: '2025-02-15', units: 1, proceeds: 500 }],
        },
      ],
      properties: [],
      otherGains: [],
      generalGains: [],
      pending: { gains: [], capital: [], general: [] },
    };
    renderWithProviders(<Harness detail={detail} />);
    expect(screen.getByText(tr(`${k}.deferred`, { name: 'Cotizada' }))).toBeInTheDocument();
    // Editing one asset leaves the other as it was.
    const first = within(screen.getByRole('group', { name: tr(`${k}.asset`, { n: 1 }) }));
    type(first.getAllByLabelText(tr(`${k}.units`))[1], '11');
    expect(last.savingsDetail?.assets[1]).toEqual(detail.assets[1]);
    expect(screen.getByText(tr(`${k}.checkRepurchase`, { name: 'Moneda' }))).toBeInTheDocument();
    // The crypto loss of 500 € is left for the next four years.
    expect(
      screen.getByText(tr(`${k}.carried`, { amount: money(500) }).replace(/\s/g, ' '))
    ).toBeInTheDocument();
  });

  it('takes a property with its exemption, other gains and the earlier losses', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByLabelText(tr(`${k}.on`)));
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.addProperty`) }));
    const sale = within(screen.getByRole('group', { name: tr(`${k}.property`, { n: 1 }) }));
    type(sale.getByLabelText(tr(`${k}.propertyProceeds`)), '200000');
    type(sale.getByLabelText(tr(`${k}.propertyCost`)), '100000');
    type(sale.getByLabelText(tr(`${k}.amortization`)), '0');
    expect(sale.queryByLabelText(tr(`${k}.reinvested`))).toBeNull();
    fireEvent.change(sale.getByLabelText(tr(`${k}.exemption`)), {
      target: { value: 'reinvested' },
    });
    type(sale.getByLabelText(tr(`${k}.reinvested`)), '75000');
    type(sale.getByLabelText(tr(`${k}.pendingLoan`)), '50000');
    // Half of the 100,000 € gain is exempt.
    expect(statusText()).toContain(money(50000));
    // Put in a life annuity instead: 150,000 of the 200,000 €, after 140,000 € of earlier ones,
    // counts 100,000 € (240,000 in all): half of the gain.
    fireEvent.change(sale.getByLabelText(tr(`${k}.exemption`)), { target: { value: 'annuity' } });
    expect(sale.getByText(tr(`${k}.annuityHint`))).toBeInTheDocument();
    type(sale.getByLabelText(tr(`${k}.annuityReinvested`)), '150000');
    type(sale.getByLabelText(tr(`${k}.annuityPrior`)), '140000');
    expect(last.savingsDetail?.properties[0]).toMatchObject({
      exemption: 'annuity',
      reinvested: 150000,
      annuityPrior: 140000,
    });
    expect(statusText()).toContain(money(50000));
    fireEvent.change(sale.getByLabelText(tr(`${k}.exemption`)), {
      target: { value: 'reinvested' },
    });
    type(sale.getByLabelText(tr(`${k}.reinvested`)), '75000');
    type(screen.getByLabelText(tr(`${k}.other`)), '-1000');
    type(screen.getByLabelText(tr(`${k}.general`)), '300');
    expect(screen.getByText(tr(`${k}.generalLine`))).toBeInTheDocument();
    type(screen.getByLabelText(tr(`${k}.pending.gains`, { year: 2022 })), '2000');
    type(screen.getByLabelText(tr(`${k}.pending.gains`, { year: 2022 })), '2500');
    type(screen.getByLabelText(tr(`${k}.pending.capital`, { year: 2024 })), '100');
    expect(last.savingsDetail?.pending.gains).toEqual([{ year: 2022, amount: 2500 }]);
    // 50,000 − 1,000 = 49,000 of gains, − 2,500 of 2022, − 100 of negative capital of 2024 (25 %).
    expect(statusText()).toContain(money(46400));
    fireEvent.click(sale.getByRole('button', { name: tr(`${k}.removeProperty`) }));
    expect(last.savingsDetail?.properties).toEqual([]);
  });

  it('reduces a property and shares bought before 1995 by the abatement coefficients (DT 9.ª)', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByLabelText(tr(`${k}.on`)));
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.addProperty`) }));
    const sale = within(screen.getByRole('group', { name: tr(`${k}.property`, { n: 1 }) }));
    // Manual 2025, c11, caso práctico 2: 51,720 € of gain, 2,086.44 € of reduction.
    type(sale.getByLabelText(tr(`${k}.propertyProceeds`)), '148100');
    type(sale.getByLabelText(tr(`${k}.propertyCost`)), '98000');
    type(sale.getByLabelText(tr(`${k}.amortization`)), '1620');
    expect(sale.queryByText(tr(`${k}.abatementHint`))).toBeNull();
    type(sale.getByLabelText(tr(`${k}.acquired`)), '1994-12-20');
    type(sale.getByLabelText(tr(`${k}.sold`)), '2025-07-01');
    expect(sale.getByText(tr(`${k}.abatementHint`))).toBeInTheDocument();
    expect(statusText()).toContain(money(-2086.44));
    expect(statusText()).toContain(money(49633.56));
    // Listed shares of 1991 without their 2005 value: a warning; with it, the reduction.
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.addAsset`) }));
    const asset = within(screen.getByRole('group', { name: tr(`${k}.asset`, { n: 1 }) }));
    type(asset.getByLabelText(tr(`${k}.name`)), 'TASA');
    fireEvent.click(asset.getByRole('button', { name: tr(`${k}.addBuy`) }));
    fireEvent.click(asset.getByRole('button', { name: tr(`${k}.addSell`) }));
    const dates = asset.getAllByLabelText(tr(`${k}.date`));
    const units = asset.getAllByLabelText(tr(`${k}.units`));
    expect(asset.queryByLabelText(tr(`${k}.ip2005`))).toBeNull();
    type(dates[0], '1991-05-31');
    type(units[0], '300');
    type(asset.getByLabelText(tr(`${k}.cost`)), '57000');
    type(dates[1], '2025-10-30');
    type(units[1], '300');
    type(asset.getByLabelText(tr(`${k}.proceeds`)), '75000');
    expect(screen.getByText(tr(`${k}.needsIp2005`, { name: 'TASA' }))).toBeInTheDocument();
    type(asset.getByLabelText(tr(`${k}.ip2005`)), '66000');
    expect(screen.queryByText(tr(`${k}.needsIp2005`, { name: 'TASA' }))).toBeNull();
    // With 335,000 € used before, the flat (sold first) takes the 65,000 € left: 18,779.87 ×
    // 65,000 / 148,100 = 8,242.39, × 11.11 % = 915.73; nothing is left for the shares.
    type(screen.getByLabelText(tr(`${k}.abatementPrior`, { last: 2024 })), '335000');
    expect(statusText()).toContain(money(-915.73));
    expect(last.savingsDetail?.abatementPrior).toBe(335000);
    // Without the flat, the shares take them (Manual 2025, c11, ejemplo 2): 7,800 € of reduction.
    fireEvent.click(sale.getByRole('button', { name: tr(`${k}.removeProperty`) }));
    expect(statusText()).toContain(money(-7800));
    // Fund units also have their 2005 value; unlisted shares go by days and do not ask for it.
    fireEvent.change(asset.getByLabelText(tr(`${k}.kind`)), { target: { value: 'fund' } });
    expect(asset.getByLabelText(tr(`${k}.ip2005`))).toBeInTheDocument();
    fireEvent.change(asset.getByLabelText(tr(`${k}.kind`)), { target: { value: 'unlisted' } });
    expect(asset.queryByLabelText(tr(`${k}.ip2005`))).toBeNull();
  });
});
