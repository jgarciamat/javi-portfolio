import { fireEvent, screen, within } from '@testing-library/react';
import { illustrativePath } from '@modules/invest/domain/crypto';
import { BondCalc } from '@modules/invest/ui/calculators/BondCalc';
import { CompoundCalc } from '@modules/invest/ui/calculators/CompoundCalc';
import { CryptoCalc } from '@modules/invest/ui/calculators/CryptoCalc';
import { Field, num } from '@modules/invest/ui/calculators/Fields';
import { TaxCalc } from '@modules/invest/ui/calculators/TaxCalc';
import { renderWithI18n, tr } from '@test-utils/render';

const set = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const noNaN = (container: HTMLElement) =>
  expect(container.textContent).not.toMatch(/NaN|undefined|Infinity/);

describe('number parsing', () => {
  it('reads commas and dots and turns anything else into zero', () => {
    expect(num('12,5')).toBe(12.5);
    expect(num(' 7 ')).toBe(7);
    expect(num('')).toBe(0);
    expect(num('abc')).toBe(0);
  });

  it('shows a field with its label, suffix and hint', () => {
    renderWithI18n(
      <Field id="x" label="Importe" value="3" onChange={() => {}} suffix="€" hint="Ayuda" />
    );
    expect(screen.getByLabelText('Importe')).toHaveValue('3');
    expect(screen.getByLabelText('Importe')).toHaveAccessibleDescription('Ayuda');
    expect(screen.getByText('€')).toBeInTheDocument();
  });
});

describe('compound growth calculator', () => {
  const label = (k: string) => tr(`app.invest.calc.compound.${k}`);

  it('shows nominal and real value, fees, tax and a chart with three scenarios', () => {
    const { container } = renderWithI18n(<CompoundCalc />);
    expect(screen.getByText(label('final'))).toBeInTheDocument();
    expect(screen.getByText(label('real'))).toBeInTheDocument();
    expect(screen.getByRole('img', { name: new RegExp(label('chart')) })).toBeInTheDocument();
    expect(container.querySelectorAll('.inv-legend li')).toHaveLength(4);
    expect(screen.getByText(label('etfNote'))).toBeInTheDocument();
    noNaN(container);
  });

  it('recalculates when the inputs change and can leave the tax out', () => {
    const { container } = renderWithI18n(<CompoundCalc />);
    set(label('initial'), '0');
    set(label('years'), '30');
    set(label('ter'), '0,2');
    const final = () => container.querySelectorAll('.inv-stat')[0].textContent;
    expect(final()).toMatch(/224\.8\d\d|224\.9\d\d/);
    set(label('ter'), '1.5');
    expect(final()).toMatch(/175\.2\d\d/);
    const tax = () => container.querySelectorAll('.inv-stat')[4].textContent;
    expect(tax()).not.toMatch(/retirar0\s€/);
    fireEvent.click(screen.getByRole('checkbox', { name: label('withTax') }));
    expect(tax()).toMatch(/retirar0\s€/);
    noNaN(container);
  });

  it('asks for valid data instead of showing NaN', () => {
    const { container } = renderWithI18n(<CompoundCalc />);
    set(label('years'), 'abc');
    expect(screen.getByRole('alert')).toHaveTextContent(tr('app.invest.calc.invalid'));
    set(label('years'), '10');
    set(label('initial'), '');
    set(label('monthly'), '');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    set(label('monthly'), '100');
    expect(screen.queryByRole('alert')).toBeNull();
    set(label('return'), '-3');
    set(label('inflation'), 'x');
    noNaN(container);
  });
});

describe('crypto and leverage calculator', () => {
  const label = (k: string) => tr(`app.invest.calc.crypto.${k}`);
  const stat = (container: HTMLElement, name: string) =>
    Array.from(container.querySelectorAll('.inv-stat')).find((s) =>
      s.textContent?.includes(name)
    ) as HTMLElement;

  it('shows profit, return on margin, liquidation price and break-even for a long', () => {
    const { container } = renderWithI18n(<CryptoCalc />);
    expect(stat(container, label('pnl'))).toHaveTextContent(/486,75/);
    expect(stat(container, label('roi'))).toHaveTextContent(/48,7/);
    expect(stat(container, label('liqPrice'))).toHaveTextContent(/90,5/);
    expect(stat(container, label('breakEven'))).toHaveTextContent(/100,13/);
    expect(stat(container, label('notional'))).toHaveTextContent(/10\.000/);
    expect(screen.getByText(label('riskHigh'))).toBeInTheDocument();
    noNaN(container);
  });

  it('warns that the position is liquidated', () => {
    const { container } = renderWithI18n(<CryptoCalc />);
    set(label('exit'), '88');
    expect(screen.getByText(label('liquidated'))).toBeInTheDocument();
    expect(stat(container, label('roi'))).toHaveTextContent(/100/);
  });

  it('handles a short and a lower leverage with the soft warning', () => {
    const { container } = renderWithI18n(<CryptoCalc />);
    fireEvent.change(screen.getByLabelText(label('side')), { target: { value: 'short' } });
    set(label('leverageX'), '3');
    set(label('exit'), '90');
    expect(stat(container, label('pnl'))).toHaveTextContent(/\d/);
    expect(screen.getByText(label('risk'))).toBeInTheDocument();
    expect(screen.queryByText(label('riskHigh'))).toBeNull();
    expect(screen.queryByText(label('liquidated'))).toBeNull();
  });

  it('warns about a close liquidation even with moderate leverage', () => {
    renderWithI18n(<CryptoCalc />);
    set(label('leverageX'), '8');
    set(label('maintenance'), '6');
    expect(screen.getByText(label('riskHigh'))).toBeInTheDocument();
  });

  it('asks for valid data', () => {
    const { container } = renderWithI18n(<CryptoCalc />);
    set(label('margin'), '0');
    expect(screen.getByText(label('invalid').replace('{max}', '125'))).toBeInTheDocument();
    expect(screen.getByText(label('risk').length ? label('riskHigh') : '')).toBeInTheDocument();
    set(label('margin'), '500');
    set(label('leverageX'), '500');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    set(label('leverageX'), '5');
    noNaN(container);
  });

  it('simulates periodic purchases on a price path and compares with a lump sum', () => {
    const { container } = renderWithI18n(<CryptoCalc />);
    const path = screen.getByLabelText(label('dcaPath')) as HTMLTextAreaElement;
    expect(path.value).toBe(illustrativePath().join(', '));
    fireEvent.change(path, { target: { value: '100, 50, 100, 200' } });
    set(label('dcaAmount'), '100');
    expect(stat(container, label('dcaInvested'))).toHaveTextContent(/400/);
    expect(stat(container, label('dcaValue'))).toHaveTextContent(/900/);
    expect(stat(container, label('dcaLump'))).toHaveTextContent(/800/);
    expect(stat(container, label('dcaAvg'))).toHaveTextContent(/88,89/);
    fireEvent.click(screen.getByRole('button', { name: label('dcaExample') }));
    expect(path.value).toBe(illustrativePath().join(', '));
    noNaN(container);
  });

  it('draws a flat price path and a losing one without breaking', () => {
    const { container } = renderWithI18n(<CryptoCalc />);
    const path = screen.getByLabelText(label('dcaPath'));
    fireEvent.change(path, { target: { value: '10, 10, 10' } });
    noNaN(container);
    fireEvent.change(path, { target: { value: '100, 80, 50' } });
    expect(stat(container, label('dcaValue')).className).toContain('inv-stat--bad');
  });

  it('asks for at least two prices', () => {
    renderWithI18n(<CryptoCalc />);
    fireEvent.change(screen.getByLabelText(label('dcaPath')), { target: { value: '100' } });
    expect(screen.getByText(label('dcaInvalid'))).toBeInTheDocument();
  });
});

describe('bond calculator', () => {
  const label = (k: string) => tr(`app.invest.calc.bond.${k}`);
  const stat = (container: HTMLElement, name: string) =>
    Array.from(container.querySelectorAll('.inv-stat')).find((s) =>
      s.textContent?.includes(name)
    ) as HTMLElement;

  it('prices a bond, shows the effect of a yield change and the net return', () => {
    const { container } = renderWithI18n(<BondCalc />);
    expect(stat(container, label('price'))).toHaveTextContent(/91,89/);
    expect(stat(container, label('duration'))).toHaveTextContent(/8,\d+ años/);
    expect(stat(container, label('newPrice'))).toHaveTextContent(/-?\d/);
    expect(stat(container, label('netYield'))).toHaveTextContent(/%/);
    expect(stat(container, label('tax'))).toHaveTextContent(/€/);
    noNaN(container);
  });

  it('shows a rise in price when the yield falls', () => {
    const { container } = renderWithI18n(<BondCalc />);
    set(label('shock'), '-1');
    expect(stat(container, label('newPrice')).className).toContain('inv-stat--good');
    set(label('shock'), '1');
    expect(stat(container, label('newPrice')).className).toContain('inv-stat--bad');
  });

  it('uses a typed purchase price and other savings income', () => {
    const { container } = renderWithI18n(<BondCalc />);
    const tax = () => stat(container, label('tax')).textContent;
    const before = tax();
    set(label('other'), '60000');
    expect(tax()).not.toBe(before);
    set(label('buy'), '95,5');
    expect(stat(container, label('grossYield'))).toHaveTextContent(/%/);
  });

  it('asks for valid data', () => {
    const { container } = renderWithI18n(<BondCalc />);
    set(label('invested'), '0');
    expect(screen.getByRole('alert')).toHaveTextContent(tr('app.invest.calc.invalid'));
    set(label('years'), 'abc');
    noNaN(container);
  });
});

describe('tax calculator', () => {
  const label = (k: string) => tr(`app.invest.calc.tax.${k}`);
  const stat = (container: HTMLElement, name: string) =>
    Array.from(container.querySelectorAll('.inv-stat')).find((s) =>
      s.textContent?.includes(name)
    ) as HTMLElement;

  it('applies the savings scale of the app data to a gain', () => {
    const { container } = renderWithI18n(<TaxCalc />);
    expect(stat(container, label('tax'))).toHaveTextContent(/1\.980/);
    expect(stat(container, label('net'))).toHaveTextContent(/8\.020/);
    expect(stat(container, label('average'))).toHaveTextContent(/19,80/);
    expect(stat(container, label('marginal'))).toHaveTextContent(/21 %/);
    const scale = screen.getByRole('table', { name: label('scale') });
    expect(within(scale).getAllByRole('row')).toHaveLength(6);
    expect(within(scale).getByText(/Más de/)).toBeInTheDocument();
  });

  it('settles with what was already withheld', () => {
    const { container } = renderWithI18n(<TaxCalc />);
    expect(stat(container, label('toPay'))).toHaveTextContent(/1\.980/);
    set(label('withheld'), '1900');
    expect(stat(container, label('toPay'))).toHaveTextContent(/80/);
    set(label('withheld'), '3000');
    expect(stat(container, label('toGet'))).toHaveTextContent(/1\.020/);
    set(label('withheld'), '-5');
    expect(stat(container, label('toPay'))).toBeInTheDocument();
  });

  it('pays nothing on a loss', () => {
    const { container } = renderWithI18n(<TaxCalc />);
    set(label('gain'), '-500');
    expect(stat(container, label('tax'))).toHaveTextContent(/Impuesto0\s€/);
    expect(stat(container, label('marginal'))).toHaveTextContent('–');
    set(label('gain'), 'abc');
    noNaN(container);
  });

  it('takes other savings income into account', () => {
    const { container } = renderWithI18n(<TaxCalc />);
    set(label('other'), '6000');
    set(label('gain'), '1000');
    expect(stat(container, label('tax'))).toHaveTextContent(/210/);
  });
});
